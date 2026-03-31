// filepath: apps/web/src/pages/admin/Blog.tsx
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { blogApi } from '@/api/blog.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { queryClient } from '@/lib/queryClient';

export const AdminBlog = () => {
  const navigate = useNavigate();
  const { data: posts, isLoading } = useQuery({ queryKey: ['blog-admin'], queryFn: blogApi.getAll });

  const deleteMutation = useMutation({
    mutationFn: blogApi.remove,
    onSuccess: () => {
      toast.success('Wpis usunięty');
      queryClient.invalidateQueries({ queryKey: ['blog-admin'] });
    }
  });

  return (
    <div className="space-y-6 animate-enter">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-heading font-bold text-primary">Zarządzanie Blogiem</h1>
        <Button className="shadow-md" onClick={() => navigate('/admin/blog/new')}>Napisz nowy artykuł</Button>
      </div>

      <div className="grid gap-4">
        {isLoading ? <div className="animate-pulse p-4">Ładowanie...</div> : posts?.map((p: any) => (
          <Card key={p.id} className="hover:shadow-sm border-border/50 transition-shadow">
            <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg">{p.title}</h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold shadow-sm ${p.isPublished ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {p.isPublished ? 'Opublikowany' : 'Szkic'}
                  </span>
                  <span className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate(`/admin/blog/${p.id}/comments`)}>Komentarze</Button>
                <Button variant="outline" size="sm" onClick={() => navigate(`/admin/blog/${p.id}/edit`)}>Edytuj wpis</Button>
                <Button variant="destructive" size="sm" onClick={() => {
                  if(confirm('Na pewno trwale usunąć ten wpis?')) deleteMutation.mutate(p.id);
                }}>Usuń</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {posts?.length === 0 && <div className="text-muted-foreground p-12 bg-muted/20 border-2 border-dashed rounded-2xl text-center">Widok bloga będzie dostępny po dodaniu pierwszego artykułu!</div>}
      </div>
    </div>
  );
};
