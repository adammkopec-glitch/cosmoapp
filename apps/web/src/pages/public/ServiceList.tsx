// filepath: apps/web/src/pages/public/ServiceList.tsx
import { useQuery } from '@tanstack/react-query';
import { servicesApi } from '@/api/services.api';
import { formatPrice } from '@/lib/utils';
import { Clock } from 'lucide-react';
import { ServiceRating } from '@/components/reviews/ServiceRating';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { PageSEO } from '@/components/shared/SEO';
import { ServiceListSkeleton } from '@/components/skeletons';

export const ServiceList = () => {
  const { data: services, isLoading } = useQuery({ queryKey: ['services'], queryFn: servicesApi.getAll });
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isLoading) return (
    <>
      {/* Hero skeleton */}
      <section className="py-16 text-center" style={{ backgroundColor: '#F5F0EB' }}>
        <div className="container">
          <div
            className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-6"
            style={{ backgroundColor: 'rgba(184,145,58,0.12)', color: '#B8913A' }}
          >
            Nasza Oferta
          </div>
          <h1 className="text-4xl font-heading font-bold tracking-tight sm:text-5xl" style={{ color: '#1A1208' }}>
            Nasze Usługi
          </h1>
          <p className="mt-4 text-lg max-w-xl mx-auto" style={{ color: 'rgba(26,18,8,0.55)' }}>
            Profesjonalne zabiegi kosmetyczne i podologiczne wykonywane z pasją i precyzją.
          </p>
        </div>
      </section>
      <section data-tour="services-list" className="py-16" style={{ backgroundColor: '#FDFAF6' }}>
        <div className="container">
          <ServiceListSkeleton count={6} />
        </div>
      </section>
    </>
  );

  return (
    <>
      <PageSEO
        title="Usługi — Kosmetologia i Podologia Limanowa"
        description="Pełna oferta zabiegów kosmetycznych i podologicznych w Limanowej. Brwi, rzęsy, zabiegi na twarz, podologia, manicure, pedicure. Laskowa, Mordarka i okolice."
        canonical="/uslugi"
      />

      {/* Hero */}
      <section className="py-16 text-center" style={{ backgroundColor: '#F5F0EB' }}>
        <div className="container">
          <div
            className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-6"
            style={{ backgroundColor: 'rgba(184,145,58,0.12)', color: '#B8913A' }}
          >
            Nasza Oferta
          </div>
          <h1 className="text-4xl font-heading font-bold tracking-tight sm:text-5xl" style={{ color: '#1A1208' }}>
            Nasze Usługi
          </h1>
          <p className="mt-4 text-lg max-w-xl mx-auto" style={{ color: 'rgba(26,18,8,0.55)' }}>
            Profesjonalne zabiegi kosmetyczne i podologiczne wykonywane z pasją i precyzją.
          </p>
        </div>
      </section>

      {/* Grid */}
      <section data-tour="services-list" className="py-16" style={{ backgroundColor: '#FDFAF6' }}>
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services?.map((service: any) => (
              <Link key={service.id} to={`/uslugi/${service.slug}`} className="block group">
                <div
                  className="overflow-hidden flex flex-col h-full transition-all duration-300 hover:-translate-y-1"
                  style={{
                    borderRadius: '20px',
                    border: '1px solid rgba(0,0,0,0.07)',
                    backgroundColor: '#fff',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.10)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)')}
                >
                  {service.imagePath && (
                    <div className="aspect-video w-full overflow-hidden" style={{ borderRadius: '20px 20px 0 0' }}>
                      <img
                        src={service.imagePath}
                        alt={service.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="flex flex-col flex-1 p-6">
                    <h2
                      className="text-xl font-heading font-bold mb-3 transition-colors"
                      style={{ color: '#1A1208' }}
                    >
                      {service.name}
                    </h2>
                    <p className="text-sm leading-relaxed flex-1 mb-4" style={{ color: 'rgba(26,18,8,0.55)' }}>
                      {service.description}
                    </p>
                    <div className="flex items-center gap-3 mb-5 flex-wrap">
                      <span
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                        style={{ backgroundColor: 'rgba(184,145,58,0.1)', color: '#B8913A' }}
                      >
                        <Clock size={13} /> {service.durationMinutes} min
                      </span>
                      <ServiceRating avgRating={service.avgRating} reviewCount={service.reviewCount} />
                    </div>
                    <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                      <span className="text-2xl font-bold" style={{ color: '#B8913A' }}>
                        {formatPrice(service.price)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(isAuthenticated ? '/user/wizyty' : '/auth/login');
                        }}
                        className="text-sm font-semibold px-5 py-2.5 rounded-full text-white transition-opacity hover:opacity-90"
                        style={{ backgroundColor: '#1A1208' }}
                      >
                        Umów wizytę
                      </button>
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
