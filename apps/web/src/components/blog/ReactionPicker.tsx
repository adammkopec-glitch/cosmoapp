import { useState, useRef, useEffect } from 'react';

const EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'] as const;

interface Props {
  commentId: string;
  reactions: { emoji: string; userId: string }[];
  currentUserId?: string;
  onReact: (commentId: string, emoji: string) => void;
}

export const ReactionPicker = ({ commentId, reactions, currentUserId, onReact }: Props) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const counts = EMOJIS.reduce((acc, e) => {
    acc[e] = reactions.filter((r) => r.emoji === e).length;
    return acc;
  }, {} as Record<string, number>);

  const myReaction = currentUserId
    ? reactions.find((r) => r.userId === currentUserId)?.emoji
    : undefined;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative inline-flex items-center gap-2" ref={ref}>
      {/* Reaction summary */}
      <div className="flex items-center gap-1 flex-wrap">
        {EMOJIS.filter((e) => counts[e] > 0).map((e) => (
          <button
            key={e}
            onClick={() => currentUserId && onReact(commentId, e)}
            className={`text-sm px-1.5 py-0.5 rounded-full border transition-colors ${
              myReaction === e
                ? 'bg-amber-100 border-amber-400'
                : 'bg-muted/40 border-border/30 hover:bg-muted/60'
            }`}
          >
            {e} {counts[e]}
          </button>
        ))}
      </div>

      {/* Add reaction button — only for logged-in users */}
      {currentUserId && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-full hover:bg-muted/40"
          title="Dodaj reakcję"
        >
          {reactions.length === 0 ? '😊 Reaguj' : '➕'}
        </button>
      )}

      {/* Picker popup */}
      {open && (
        <div className="absolute bottom-full left-0 mb-1 bg-white border border-border/50 rounded-2xl shadow-lg p-2 flex gap-1 z-10">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => { onReact(commentId, e); setOpen(false); }}
              className={`text-xl p-1.5 rounded-xl transition-all hover:scale-125 ${
                myReaction === e ? 'bg-amber-100' : 'hover:bg-muted/40'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
