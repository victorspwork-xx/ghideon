export const FOCUSABLE_SELECTOR =
  'a[href], button, input, select, textarea, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="checkbox"], [role="radio"], [tabindex], [contenteditable="true"]';

const MAX_ELEMENT_RATIO = 0.8;

function labelledControl(el: Element): HTMLElement | null {
  const label = el.closest('label');
  return label instanceof HTMLLabelElement && label.control instanceof HTMLElement ? label.control : null;
}

function shadowHost(el: Element): Element | null {
  const root = el.getRootNode();
  return root instanceof ShadowRoot && root.host instanceof Element ? root.host : null;
}

export function findFocusableAncestor(el: Element): HTMLElement {
  let scope: Element | null = el;
  while (scope) {
    let cursor: Element | null = scope;
    while (cursor) {
      const match: Element | null = cursor.closest(FOCUSABLE_SELECTOR);
      if (match instanceof HTMLElement) return match;
      if (match) {
        cursor = match.parentElement;
        continue;
      }
      break;
    }
    const control = labelledControl(scope);
    if (control) return control;
    scope = shadowHost(scope);
  }
  if (el instanceof HTMLElement) return el;
  let parent: Element | null = el.parentElement;
  while (parent && !(parent instanceof HTMLElement)) {
    parent = parent.parentElement;
  }
  return (parent as HTMLElement) ?? document.body;
}

export function isTextField(el: Element): boolean {
  if (el instanceof HTMLInputElement) {
    return [
      'text',
      'email',
      'password',
      'search',
      'tel',
      'url',
      'number',
      // Native picker types — treated as text fields so focusout finalizes the session
      // and prevents the "next click not registered" bug after a picker popup dismisses
      'date',
      'time',
      'datetime-local',
      'month',
      'week',
      'color',
      'range',
    ].includes(el.type);
  }
  return el instanceof HTMLTextAreaElement || (el instanceof HTMLElement && el.isContentEditable);
}

export function isNavigatingClick(el: HTMLElement): boolean {
  const anchor = el.closest('a[href]');
  if (!anchor) return false;
  const href = anchor.getAttribute('href');
  return !(!href || href === '#' || href.startsWith('javascript:'));
}

export function isTooLarge(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return rect.width / window.innerWidth > MAX_ELEMENT_RATIO || rect.height / window.innerHeight > MAX_ELEMENT_RATIO;
}

export function isMimikElement(el: Element): boolean {
  return !!el.closest('[data-mimik-ignore]');
}

export function isSensitiveField(el: Element | null): boolean {
  return el instanceof HTMLInputElement && el.type === 'password';
}

export function isRedactedField(el: Element | null): boolean {
  return el instanceof Element && !!el.closest('[data-mimik-blur]');
}

export function eventTarget(e: Event): Element | null {
  const inner = e.composedPath?.()[0];
  if (inner instanceof Element) return inner;
  return e.target instanceof Element ? e.target : null;
}

export function getFieldValue(el: HTMLElement): string {
  if (isSensitiveField(el)) return '';
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el.value;
  if (el.isContentEditable) return el.textContent?.trim() ?? '';
  return '';
}

function meaningfulLabel(text: string | null | undefined): string | null {
  const trimmed = text?.trim();
  if (!trimmed || !/[a-z0-9]/i.test(trimmed)) return null;
  return (
    trimmed
      .split('\n')
      .map((line) => line.trim())
      .find((line) => /[a-z0-9]/i.test(line)) ?? null
  );
}

function slottedLabel(el: Element): string | null {
  const host = shadowHost(el);
  if (!host) return null;
  return (
    meaningfulLabel(host.getAttribute('aria-label')) ??
    meaningfulLabel(host.getAttribute('label')) ??
    meaningfulLabel((host as HTMLElement).textContent)
  );
}

export function getFieldLabel(el: HTMLElement): string {
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  const placeholder = el.getAttribute('placeholder');
  if (placeholder) return placeholder;

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const labels = el.labels;
    if (labels && labels.length > 0) {
      const labelText = meaningfulLabel(labels[0].innerText);
      if (labelText) return labelText;
    }
  }

  const slotted = slottedLabel(el);
  if (slotted) return slotted;

  const id = el.getAttribute('id');
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label) {
      const labelText = meaningfulLabel((label as HTMLElement).innerText);
      if (labelText) return labelText;
    }
  }

  const parentLabel = el.closest('label');
  if (parentLabel) {
    const labelText = meaningfulLabel(parentLabel.innerText);
    if (labelText) return labelText;
  }

  const name = el.getAttribute('name');
  if (name && !/[-_]test|[-_]id|[-_]key/i.test(name)) return name;

  return 'text field';
}

const PICKER_TYPES = new Set(['date', 'time', 'datetime-local', 'month', 'week', 'color', 'range']);

export function isPicker(type: string): boolean {
  return PICKER_TYPES.has(type);
}

/** Return a human-readable display value for a field, converting ISO dates/times. */
export function formatFieldValue(el: HTMLElement, raw: string): string {
  if (!raw || !(el instanceof HTMLInputElement)) return raw;
  try {
    if (el.type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return new Date(`${raw}T00:00:00`).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    if (el.type === 'datetime-local' && raw.includes('T')) {
      return new Date(raw).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    if (el.type === 'month' && /^\d{4}-\d{2}$/.test(raw)) {
      return new Date(`${raw}-01T00:00:00`).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
      });
    }
  } catch {
    // Fall through to raw value on any parse error
  }
  return raw;
}
