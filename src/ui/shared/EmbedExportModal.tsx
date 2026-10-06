import { Check, Copy, Download, FileCode, Info } from 'lucide-react';
import { useMemo, useState } from 'react';
import { i18n } from '#imports';
import { downloadText, safeFilename } from '@/core/export/download';
import { exportGuideAsHTML } from '@/core/export/html-export';
import type { ExportOptions } from '@/core/export/options';
import type { Guide, Screenshot, Step } from '@/core/guides/types';
import { Button } from '@/ui/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/ui/components/ui/dialog';
import { Input } from '@/ui/components/ui/input';

interface EmbedExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guide: Guide;
  steps: Step[];
  screenshots: Map<string, Screenshot>;
  options?: ExportOptions;
}

export default function EmbedExportModal({
  open,
  onOpenChange,
  guide,
  steps,
  screenshots,
  options,
}: EmbedExportModalProps) {
  const filename = useMemo(() => safeFilename(guide.title, 'html'), [guide.title]);
  const [filePath, setFilePath] = useState<string>(`/guides/${filename}`);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const cleanPath = filePath.trim() || filename;

  const embedCode = useMemo(() => {
    return `<iframe\n  src="${cleanPath}"\n  width="100%"\n  height="650"\n  style="border: 0; border-radius: 8px; max-width: 100%; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);"\n  allow="clipboard-write; fullscreen"\n  allowfullscreen\n  loading="lazy"\n  title="${guide.title.replace(/"/g, '&quot;')}"\n></iframe>`;
  }, [cleanPath, guide.title]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const html = await exportGuideAsHTML(guide, steps, screenshots, options);
      downloadText(html, filename, 'text/html');
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[94vw] max-w-[620px] p-0 gap-0 overflow-hidden bg-card border-border shadow-xl">
        <DialogHeader className="px-5 py-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <FileCode size={18} />
            </div>
            <div>
              <DialogTitle className="text-[15px] font-bold text-foreground">
                {i18n.t('exportMenu.embedVideo') || 'Embed Guide (iframe)'}
              </DialogTitle>
              <DialogDescription className="text-[12px] text-muted-foreground mt-0.5">
                Codul iframe pentru inserare și instrucțiuni de configurare a fișierului
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Section 1: Embed Code to Copy */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-semibold text-foreground flex items-center gap-1.5">
                <span>Codul de inserat (iframe)</span>
              </label>
              <Button
                size="sm"
                type="button"
                onClick={handleCopy}
                className={`h-7 px-3 text-[11px] font-medium transition-all ${
                  copied
                    ? 'bg-emerald-600 text-white hover:bg-emerald-600'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {copied ? <Check size={12} className="mr-1" /> : <Copy size={12} className="mr-1" />}
                {copied ? 'Cod copiat!' : 'Copiază codul'}
              </Button>
            </div>

            <div className="relative rounded-lg overflow-hidden border border-border bg-[#0B0A1F] text-slate-100 font-mono text-[11px] leading-relaxed p-3.5 shadow-inner">
              <pre className="overflow-x-auto whitespace-pre selection:bg-accent selection:text-white">
                <code>{embedCode}</code>
              </pre>
            </div>
          </div>

          {/* Section 2: Instructions on how to add file & where to add path */}
          <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-4">
            <div className="flex items-center gap-2 text-foreground font-semibold text-[13px]">
              <Info size={16} className="text-accent shrink-0" />
              <span>Instrucțiuni de configurare</span>
            </div>

            {/* Step 1: Add the file */}
            <div className="space-y-2">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div className="flex-1 space-y-1.5">
                  <div className="text-[12px] font-semibold text-foreground">Cum adaugi fișierul pe site</div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Ghidul este complet autonom într-un singur fișier HTML (imagini și pași incluși). Descarcă fișierul
                    și uploadează-l pe serverul tău web, în directorul public al site-ului (de ex.{' '}
                    <code className="text-[10px] bg-secondary px-1 py-0.5 rounded text-foreground font-mono">
                      public/guides/
                    </code>
                    ) sau pe un serviciu de găzduire statică / CDN.
                  </p>
                  <div>
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      disabled={downloading}
                      onClick={handleDownload}
                      className="h-7 text-[11px] font-medium border-border hover:border-accent hover:text-accent gap-1.5"
                    >
                      {downloaded ? (
                        <>
                          <Check size={12} className="text-emerald-500" />
                          <span>Descărcat ({filename})</span>
                        </>
                      ) : (
                        <>
                          <Download size={12} />
                          <span>Descarcă fișierul HTML ({filename})</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Where to add its path */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div className="flex-1 space-y-2">
                  <div className="text-[12px] font-semibold text-foreground">Unde configurezi calea fișierului</div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    În codul{' '}
                    <code className="text-[10px] bg-secondary px-1 py-0.5 rounded text-foreground font-mono">
                      &lt;iframe&gt;
                    </code>{' '}
                    de mai sus, atributul{' '}
                    <code className="text-[10px] bg-secondary px-1 py-0.5 rounded text-accent font-semibold font-mono">
                      src="..."
                    </code>{' '}
                    trebuie să indice calea sau linkul la care ai salvat fișierul. Poți schimba calea direct mai jos
                    pentru a actualiza codul automat:
                  </p>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Input
                        value={filePath}
                        onChange={(e) => setFilePath(e.target.value)}
                        placeholder={`/guides/${filename}`}
                        className="h-8 text-[12px] font-mono bg-card border-border"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="text-muted-foreground">Presetări rapide:</span>
                      <button
                        type="button"
                        onClick={() => setFilePath(`/guides/${filename}`)}
                        className="px-1.5 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-foreground font-mono border border-border/50 transition-colors"
                      >
                        /guides/{filename}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilePath(`./${filename}`)}
                        className="px-1.5 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-foreground font-mono border border-border/50 transition-colors"
                      >
                        ./{filename}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilePath(`https://yoursite.com/guides/${filename}`)}
                        className="px-1.5 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-foreground font-mono border border-border/50 transition-colors"
                      >
                        URL complet
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Paste where needed */}
            <div className="space-y-1.5 pt-2 border-t border-border/60">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div className="flex-1">
                  <div className="text-[12px] font-semibold text-foreground">Inserează pe site</div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                    Lipește fragmentul copiat în orice pagină HTML, bloc Custom HTML din WordPress, componentă React,
                    Webflow, Notion sau platformă de documentație.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
