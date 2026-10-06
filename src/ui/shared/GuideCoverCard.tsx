import { Calendar, User } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '#imports';
import { updateGuideAuthor, updateGuideDescription, updateGuideTitle } from '@/core/guides/service';
import type { Guide } from '@/core/guides/types';

interface GuideCoverCardProps {
  guide: Guide;
  /** When true the user can edit title, description and author inline */
  editable?: boolean;
  /** Called after any field is persisted so the parent can refresh */
  onUpdated?: (patch: Partial<Guide>) => void;
}

function formatCoverDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function GuideCoverCard({ guide, editable = false, onUpdated }: GuideCoverCardProps) {
  const [title, setTitle] = useState(guide.title);
  const [description, setDescription] = useState(guide.description ?? '');
  const [author, setAuthor] = useState(guide.author ?? '');

  const prevGuideTitleRef = useRef(guide.title);
  if (guide.title !== prevGuideTitleRef.current) {
    prevGuideTitleRef.current = guide.title;
    setTitle(guide.title);
  }

  const handleTitleBlur = useCallback(async () => {
    const trimmed = title.trim() || i18n.t('fullview.untitledGuide');
    if (trimmed === guide.title) return;
    await updateGuideTitle(guide.id, trimmed);
    onUpdated?.({ title: trimmed });
  }, [guide.id, guide.title, title, onUpdated]);

  const handleDescriptionBlur = useCallback(async () => {
    if (description === (guide.description ?? '')) return;
    await updateGuideDescription(guide.id, description);
    onUpdated?.({ description });
  }, [guide.id, guide.description, description, onUpdated]);

  const handleAuthorBlur = useCallback(async () => {
    if (author === (guide.author ?? '')) return;
    await updateGuideAuthor(guide.id, author);
    onUpdated?.({ author });
  }, [guide.id, guide.author, author, onUpdated]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '0';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [title]);

  return (
    <div className="rounded-xl bg-primary overflow-hidden mb-4 shadow-sm relative text-primary-foreground border-border border">
      <div className="px-6 pt-6 pb-6 flex flex-col gap-4">
        {/* Top Label matching video (HOW-TO GUIDE) */}
        <div className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
          {i18n.t('export.guideLabel') || 'HOW-TO GUIDE'}
        </div>

        {/* Title */}
        {editable ? (
          <textarea
            ref={textareaRef}
            rows={1}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
            onBlur={handleTitleBlur}
            placeholder={i18n.t('editor.coverTitlePlaceholder')}
            className="resize-none overflow-hidden bg-transparent text-[32px] font-bold leading-snug text-primary-foreground placeholder:text-muted-foreground/50 border-b-2 border-transparent hover:border-accent/50 focus:outline-none focus:border-accent w-full p-0"
          />
        ) : (
          <h2 className="text-[32px] font-bold leading-snug text-primary-foreground break-words">{title}</h2>
        )}

        <div className="w-full h-[2px] bg-accent/60 rounded-full my-2" />

        {/* Description */}
        {editable ? (
          <textarea
            rows={2}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              const el = e.target;
              el.style.height = '0';
              el.style.height = `${el.scrollHeight}px`;
            }}
            onBlur={handleDescriptionBlur}
            placeholder={i18n.t('editor.coverDescPlaceholder')}
            className="resize-none overflow-hidden bg-transparent text-[13px] leading-relaxed text-muted-foreground placeholder:text-muted-foreground/40 border-b border-transparent hover:border-accent/50 focus:outline-none focus:border-accent w-full p-0"
          />
        ) : description ? (
          <p className="text-[13px] leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">
            {description}
          </p>
        ) : null}

        {/* Meta row */}
        <div className="flex items-center gap-8 mt-2 flex-wrap">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">
              {i18n.t('export.created') || 'Created'}
            </span>
            <span className="text-[12px] font-bold text-primary-foreground">{formatCoverDate(guide.createdAt)}</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">
              {i18n.t('export.author') || 'Author'}
            </span>
            {editable ? (
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                onBlur={handleAuthorBlur}
                placeholder={i18n.t('editor.coverAuthorPlaceholder')}
                className="bg-transparent text-[12px] font-bold text-primary-foreground placeholder:text-muted-foreground/40 border-b border-transparent hover:border-accent/50 focus:outline-none focus:border-accent p-0 min-w-0 max-w-[140px]"
              />
            ) : (
              <span className="text-[12px] font-bold text-primary-foreground truncate">
                {author || i18n.t('editor.coverAuthorPlaceholder')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
