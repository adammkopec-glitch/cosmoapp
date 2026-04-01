import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { blogApi } from '@/api/blog.api';
import { queryClient } from '@/lib/queryClient';
import { toast } from 'sonner';
import { CommentTree } from './CommentTree';
import { CommentForm } from './CommentForm';

interface Props {
  slug: string;
}

export const BlogCommentsSection = ({ slug }: Props) => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const [newCommentId, setNewCommentId] = useState<string | undefined>();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['blog-comments', slug],
    queryFn: () => blogApi.getComments(slug),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['blog-comments', slug] });

  const addMutation = useMutation({
    mutationFn: (data: { content: string; parentId?: string; image?: File }) =>
      blogApi.addComment(slug, data),
    onSuccess: (newComment) => {
      setNewCommentId(newComment.id);
      invalidate();
      setTimeout(() => setNewCommentId(undefined), 2500);
    },
    onError: () => toast.error('Nie udało się dodać komentarza'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => blogApi.deleteComment(id),
    onSuccess: () => { invalidate(); toast.success('Komentarz usunięty'); },
    onError: () => toast.error('Nie udało się usunąć komentarza'),
  });

  const moderateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { isHidden?: boolean; isSpam?: boolean } }) =>
      blogApi.moderateComment(id, data),
    onSuccess: invalidate,
    onError: () => toast.error('Nie udało się zmienić moderacji'),
  });

  const reactMutation = useMutation({
    mutationFn: ({ id, emoji }: { id: string; emoji: string }) =>
      blogApi.reactToComment(id, emoji),
    onSuccess: invalidate,
  });

  return (
    <section className="py-14" style={{ backgroundColor: '#F5F0EB' }}>
      <style>{`
        @keyframes slideInFade {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .comment-new {
          animation: slideInFade 0.4s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
          border-left: 3px solid #B8913A !important;
          transition: border-left-color 0.5s ease;
        }
      `}</style>
      <div className="container max-w-3xl mx-auto">
        <h2
          className="text-2xl font-heading font-bold mb-8 flex items-center gap-2"
          style={{ color: '#1A1208' }}
        >
          <MessageSquare size={22} />
          Komentarze
          {comments.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground ml-1">
              ({comments.length})
            </span>
          )}
        </h2>

        {/* Top-level comment form */}
        <div className="mb-8">
          <CommentForm
            slug={slug}
            isAuthenticated={!!user}
            onSubmit={(data) => addMutation.mutateAsync(data)}
          />
        </div>

        {/* Comment tree */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <CommentTree
            comments={comments}
            slug={slug}
            currentUserId={user?.id}
            isAdmin={isAdmin}
            newCommentId={newCommentId}
            onDelete={(id) => deleteMutation.mutate(id)}
            onModerate={(id, data) => moderateMutation.mutate({ id, data })}
            onReact={(id, emoji) => reactMutation.mutate({ id, emoji })}
            onReply={(data) => addMutation.mutateAsync(data)}
          />
        )}
      </div>
    </section>
  );
};
