import { describe, expect, it } from 'vitest';
import { buildEmbedHtml } from '@/core/export/video-embed-export';
import type { VideoChapter } from '@/core/export/video-export';

describe('buildEmbedHtml', () => {
  const chapters: VideoChapter[] = [
    {
      stepId: 'step-1',
      title: 'Click on Billing tab',
      kind: 'click',
      start: 0,
      end: 5.23,
    },
    {
      stepId: 'step-2',
      title: 'Enter Card Number',
      kind: 'type',
      start: 4.9,
      end: 10.13,
    },
  ];

  it('generates a self-contained HTML page with title, video, and chapters', () => {
    const html = buildEmbedHtml('How to Update Payment Method', 'data:video/mp4;base64,AAAA', chapters);
    expect(html).toContain('How to Update Payment Method');
    expect(html).toContain('data:video/mp4;base64,AAAA');
    expect(html).toContain('Click on Billing tab');
    expect(html).toContain('Enter Card Number');
    expect(html).toContain('<video id="video"');
    expect(html).toContain('class="player-container"');
    expect(html).toContain('class="chapter-list"');
  });

  it('escapes HTML characters in title', () => {
    const html = buildEmbedHtml('Settings <Script> & "Billing"', 'data:video/mp4;base64,AAAA', []);
    expect(html).toContain('Settings &lt;Script&gt; &amp; &quot;Billing&quot;');
    expect(html).not.toContain('<Script>');
  });
});
