import { blobToDataUrl } from '@/core/export/utils';
import { exportGuideAsVideo, type VideoChapter, type VideoOptions, videoChapters } from '@/core/export/video-export';
import type { Guide, Screenshot, Step } from '@/core/guides/types';

export interface VideoEmbedResult {
  html: string;
  blob: Blob;
  chapters: VideoChapter[];
}

const KIND_COLORS: Record<string, string> = {
  click: '#0057c8',
  type: '#38BDF8',
  key: '#818CF8',
  navigate: '#b3cef0',
  note: '#9CA3AF',
};

function formatClock(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function buildEmbedHtml(guideTitle: string, videoDataUrl: string, chapters: VideoChapter[]): string {
  const escapedTitle = guideTitle.replace(
    /[&<>"']/g,
    (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s] || s,
  );

  const chaptersJson = JSON.stringify(chapters);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapedTitle} — Interactive Video Guide</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #0B0A1F;
      color: #FFFFFF;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .player-container {
      width: 100%;
      max-width: 1100px;
      height: 580px;
      background: #0B0A1F;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }
    @media (max-width: 768px) {
      .player-container {
        flex-direction: column;
        height: auto;
        max-height: 90vh;
      }
    }
    .video-pane {
      position: relative;
      flex: 1;
      min-width: 0;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    video {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
    .controls-overlay {
      position: absolute;
      inset-inline: 0;
      bottom: 0;
      padding: 32px 14px 10px;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.88), transparent);
      display: flex;
      align-items: center;
      gap: 10px;
      opacity: 1;
      transition: opacity 0.2s ease;
    }
    .btn {
      background: none;
      border: none;
      color: #FFFFFF;
      cursor: pointer;
      padding: 6px 8px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 600;
      transition: background 0.15s;
    }
    .btn:hover { background: rgba(255, 255, 255, 0.15); }
    .btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .time-display {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.75);
      tabular-nums: true;
    }
    .spacer { flex: 1; }
    .sidebar {
      width: 280px;
      flex-shrink: 0;
      background: #110F2B;
      border-left: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    @media (max-width: 768px) {
      .sidebar {
        width: 100%;
        height: 240px;
        border-left: none;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }
    }
    .sidebar-header {
      padding: 12px 14px 8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: rgba(255, 255, 255, 0.45);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .chapter-list {
      flex: 1;
      overflow-y: auto;
      padding: 4px 0;
    }
    .chapter-btn {
      width: 100%;
      text-align: left;
      background: none;
      border: none;
      border-left: 3px solid transparent;
      padding: 9px 12px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      color: rgba(255, 255, 255, 0.8);
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }
    .chapter-btn:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    .chapter-btn.active {
      background: rgba(255, 255, 255, 0.1);
      border-left-color: #0057c8;
      color: #FFFFFF;
    }
    .kind-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      margin-top: 6px;
      flex-shrink: 0;
    }
    .chapter-title {
      flex: 1;
      font-size: 12px;
      line-height: 1.4;
      word-break: break-word;
    }
    .chapter-time {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
      font-size: 10px;
      color: rgba(255, 255, 255, 0.4);
      margin-top: 2px;
      flex-shrink: 0;
    }
  </style>
</head>
<body>
  <div class="player-container">
    <div class="video-pane">
      <video id="video" src="${videoDataUrl}" playsinline preload="auto"></video>
      <div class="controls-overlay">
        <button id="btnPlay" class="btn" title="Play/Pause">▶</button>
        <button id="btnPrev" class="btn" title="Previous step">⏮</button>
        <button id="btnNext" class="btn" title="Next step">⏭</button>
        <span id="timeDisplay" class="time-display">0:00 / 0:00</span>
        <span class="spacer"></span>
        <button id="btnRate" class="btn" title="Speed">1x</button>
        <button id="btnFull" class="btn" title="Fullscreen">⛶</button>
      </div>
    </div>
    <aside class="sidebar">
      <div class="sidebar-header">${chapters.length} ${chapters.length === 1 ? 'Step' : 'Steps'}</div>
      <div id="chapterList" class="chapter-list"></div>
    </aside>
  </div>

  <script>
    const chapters = ${chaptersJson};
    const colors = ${JSON.stringify(KIND_COLORS)};
    const video = document.getElementById('video');
    const btnPlay = document.getElementById('btnPlay');
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const timeDisplay = document.getElementById('timeDisplay');
    const btnRate = document.getElementById('btnRate');
    const btnFull = document.getElementById('btnFull');
    const chapterList = document.getElementById('chapterList');

    const rates = [1, 1.25, 1.5, 2];
    let currentRateIdx = 0;

    function formatClock(sec) {
      if (!Number.isFinite(sec)) return '0:00';
      const t = Math.max(0, Math.round(sec));
      const m = Math.floor(t / 60);
      const s = String(t % 60).padStart(2, '0');
      return m + ':' + s;
    }

    function activeIndex(time) {
      for (let i = chapters.length - 1; i >= 0; i--) {
        if (time >= chapters[i].start) return i;
      }
      return -1;
    }

    // Render chapters
    chapters.forEach((ch, idx) => {
      const btn = document.createElement('button');
      btn.className = 'chapter-btn';
      btn.type = 'button';
      btn.dataset.index = idx;
      const dotColor = colors[ch.kind] || '#0057c8';
      btn.innerHTML = \`
        <span class="kind-dot" style="background-color: \${dotColor}"></span>
        <span class="chapter-title">\${ch.title}</span>
        <span class="chapter-time">\${formatClock(ch.start)}</span>
      \`;
      btn.onclick = () => {
        video.currentTime = ch.start + 0.01;
        video.play();
      };
      chapterList.appendChild(btn);
    });

    function updateActiveChapter() {
      const idx = activeIndex(video.currentTime);
      const btns = chapterList.querySelectorAll('.chapter-btn');
      btns.forEach((b, i) => {
        if (i === idx) {
          b.classList.add('active');
          b.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else {
          b.classList.remove('active');
        }
      });
      btnPrev.disabled = idx <= 0;
      btnNext.disabled = idx < 0 || idx >= chapters.length - 1;
    }

    btnPlay.onclick = () => {
      if (video.paused) video.play();
      else video.pause();
    };

    video.onplay = () => { btnPlay.textContent = '⏸'; };
    video.onpause = () => { btnPlay.textContent = '▶'; };

    video.ontimeupdate = () => {
      timeDisplay.textContent = formatClock(video.currentTime) + ' / ' + formatClock(video.duration);
      updateActiveChapter();
    };

    video.onloadedmetadata = () => {
      timeDisplay.textContent = '0:00 / ' + formatClock(video.duration);
      updateActiveChapter();
    };

    btnPrev.onclick = () => {
      const idx = activeIndex(video.currentTime);
      if (idx > 0) {
        video.currentTime = chapters[idx - 1].start + 0.01;
      }
    };

    btnNext.onclick = () => {
      const idx = activeIndex(video.currentTime);
      if (idx >= 0 && idx < chapters.length - 1) {
        video.currentTime = chapters[idx + 1].start + 0.01;
      }
    };

    btnRate.onclick = () => {
      currentRateIdx = (currentRateIdx + 1) % rates.length;
      const rate = rates[currentRateIdx];
      video.playbackRate = rate;
      btnRate.textContent = rate + 'x';
    };

    btnFull.onclick = () => {
      const container = document.querySelector('.player-container');
      if (!document.fullscreenElement) {
        container.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    };
  </script>
</body>
</html>`;
}

export async function exportGuideAsVideoEmbed(
  guide: Guide,
  steps: Step[],
  screenshots: Map<string, Screenshot>,
  options?: VideoOptions,
  controls: { signal?: AbortSignal; onProgress?: (done: number, total: number) => void } = {},
): Promise<VideoEmbedResult> {
  const result = await exportGuideAsVideo(guide, steps, screenshots, options, controls);
  const dataUrl = await blobToDataUrl(result.blob);
  const html = buildEmbedHtml(guide.title, dataUrl, result.chapters);
  const blob = new Blob([html], { type: 'text/html' });

  return {
    html,
    blob,
    chapters: result.chapters,
  };
}
