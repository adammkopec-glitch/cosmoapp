import { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Trash2, EyeOff, Eye, AlertTriangle } from 'lucide-react';
import { ReactionPicker } from './ReactionPicker';
import { CommentForm } from './CommentForm';

export interface CommentData {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  content: string | null;
  imagePath: string | null;
  isHidden: boolean;
  isSpam: boolean;
  createdAt: string;
  author: { name: string; avatarPath: string | null };
  reactions: { emoji: string; userId: string }[];
  children?: CommentData[];
}

interface Props {
  comment: CommentData;
  slug: string;
  currentUserId?: string;
  isAdmin: boolean;
  depth?: number;
  isNew?: boolean;
  newCommentId?: string;
  onDelete: (id: string) => void;
  onModerate: (id: string, data: { isHidden?: boolean; isSpam?: boolean }) => void;
  onReact: (id: string, emoji: string) => void;
  onReply: (data: { content: string; parentId?: string; image?: File }) => Promise<void>;
}

export const CommentItem = ({
  comment,
  slug,
  currentUserId,
  isAdmin,
  depth = 0,
  isNew = false,
  newCommentId,
  onDelete,
  onModerate,
  onReact,
  onReply,
}: Props) => {
  const [replying, setReplying] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isNew && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isNew]);
  const indentClass = depth > 0 ? 'ml-6 md:ml-10 pl-4 border-l border-border/30' : '';

  return (
    <div className={`${indentClass} ${isNew ? 'comment-new' : ''}`} ref={itemRef}>
      <div className="py-4">
        {comment.isHidden && !isAdmin ? (
          <p className="text-sm text-muted-foreground italic">
            Komentarz ukryty przez administratora.
          </p>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
              {comment.author.avatarPath ? (
                <img
                  src={comment.author.avatarPath}
                  alt={comment.author.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {comment.author.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <span className="text-sm font-semibold">{comment.author.name}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: pl })}
                </span>
              </div>

              {/* Controls */}
              <div className="ml-auto flex items-center gap-1">
                {isAdmin && (
                  <>
                    <button
                      onClick={() => onModerate(comment.id, { isHidden: !comment.isHidden })}
                      className="p-1 text-muted-foreground hover:text-foreground transition"
                      title={comment.isHidden ? 'Pokaż' : 'Ukryj'}
                    >
                      {comment.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button
                      onClick={() => onModerate(comment.id, { isSpam: !comment.isSpam })}
                      className="p-1 text-muted-foreground hover:text-amber-600 transition"
                      title={comment.isSpam ? 'Cofnij spam' : 'Oznacz jako spam'}
                    >
                      <AlertTriangle size={14} />
                    </button>
                  </>
                )}
                {(isAdmin || currentUserId === comment.authorId) && (
                  <button
                    onClick={() => { if (confirm('Usunąć komentarz?')) onDelete(comment.id); }}
                    className="p-1 text-muted-foreground hover:text-destructive transition"
                    title="Usuń"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            {comment.content && (
              <p className="text-sm leading-relaxed mb-2 whitespace-pre-wrap">{comment.content}</p>
            )}

            {/* Image */}
            {comment.imagePath && (
              <img
                src={comment.imagePath}
                alt="Załącznik"
                className="rounded-xl max-w-xs max-h-64 object-cover mb-2"
              />
            )}

            {/* Reactions + reply */}
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <ReactionPicker
                commentId={comment.id}
                reactions={comment.reactions}
                currentUserId={currentUserId}
                onReact={onReact}
              />
              {currentUserId && depth < 6 && (
                <button
                  onClick={() => setReplying((v) => !v)}
                  className="text-xs text-muted-foreground hover:text-foreground transition"
                >
                  Odpowiedz
                </button>
              )}
            </div>

            {/* Inline reply form */}
            {replying && (
              <div className="mt-3">
                <CommentForm
                  slug={slug}
                  parentId={comment.id}
                  isAuthenticated={!!currentUserId}
                  onSubmit={async (data) => { await onReply(data); setReplying(false); }}
                  onCancel={() => setReplying(false)}
                  autoFocus
                />
              </div>
            )}
          </>
        )}

        {/* Recursive children */}
        {comment.children?.map((child) => (
          <CommentItem
            key={child.id}
            comment={child}
            slug={slug}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            depth={depth + 1}
            isNew={child.id === newCommentId}
            newCommentId={newCommentId}
            onDelete={onDelete}
            onModerate={onModerate}
            onReact={onReact}
            onReply={onReply}
          />
        ))}
      </div>
    </div>
  );
};
