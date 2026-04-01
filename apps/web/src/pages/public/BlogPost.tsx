// filepath: apps/web/src/pages/public/BlogPost.tsx
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import LinkExt from '@tiptap/extension-link';
import { blogApi } from '@/api/blog.api';
import { useAuthStore } from '@/store/auth.store';
import { format } from 'date-fns';
import { ArrowLeft, Clock, Heart, MessageCircle } from 'lucide-react';
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

const LikeButton = ({ 
  isLiked, 
  count, 
  onLike, 
  isLoggedIn, 
  isPending 
}: { 
  isLiked: boolean; 
  count: number;
  onLike: () => void; 
  isLoggedIn: boolean;
  isPending: boolean;
}) => {
  const [showHint, setShowHint] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [justLiked, setJustLiked] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isLoggedIn) {
      setShowHint(true);
      setTimeout(() => setShowHint(false), 2500);
      return;
    }
    if (animate) return;
    setAnimate(true);
    setJustLiked(true);
    onLike();
    setTimeout(() => setAnimate(false), 400);
    setTimeout(() => setJustLiked(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
          isLoggedIn ? 'hover:scale-105 active:scale-95' : ''
        }`}
        style={{ 
          color: isLiked ? '#B8913A' : 'rgba(26,18,8,0.6)',
          backgroundColor: isLiked ? 'rgba(184,145,58,0.12)' : 'rgba(26,18,8,0.05)',
          transform: animate ? 'scale(1.15)' : 'scale(1)'
        }}
      >
        <Heart
          size={24}
          fill={isLiked ? '#B8913A' : 'none'}
          stroke={isLiked ? '#B8913A' : 'currentColor'}
          className={animate ? 'animate-pulse' : ''}
        />
        <span className="text-base font-medium">{count}</span>
        {(!isLiked || justLiked) && (
          <span className="relative inline-block" style={{ width: '140px', height: '20px' }}>
            <span
              className="absolute inset-0 text-sm font-medium transition-all duration-500 ease-in-out"
              style={{
                color: 'rgba(26,18,8,0.5)',
                opacity: !justLiked ? 1 : 0,
                transform: !justLiked ? 'translateX(0)' : 'translateX(-8px)',
                pointerEvents: 'none'
              }}
            >
              Polub ten artykuł
            </span>
            <span
              className="absolute inset-0 text-sm font-medium transition-all duration-500 ease-in-out"
              style={{
                color: '#B8913A',
                opacity: justLiked ? 1 : 0,
                transform: justLiked ? 'translateX(0)' : 'translateX(8px)',
                pointerEvents: 'none'
              }}
            >
              Polubiono
            </span>
          </span>
        )}
      </button>
      {showHint && (
        <div 
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-3 text-sm font-medium rounded-xl whitespace-nowrap z-10 shadow-lg"
          style={{ backgroundColor: '#1A1208', color: '#fff' }}
        >
          <div className="text-center">
            <div>Zaloguj się, aby polubić artykuł</div>
            <div className="text-xs mt-1 opacity-70">To tylko chwila — dołącz do nas!</div>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1" style={{ border: '8px solid transparent', borderTopColor: '#1A1208' }} />
        </div>
      )}
    </div>
  );
};

export const BlogPost = () => {
  const { slug } = useParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: post, isLoading } = useQuery({
    queryKey: ['blog', slug],
    queryFn: () => blogApi.getOne(slug!),
  });

  const likeMutation = useMutation({
    mutationFn: (postSlug: string) => blogApi.likePost(postSlug),
    onMutate: async (slug) => {
      await queryClient.cancelQueries({ queryKey: ['blog', slug] });
      const previousPost = queryClient.getQueryData(['blog', slug]);
      
      queryClient.setQueryData(['blog', slug], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          isLiked: !old.isLiked,
          _count: {
            ...old._count,
            likes: old.isLiked ? (old._count?.likes ?? 1) - 1 : (old._count?.likes ?? 0) + 1
          }
        };
      });
      
      return { previousPost };
    },
    onSuccess: (data, slug) => {
      queryClient.setQueryData(['blog', slug], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          isLiked: data.liked,
          _count: {
            ...old._count,
            likes: data.liked ? (old._count?.likes ?? 0) + 1 : Math.max((old._count?.likes ?? 1) - 1, 0)
          }
        };
      });
    },
    onError: (_err, _slug, context) => {
      queryClient.setQueryData(['blog', slug], context?.previousPost);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['blog', slug] });
    },
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
            <span className="flex items-center gap-1">
              <MessageCircle size={14} /> {post._count?.comments ?? 0} komentarzy
            </span>
            <LikeButton
              isLiked={post.isLiked}
              count={post._count?.likes ?? 0}
              onLike={() => likeMutation.mutate(post.slug)}
              isLoggedIn={!!user}
              isPending={likeMutation.isPending}
            />
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
