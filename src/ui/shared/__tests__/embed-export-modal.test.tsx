// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Guide, Screenshot, Step } from '@/core/guides/types';
import EmbedExportModal from '@/ui/shared/EmbedExportModal';

const exportGuideAsHTML = vi.hoisted(() => vi.fn());
const downloadText = vi.hoisted(() => vi.fn());

vi.mock('@/core/export/html-export', () => ({
  exportGuideAsHTML,
}));

vi.mock('@/core/export/download', () => ({
  safeFilename: (name: string, ext: string) => `${name.toLowerCase().replace(/\s+/g, '-')}.${ext}`,
  downloadText,
}));

describe('EmbedExportModal', () => {
  const guide: Guide = {
    id: 'guide-1',
    title: 'How to Reset Password',
    createdAt: 0,
    updatedAt: 0,
    stepIds: [],
    starred: false,
    deletedAt: null,
  };

  const steps: Step[] = [
    {
      id: 'step-1',
      guideId: 'guide-1',
      index: 0,
      description: 'Click Reset',
      action: 'click',
      url: 'https://example.com',
      timestamp: 0,
    },
  ];

  const screenshots = new Map<string, Screenshot>();

  beforeEach(() => {
    vi.clearAllMocks();
    exportGuideAsHTML.mockResolvedValue('<html><body>Guide</body></html>');
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders iframe code snippet and instructions', () => {
    render(
      <EmbedExportModal open={true} onOpenChange={() => {}} guide={guide} steps={steps} screenshots={screenshots} />,
    );

    // Code snippet
    expect(screen.getAllByText(/<iframe/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/how-to-reset-password\.html/).length).toBeGreaterThan(0);

    // Instructions
    expect(screen.getByText(/Cum adaugi fișierul pe site/i)).toBeTruthy();
    expect(screen.getByText(/Unde configurezi calea fișierului/i)).toBeTruthy();
  });

  it('updates iframe code when file path input changes', () => {
    render(
      <EmbedExportModal open={true} onOpenChange={() => {}} guide={guide} steps={steps} screenshots={screenshots} />,
    );

    const input = screen.getByPlaceholderText(/\/guides\/how-to-reset-password\.html/i);
    fireEvent.change(input, { target: { value: 'https://cdn.example.com/assets/guide.html' } });

    expect(screen.getByText(/https:\/\/cdn\.example\.com\/assets\/guide\.html/)).toBeTruthy();
  });

  it('copies embed code to clipboard', async () => {
    render(
      <EmbedExportModal open={true} onOpenChange={() => {}} guide={guide} steps={steps} screenshots={screenshots} />,
    );

    const copyBtn = screen.getByRole('button', { name: /Copiază codul/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('<iframe'));
      expect(screen.getByText(/Cod copiat!/i)).toBeTruthy();
    });
  });

  it('downloads the standalone HTML file on demand', async () => {
    render(
      <EmbedExportModal open={true} onOpenChange={() => {}} guide={guide} steps={steps} screenshots={screenshots} />,
    );

    const downloadBtn = screen.getByRole('button', { name: /Descarcă fișierul HTML/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(exportGuideAsHTML).toHaveBeenCalledWith(guide, steps, screenshots, undefined);
      expect(downloadText).toHaveBeenCalledWith(
        '<html><body>Guide</body></html>',
        'how-to-reset-password.html',
        'text/html',
      );
    });
  });
});
