import { useMemo } from 'react';
import { CommentItem, type CommentData } from './CommentItem';

interface Props {
  comments: CommentData[];
  slug: string;
  currentUserId?: string;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onModerate: (id: string, data: { isHidden?: boolean; isSpam?: boolean }) => void;
  onReact: (id: string, emoji: string) => void;
  onReply: (data: { content: string; parentId?: string; image?: File }) => Promise<void>;
}

function buildTree(comments: CommentData[]): CommentData[] {
  const map = new Map<string, CommentData>();
  const roots: CommentData[] = [];

  comments.forEach((c) => map.set(c.id, { ...c, children: [] }));
  map.forEach((c) => {
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children!.push(c);
    } else {
      roots.push(c);
    }
  });

  return roots;
}

export const CommentTree = ({
  comments,
  slug,
  currentUserId,
  isAdmin,
  onDelete,
  onModerate,
  onReact,
  onReply,
}: Props) => {
  const tree = useMemo(() => buildTree(comments), [comments]);

  if (tree.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Brak komentarzy. Bądź pierwszy!
      </p>
    );
  }

  return (
    <div className="divide-y divide-border/30">
      {tree.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          slug={slug}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onDelete={onDelete}
          onModerate={onModerate}
          onReact={onReact}
          onReply={onReply}
        />
      ))}
    </div>
  );
};
