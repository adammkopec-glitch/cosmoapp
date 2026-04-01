// filepath: apps/web/src/pages/public/BlogList.tsx
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { blogApi } from '@/api/blog.api';
import { useAuthStore } from '@/store/auth.store';
import { format } from 'date-fns';
import { Clock, Heart, MessageCircle } from 'lucide-react';
import { PageSEO } from '@/components/shared/SEO';
import { BlogListSkeleton } from '@/components/skeletons';

const LikeButton = ({
  post,
  onLike,
  isLoggedIn,
  isPending
}: {
  post: any;
  onLike: () => void;
  isLoggedIn: boolean;
  isPending: boolean;
}) => {
  const [showHint, setShowHint] = useState(false);
  const [animate, setAnimate] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isLiked = post.isLiked;

  const spawnHearts = () => {
    if (!wrapperRef.current) return;
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        if (!wrapperRef.current) return;
        const heart = document.createElement('span');
        heart.textContent = '❤️';
        heart.style.cssText = `
          position: absolute;
          font-size: 14px;
          pointer-events: none;
          left: ${30 + Math.random() * 40}%;
          top: -4px;
          animation: floatUp 0.7s ease forwards;
          animation-delay: ${Math.random() * 0.1}s;
          z-index: 10;
        `;
        wrapperRef.current.appendChild(heart);
        setTimeout(() => heart.remove(), 800);
      }, i * 60);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      setShowHint(true);
      setTimeout(() => setShowHint(false), 2500);
      return;
    }
    if (animate) return;
    setAnimate(true);
    if (!isLiked) spawnHearts();
    onLike();
    setTimeout(() => setAnimate(false), 400);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 ${
          isLoggedIn ? 'hover:scale-105 active:scale-95' : ''
        }`}
        style={{
          color: isLiked ? '#B8913A' : 'rgba(26,18,8,0.6)',
          backgroundColor: isLiked ? 'rgba(184,145,58,0.1)' : 'rgba(26,18,8,0.05)',
        }}
      >
        <Heart
          size={22}
          fill={isLiked ? '#B8913A' : 'none'}
          stroke={isLiked ? '#B8913A' : 'currentColor'}
          style={{
            animation: animate ? 'heartPop 0.3s ease' : 'none',
            transition: 'fill 0.3s, stroke 0.3s',
          }}
        />
        <span
          className="text-sm font-medium"
          style={{
            animation: animate ? (isLiked ? 'counterDown 0.3s ease' : 'counterUp 0.3s ease') : 'none',
          }}
        >
          {post._count?.likes ?? 0}
        </span>
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

export const BlogList = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: posts, isLoading } = useQuery({ queryKey: ['blog'], queryFn: blogApi.getAll });

  const likeMutation = useMutation({
    mutationFn: (slug: string) => blogApi.likePost(slug),
    onMutate: async (slug) => {
      await queryClient.cancelQueries({ queryKey: ['blog'] });
      const previousPosts = queryClient.getQueryData(['blog']);
      
      queryClient.setQueryData(['blog'], (old: any) => {
        if (!old) return old;
        return old.map((post: any) => {
          if (post.slug === slug) {
            return {
              ...post,
              isLiked: !post.isLiked,
              _count: {
                ...post._count,
                likes: post.isLiked ? (post._count?.likes ?? 1) - 1 : (post._count?.likes ?? 0) + 1
              }
            };
          }
          return post;
        });
      });
      
      return { previousPosts };
    },
    onSuccess: (data, slug) => {
      queryClient.setQueryData(['blog'], (old: any) => {
        if (!old) return old;
        return old.map((post: any) => {
          if (post.slug === slug) {
            return {
              ...post,
              isLiked: data.liked,
              _count: {
                ...post._count,
                likes: data.liked ? (post._count?.likes ?? 0) + 1 : Math.max((post._count?.likes ?? 1) - 1, 0)
              }
            };
          }
          return post;
        });
      });
    },
    onError: (_err, _slug, context) => {
      queryClient.setQueryData(['blog'], context?.previousPosts);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['blog'] });
    },
  });

  if (isLoading) return (
    <>
      {/* Hero */}
      <section className="py-16 text-center" style={{ backgroundColor: '#F5F0EB' }}>
        <div className="container">
          <div
            className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-6"
            style={{ backgroundColor: 'rgba(184,145,58,0.12)', color: '#B8913A' }}
          >
            Wiedza i Inspiracje
          </div>
          <h1 className="text-4xl font-heading font-bold tracking-tight sm:text-5xl" style={{ color: '#1A1208' }}>
            Blog Kosmetologiczny
          </h1>
          <p className="mt-4 text-lg max-w-xl mx-auto" style={{ color: 'rgba(26,18,8,0.55)' }}>
            Artykuły o pielęgnacji skóry, zabiegach i podologii — porady eksperta z Limanowej.
          </p>
        </div>
      </section>
      <section className="py-16" style={{ backgroundColor: '#FDFAF6' }}>
        <div className="container">
          <BlogListSkeleton count={6} />
        </div>
      </section>
    </>
  );

  return (
    <>
      <style>{`
  @keyframes floatUp {
    to { opacity: 0; transform: translateY(-40px) scale(0.5); }
  }
  @keyframes heartPop {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.2); }
    100% { transform: scale(1); }
  }
  @keyframes counterDown {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(6px); }
  }
  @keyframes counterUp {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`}</style>
      <PageSEO
        title="Blog kosmetyczny — Porady i Aktualności"
        description="Artykuły o pielęgnacji skóry, zabiegach kosmetycznych i podologii. Porady eksperta z Limanowej."
        canonical="/blog"
      />

      {/* Hero */}
      <section className="py-16 text-center" style={{ backgroundColor: '#F5F0EB' }}>
        <div className="container">
          <div
            className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-6"
            style={{ backgroundColor: 'rgba(184,145,58,0.12)', color: '#B8913A' }}
          >
            Wiedza i Inspiracje
          </div>
          <h1 className="text-4xl font-heading font-bold tracking-tight sm:text-5xl" style={{ color: '#1A1208' }}>
            Blog Kosmetologiczny
          </h1>
          <p className="mt-4 text-lg max-w-xl mx-auto" style={{ color: 'rgba(26,18,8,0.55)' }}>
            Artykuły o pielęgnacji skóry, zabiegach i podologii — porady eksperta z Limanowej.
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="py-16" style={{ backgroundColor: '#FDFAF6' }}>
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts?.filter((p: any) => p.isPublished).map((post: any) => (
              <Link to={`/blog/${post.slug}`} key={post.id} className="block group">
                <div
                  className="overflow-hidden h-full flex flex-col transition-all duration-300 hover:-translate-y-1"
                  style={{
                    borderRadius: '20px',
                    border: '1px solid rgba(0,0,0,0.07)',
                    backgroundColor: '#fff',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.10)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)')}
                >
                  {post.coverImage && (
                    <div className="aspect-video w-full overflow-hidden" style={{ borderRadius: '20px 20px 0 0' }}>
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="flex flex-col flex-1 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#B8913A' }}>
                        {format(new Date(post.createdAt), 'dd MMMM yyyy')}
                      </span>
                      <div className="flex items-center gap-3 text-xs" style={{ color: 'rgba(26,18,8,0.45)' }}>
                        {post.readingTime && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {post.readingTime} min
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <MessageCircle size={12} /> {post._count?.comments ?? 0}
                        </span>
                      </div>
                    </div>
                    <h2
                      className="text-xl font-heading font-bold mb-3 leading-snug transition-colors flex-1"
                      style={{ color: '#1A1208' }}
                    >
                      {post.title}
                    </h2>
                    <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(26,18,8,0.55)' }}>
                      {post.excerpt}
                    </p>
                    {post.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {post.tags.map((tag: any) => (
                          <span
                            key={tag.id}
                            className="text-xs font-semibold px-3 py-1 rounded-full"
                            style={{
                              backgroundColor: 'rgba(184,145,58,0.1)',
                              color: '#B8913A',
                            }}
                          >
                            #{tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
                      <LikeButton
                        post={post}
                        onLike={() => likeMutation.mutate(post.slug)}
                        isLoggedIn={!!user}
                        isPending={likeMutation.isPending}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};
