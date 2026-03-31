import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ImagePlus, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  slug: string;
  parentId?: string;
  isAuthenticated: boolean;
  onSubmit: (data: { content: string; parentId?: string; image?: File }) => Promise<void>;
  onCancel?: () => void;
  autoFocus?: boolean;
}

export const CommentForm = ({
  slug: _slug,
  parentId,
  isAuthenticated,
  onSubmit,
  onCancel,
  autoFocus,
}: Props) => {
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-border/50 p-5 text-center bg-muted/20">
        <p className="text-sm text-muted-foreground mb-3">
          Aby dodać komentarz, musisz być zalogowany.
        </p>
        <div className="flex justify-center gap-3">
          <Link to="/auth/login">
            <Button size="sm">Zaloguj się</Button>
          </Link>
          <Link to="/auth/register">
            <Button size="sm" variant="outline">Zarejestruj się</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({ content: content.trim(), parentId, image: image ?? undefined });
      setContent('');
      setImage(null);
      onCancel?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        autoFocus={autoFocus}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={2000}
        placeholder={parentId ? 'Napisz odpowiedź...' : 'Dodaj komentarz...'}
        rows={3}
        className="w-full resize-none rounded-xl border border-border/50 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
      />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-muted-foreground hover:text-foreground transition p-1.5 rounded-lg hover:bg-muted/40"
            title="Dodaj zdjęcie"
          >
            <ImagePlus size={16} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setImage(e.target.files?.[0] ?? null)}
          />
          {image && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {image.name}
              <button type="button" onClick={() => setImage(null)}>
                <X size={12} />
              </button>
            </span>
          )}
          <span className="text-xs text-muted-foreground">{content.length}/2000</span>
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
              Anuluj
            </Button>
          )}
          <Button type="submit" size="sm" disabled={submitting || !content.trim()}>
            <Send size={14} className="mr-1.5" />
            {parentId ? 'Odpowiedz' : 'Opublikuj'}
          </Button>
        </div>
      </div>
    </form>
  );
};
