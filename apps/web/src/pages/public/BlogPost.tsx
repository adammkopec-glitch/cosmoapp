// filepath: apps/web/src/pages/public/BlogPost.tsx
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import LinkExt from '@tiptap/extension-link';
import { blogApi } from '@/api/blog.api';
import { format } from 'date-fns';
import { ArrowLeft, Clock } from 'lucide-react';
import { PageSEO } from '@/components/shared/SEO';
import { BlogCommentsSection } from '@/components/blog/BlogCommentsSection';

const ContentRenderer = ({ content }: { content: string }) => {
  const parsed = useMemo(() => {
    if (!content) return null;
    try {
      const obj = typeof content === 'string' ? JSON.parse(content) : content;
      return typeof obj === 'object' ? obj : null;
    } catch {
      return null;
    }
  }, [content]);

  const editor = useEditor({
    extensions: [StarterKit, Image, LinkExt.configure({ openOnClick: true })],
    content: parsed ?? '',
    editable: false,
  });

  return <EditorContent editor={editor} />;
};

export const BlogPost = () => {
  const { slug } = useParams();
  const { data: post, isLoading } = useQuery({
    queryKey: ['blog', slug],
    queryFn: () => blogApi.getOne(slug!),
  });

  if (isLoading) return (
    <div className="container py-16 flex justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );
  if (!post) return <div className="p-8 text-center">Wpis nie został znaleziony.</div>;

  return (
    <>
      <PageSEO
        title={post.metaTitle ?? post.title}
        description={post.metaDescription ?? post.excerpt ?? `Przeczytaj artykuł: ${post.title} na blogu salonu Cosmo w Limanowej.`}
        canonical={`/blog/${post.slug}`}
        ogImage={post.coverImage}
      />

      {/* Back link */}
      <div className="container pt-8">
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ color: 'rgba(26,18,8,0.5)' }}
        >
          <ArrowLeft size={15} /> Powrót na blog
        </Link>
      </div>

      {/* Hero */}
      <section className="py-14 text-center" style={{ backgroundColor: '#F5F0EB' }}>
        <div className="container max-w-3xl mx-auto">
          <div className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: '#B8913A' }}>
            {format(new Date(post.createdAt), 'dd MMMM yyyy')}
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold leading-tight mb-6" style={{ color: '#1A1208' }}>
            {post.title}
          </h1>
          <div className="flex justify-center items-center gap-4 mb-6 text-sm" style={{ color: 'rgba(26,18,8,0.5)' }}>
            {post.readingTime && (
              <span className="flex items-center gap-1">
                <Clock size={14} /> {post.readingTime} min czytania
              </span>
            )}
          </div>
          {post.tags?.length > 0 && (
            <div className="flex justify-center flex-wrap gap-2">
              {post.tags.map((tag: any) => (
                <span
                  key={tag.id}
                  className="text-xs font-semibold px-4 py-1.5 rounded-full"
                  style={{ backgroundColor: 'rgba(184,145,58,0.12)', color: '#B8913A' }}
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Cover image */}
      {post.coverImage && (
        <div className="container max-w-4xl mx-auto px-4 -mt-1 pt-10">
          <div className="overflow-hidden shadow-xl" style={{ borderRadius: '20px' }}>
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-auto max-h-[500px] object-cover"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <section className="py-14" style={{ backgroundColor: '#FDFAF6' }}>
        <div className="container max-w-3xl mx-auto">
          <article className="prose prose-lg max-w-none">
            <ContentRenderer content={post.content} />
          </article>
        </div>
      </section>

      <BlogCommentsSection slug={post.slug} />
    </>
  );
};
