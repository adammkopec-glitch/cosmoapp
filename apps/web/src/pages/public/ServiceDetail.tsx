import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { servicesApi } from '@/api/services.api';
import { formatPrice } from '@/lib/utils';
import { Clock, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PageSEO } from '@/components/shared/SEO';
import { RichTextViewer } from '@/components/shared/RichTextViewer';
import { ReviewsList } from '@/components/reviews/ReviewsList';
import { ClipRevealImage } from '@/components/ui/ClipRevealImage';

export const ServiceDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const { data: service, isLoading } = useQuery({
    queryKey: ['service', slug],
    queryFn: () => servicesApi.getOne(slug!),
    enabled: !!slug,
  });

  if (isLoading) return (
    <div className="container py-16 flex justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );
  if (!service) return <div className="p-8 text-center">Usługa nie została znaleziona.</div>;

  return (
    <>
      <PageSEO
        title={`${service.name} — Cosmo Salon`}
        description={service.description}
        canonical={`/uslugi/${service.slug}`}
        ogImage={service.imagePath}
      />

      {/* Back link */}
      <div className="container pt-8">
        <Link
          to="/uslugi"
          className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ color: 'rgba(26,18,8,0.5)' }}
        >
          <ArrowLeft size={15} /> Wróć do usług
        </Link>
      </div>

      {/* Hero */}
      <section className="py-14" style={{ backgroundColor: '#F5F0EB' }}>
        <div className="container text-center max-w-3xl mx-auto">
          {service.imagePath && (
            <div
              className="overflow-hidden mb-10 shadow-xl"
              style={{ borderRadius: '20px' }}
            >
              <ClipRevealImage
                src={service.imagePath}
                alt={service.name}
                wrapperClassName="w-full h-[50vh]"
                className="w-full h-full"
              />
            </div>
          )}
          <p className="eyebrow mb-4">{service.category} · {service.durationMinutes} min</p>
          <h1
            className="font-display text-4xl md:text-6xl text-espresso"
            style={{ fontStyle: 'italic', fontWeight: 300 }}
          >
            {service.name}
          </h1>
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className="text-3xl font-bold" style={{ color: '#B8913A' }}>
              {formatPrice(service.price)}
            </span>
            <span
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full"
              style={{ backgroundColor: 'rgba(26,18,8,0.07)', color: '#1A1208' }}
            >
              <Clock size={15} /> {service.durationMinutes} min
            </span>
          </div>
          <button
            className="text-base font-semibold px-10 py-3.5 rounded-full text-white shadow-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1A1208' }}
            onClick={() =>
              navigate(isAuthenticated ? `/rezerwacja?serviceId=${service.id}` : '/auth/login')
            }
          >
            Umów wizytę
          </button>
        </div>
      </section>

      {/* Content */}
      <section className="py-14" style={{ backgroundColor: '#FDFAF6' }}>
        <div className="container max-w-3xl mx-auto">
          <p className="text-lg leading-relaxed mb-10 text-center" style={{ color: 'rgba(26,18,8,0.6)' }}>
            {service.description}
          </p>
          {service.detailedContent && (
            <div className="prose prose-lg max-w-none">
              <RichTextViewer content={service.detailedContent} />
            </div>
          )}
        </div>
      </section>

      {/* Reviews */}
      <section className="py-14" style={{ backgroundColor: '#FDFAF6' }}>
        <div className="container max-w-3xl mx-auto">
          <h2 className="text-2xl font-heading font-bold mb-6 text-center" style={{ color: '#1A1208' }}>
            Opinie klientek
          </h2>
          <ReviewsList serviceId={service.id} />
        </div>
      </section>
    </>
  );
};
