import PQueue from 'p-queue';
import { DEFAULT_TARGET_COLOR } from '@/core/screenshot/types';
import { localStorage } from '@/lib/browser-api';
import { HoverRing } from '@/lib/hover-ring';
import { logger } from '@/lib/logger';
import { sendMessage } from '@/lib/messaging';
import { extractDOMContext } from '../dom/context';
import { extractElementMeta, type FrozenRect, freezeRect } from '../dom/element-meta';
import {
  eventTarget,
  findFocusableAncestor,
  isMimikElement,
  isNavigatingClick,
  isSensitiveField,
  isTextField,
  isTooLarge,
} from '../dom/element-utils';
import { isReplayedClick, replayClick, replayInit, shouldInterceptClick } from './click-intercept';
import { InputSession } from './input-session';

const DEDUP_MS = 300;
const DRAG_MIN_PX = 30;
const INTERCEPT_DELAY_MS = 100;
const PAINT_FRAMES = 3;
const CAPTURE_BUDGET_MS = 2500;
const EMBED_TAGS = new Set(['IFRAME', 'EMBED', 'OBJECT']);
const EMBED_SELECTOR = 'iframe, embed, object';

function focusInEmbed(): boolean {
  const active = document.activeElement;
  return !!active && EMBED_TAGS.has(active.tagName);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    let remaining = PAINT_FRAMES;
    const tick = () => {
      if (--remaining <= 0) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

let lastClickTarget: Element | null = null;
let lastClickTime = 0;

export interface CaptureHandle {
  stop: () => void;
}

const PASSIVE_CAPTURE = { capture: true, passive: true } as const;
const ACTIVE_CAPTURE = { capture: true } as const;

class CaptureController {
  private input: InputSession;
  private queue = new PQueue({ concurrency: 1 });
  private listeners: [string, EventListener, AddEventListenerOptions][] = [];
  private dragStartX: number | null = null;
  private dragStartY: number | null = null;
  private dragStartElement: Element | null = null;
  private lastDownTarget: Element | null = null;
  private lastDownFocusable: HTMLElement | null = null;
  private lastDownRect: FrozenRect | null = null;
  private lastDownX: number = 0;
  private lastDownY: number = 0;
  private lastDownTime: number = 0;
  private ring = new HoverRing(DEFAULT_TARGET_COLOR);
  private hovered: HTMLElement | null = null;
  private busy = false;

  constructor(
    private guideId: string,
    isTopFrame: boolean,
  ) {
    this.input = new InputSession(guideId);
    this.listeners = [
      ['click', this.onClick.bind(this), ACTIVE_CAPTURE],
      ['auxclick', this.onAuxClick.bind(this), ACTIVE_CAPTURE],
      ['keydown', this.onKeydown.bind(this), ACTIVE_CAPTURE],
      ['input', this.onInput.bind(this), PASSIVE_CAPTURE],
      ['change', this.onChange.bind(this), PASSIVE_CAPTURE],
      ['focusout', this.onFocusOut.bind(this), PASSIVE_CAPTURE],
    ];
    if (isTopFrame) {
      this.listeners.push(
        ['copy', this.onClipboard.bind(this), PASSIVE_CAPTURE],
        ['paste', this.onClipboard.bind(this), PASSIVE_CAPTURE],
        ['cut', this.onClipboard.bind(this), PASSIVE_CAPTURE],
        ['pointerdown', this.onPointerDown.bind(this), PASSIVE_CAPTURE],
        ['pointerup', this.onPointerUp.bind(this), PASSIVE_CAPTURE],
        ['dragend', this.onDragEnd.bind(this), PASSIVE_CAPTURE],
        ['mouseover', this.onMouseOver.bind(this), PASSIVE_CAPTURE],
        ['mouseout', this.onMouseOut.bind(this), PASSIVE_CAPTURE],
      );
      localStorage
        .get(['targetColor'])
        .then(({ targetColor }) => {
          if (typeof targetColor === 'string' && targetColor) this.ring.setColor(targetColor);
        })
        .catch(() => {});
    }
    for (const [event, handler, opts] of this.listeners) {
      window.addEventListener(event, handler, opts);
    }
  }

  private capture(action: string, target: HTMLElement, point?: { x: number; y: number }, preFrozenRect?: FrozenRect) {
    const atEvent = preFrozenRect ?? freezeRect(target);
    return async () => {
      const elementMeta = extractElementMeta(target, atEvent);
      await sendMessage('captureStep', {
        guideId: this.guideId,
        action,
        elementMeta: point ? { ...elementMeta, clickPoint: point } : elementMeta,
        domContext: extractDOMContext(target, action),
      });
    };
  }

  private enqueue(task: () => Promise<unknown>) {
    this.busy = true;
    this.ring.hide();
    this.queue.add(async () => {
      await waitForPaint();
      await task();
    });
    this.queue.onIdle().then(() => {
      this.busy = false;
      if (this.hovered?.isConnected && !focusInEmbed()) this.ring.show(this.hovered);
    });
  }

  private hoverTarget(raw: EventTarget | null): HTMLElement | null {
    if (!(raw instanceof Element) || isMimikElement(raw)) return null;
    const target = findFocusableAncestor(raw);
    if (target === document.body || target === document.documentElement) return null;
    if (EMBED_TAGS.has(target.tagName) || isTooLarge(target)) return null;
    if (target.querySelector(EMBED_SELECTOR)) return null;
    return target;
  }

  private onMouseOver(e: Event) {
    const target = this.hoverTarget(eventTarget(e));
    if (target === this.hovered) return;
    this.hovered = target;
    if (this.busy) return;
    if (target && !focusInEmbed()) this.ring.show(target);
    else this.ring.hide();
  }

  private onMouseOut(e: Event) {
    const related = (e as MouseEvent).relatedTarget;
    if (related instanceof Element && this.hovered?.contains(related)) return;
    this.hovered = null;
    this.ring.hide();
  }

  private onClick(e: Event) {
    const me = e as MouseEvent;
    if (isReplayedClick(me) || me.shiftKey) return;

    const raw = eventTarget(me);
    let target: HTMLElement;
    let preFrozenRect: FrozenRect | undefined;

    const dx = Math.abs(me.clientX - this.lastDownX);
    const dy = Math.abs(me.clientY - this.lastDownY);
    const movedSlightly = dx < 10 && dy < 10;

    if (
      this.lastDownTarget &&
      this.lastDownFocusable &&
      raw !== this.lastDownTarget &&
      movedSlightly &&
      Date.now() - this.lastDownTime < 1000
    ) {
      target = this.lastDownFocusable;
      preFrozenRect = this.lastDownRect!;
    } else {
      if (!raw || !(raw instanceof Element)) return;
      target = findFocusableAncestor(raw);
    }

    if (isMimikElement(target)) return;

    const now = Date.now();
    if (target === lastClickTarget && now - lastClickTime < DEDUP_MS) return;
    lastClickTarget = target;
    lastClickTime = now;

    if (isTextField(target)) {
      const atEvent = preFrozenRect ?? freezeRect(target);
      this.enqueue(async () => {
        if (this.input.active && this.input.target !== target) await this.input.finalize();
        if (!this.input.active) await this.input.start(target, atEvent);
      });
      return;
    }

    if (isNavigatingClick(target)) {
      me.preventDefault();
      me.stopImmediatePropagation();
      this.enqueue(this.capture('click', target, { x: me.clientX, y: me.clientY }, preFrozenRect));
      const anchor = target.closest('a[href]') as HTMLAnchorElement;
      if (anchor) {
        const href = anchor.href;
        requestAnimationFrame(() =>
          setTimeout(() => {
            window.location.href = href;
          }, INTERCEPT_DELAY_MS),
        );
      }
      return;
    }

    const task = this.capture('click', target, { x: me.clientX, y: me.clientY }, preFrozenRect);

    if (!shouldInterceptClick(target, me)) {
      this.enqueue(task);
      return;
    }

    me.preventDefault();
    me.stopImmediatePropagation();
    const init = replayInit(me);
    this.enqueue(async () => {
      try {
        await Promise.race([task(), sleep(CAPTURE_BUDGET_MS)]);
      } catch (err) {
        logger.warn('Capture failed, replaying the click anyway', err);
      } finally {
        replayClick(target, init);
      }
    });
  }

  private onAuxClick(e: Event) {
    const raw = eventTarget(e);
    if (!raw || !(raw instanceof Element)) return;
    const target = findFocusableAncestor(raw);
    if (isMimikElement(target)) return;
    this.enqueue(this.capture('auxclick', target, { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY }));
  }

  private onKeydown(e: Event) {
    const ke = e as KeyboardEvent;
    const resolved = eventTarget(ke);
    const target = resolved instanceof HTMLElement ? resolved : document.activeElement;
    if (!target || !(target instanceof HTMLElement) || isMimikElement(target)) return;

    if (this.input.active && (ke.key === 'Enter' || ke.key === 'Escape')) {
      this.enqueue(() => this.input.finalize());
      return;
    }

    if (isSensitiveField(target) || isTextField(target)) return;
    this.enqueue(this.capture(`keydown:${ke.key}`, target));
  }

  private onInput(e: Event) {
    const target = eventTarget(e);
    if (!target || !(target instanceof HTMLElement)) return;
    if (
      !(
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable
      )
    )
      return;

    if (target instanceof HTMLSelectElement) {
      this.enqueue(this.capture('input', target));
      return;
    }

    if (target instanceof HTMLInputElement && (target.type === 'checkbox' || target.type === 'radio')) return;

    if (this.input.active && this.input.target !== target) {
      this.enqueue(() => this.input.finalize());
    }

    if (!this.input.active) {
      this.enqueue(() => this.input.start(target));
    } else {
      this.input.update(target);
    }
  }

  private onChange(e: Event) {
    const target = eventTarget(e);
    if (!target || !(target instanceof HTMLElement)) return;

    // HTMLSelectElement change is already handled by onInput; skip double-capture
    if (target instanceof HTMLSelectElement) return;

    // Only handle native picker inputs (date/time/color/range/etc.) that don't fire `input`
    if (
      !(target instanceof HTMLInputElement) ||
      !isTextField(target) ||
      ['text', 'email', 'password', 'search', 'tel', 'url', 'number'].includes(target.type)
    )
      return;

    // If no active session yet (user picked without focusing first, e.g. spin-button on date),
    // start one now so we get a step
    if (!this.input.active) {
      this.enqueue(() => this.input.start(target));
    } else {
      // Update the existing session with the newly-picked value
      this.input.update(target);
    }
  }

  private onFocusOut(e: Event) {
    if (!this.input.active) return;
    const related = (e as FocusEvent).relatedTarget;
    if (related instanceof Element && related === this.input.target) return;
    this.enqueue(() => this.input.finalize());
  }

  private onClipboard(e: Event) {
    const resolved = eventTarget(e);
    const target = resolved instanceof HTMLElement ? resolved : document.activeElement;
    if (!target || !(target instanceof HTMLElement) || isMimikElement(target)) return;
    this.enqueue(this.capture(e.type, target));
  }

  private onPointerDown(e: Event) {
    this.ring.hide();
    const pe = e as PointerEvent;
    this.dragStartX = pe.pageX;
    this.dragStartY = pe.pageY;
    const raw = eventTarget(pe);
    this.dragStartElement = raw;

    this.lastDownTarget = raw;
    this.lastDownX = pe.clientX;
    this.lastDownY = pe.clientY;
    if (raw instanceof Element) {
      const focusable = findFocusableAncestor(raw);
      this.lastDownFocusable = focusable;
      this.lastDownRect = freezeRect(focusable);
    }
    this.lastDownTime = Date.now();
  }

  private onPointerUp(e: Event) {
    const pe = e as PointerEvent;
    if (this.dragStartX == null || this.dragStartY == null || !this.dragStartElement) {
      this.dragStartX = this.dragStartY = null;
      this.dragStartElement = null;
      return;
    }

    const dx = Math.abs(pe.pageX - this.dragStartX);
    const dy = Math.abs(pe.pageY - this.dragStartY);

    if (dx >= DRAG_MIN_PX || dy >= DRAG_MIN_PX) {
      const target = findFocusableAncestor(this.dragStartElement);
      if (!isMimikElement(target)) this.enqueue(this.capture('drag', target));
    }

    this.dragStartX = this.dragStartY = null;
    this.dragStartElement = null;
  }

  private onDragEnd(e: Event) {
    const target = eventTarget(e);
    if (!target || isMimikElement(target)) return;
    this.enqueue(this.capture('drag', findFocusableAncestor(target)));
  }

  stop() {
    for (const [event, handler, opts] of this.listeners) {
      window.removeEventListener(event, handler, opts);
    }
    this.hovered = null;
    this.ring.dispose();
    this.queue.add(() => this.input.finalize());
  }
}

export function startCapture(guideId: string, isTopFrame = true): CaptureHandle {
  const controller = new CaptureController(guideId, isTopFrame);
  return {
    stop: () => controller.stop(),
  };
}
