import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, EyeOff, Eye, AlertTriangle, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { blogApi } from '@/api/blog.api';
import { queryClient } from '@/lib/queryClient';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const AdminBlogComments = () => {
  const { id: postId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Get slug from blog list (admin token is sent automatically by axios interceptor,
  // so getComments returns ALL comments including spam with full hidden content)
  const { data: posts } = useQuery({ queryKey: ['blog-admin'], queryFn: blogApi.getAll });
  const post = posts?.find((p: any) => p.id === postId);
  const slug = post?.slug;

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['blog-comments-admin', slug],
    queryFn: () => blogApi.getComments(slug!),
    enabled: !!slug,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['blog-comments-admin', slug] });

  const moderateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { isHidden?: boolean; isSpam?: boolean } }) =>
      blogApi.moderateComment(id, data),
    onSuccess: () => { invalidate(); toast.success('Zaktualizowano'); },
    onError: () => toast.error('Błąd moderacji'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => blogApi.deleteComment(id),
    onSuccess: () => { invalidate(); toast.success('Komentarz usunięty'); },
    onError: () => toast.error('Nie udało się usunąć'),
  });

  return (
    <div className="space-y-6 animate-enter">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/blog')}>
          <ArrowLeft size={16} className="mr-1" /> Powrót
        </Button>
        <h1 className="text-2xl font-heading font-bold text-primary">
          Komentarze: {post?.title ?? '…'}
        </h1>
      </div>

      {isLoading && <div className="animate-pulse p-4">Ładowanie…</div>}

      {!isLoading && (comments as any[]).length === 0 && (
        <div className="text-muted-foreground p-12 bg-muted/20 border-2 border-dashed rounded-2xl text-center">
          Brak komentarzy.
        </div>
      )}

      <div className="grid gap-3">
        {(comments as any[]).map((c) => (
          <Card
            key={c.id}
            className={`border-border/50 ${c.isHidden ? 'opacity-60' : ''} ${c.isSpam ? 'border-amber-400/50 bg-amber-50/30' : ''}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm">{c.author?.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: pl })}
                    </span>
                    {c.isHidden && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                        Ukryty
                      </span>
                    )}
                    {c.isSpam && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        Spam
                      </span>
                    )}
                    {c.parentId && (
                      <span className="text-xs text-muted-foreground">↳ odpowiedź</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {c.content ?? <em>brak treści</em>}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moderateMutation.mutate({ id: c.id, data: { isHidden: !c.isHidden } })}
                    title={c.isHidden ? 'Pokaż' : 'Ukryj'}
                  >
                    {c.isHidden ? <Eye size={15} /> : <EyeOff size={15} />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moderateMutation.mutate({ id: c.id, data: { isSpam: !c.isSpam } })}
                    title={c.isSpam ? 'Cofnij spam' : 'Oznacz spam'}
                  >
                    <AlertTriangle size={15} className={c.isSpam ? 'text-amber-600' : ''} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { if (confirm('Usunąć?')) deleteMutation.mutate(c.id); }}
                    title="Usuń"
                  >
                    <Trash2 size={15} className="text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
