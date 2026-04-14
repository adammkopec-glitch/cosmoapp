// filepath: apps/web/src/pages/public/ServiceList.tsx
import { useQuery } from '@tanstack/react-query';
import { servicesApi } from '@/api/services.api';
import { PageSEO } from '@/components/shared/SEO';
import { ServiceCard } from '@/components/ui/ServiceCard';
import { ServiceListSkeleton } from '@/components/skeletons';
import { useClipReveal } from '@/hooks/useClipReveal';
import { GeoArc } from '@/components/shared/DecoElements';

export const ServiceList = () => {
  const { data: services, isLoading } = useQuery({ queryKey: ['services'], queryFn: servicesApi.getAll });
  const { ref: headerRef, revealed: headerRevealed } = useClipReveal<HTMLDivElement>({ threshold: 0.1 });

  if (isLoading) return (
    <section className="py-16" style={{ background: '#FAF7F2' }}>
      <div className="container"><ServiceListSkeleton count={6} /></div>
    </section>
  );

  return (
    <>
      <PageSEO
        title="Usługi — Kosmetologia i Podologia Limanowa"
        description="Pełna oferta zabiegów kosmetycznych i podologicznych w Limanowej."
        canonical="/uslugi"
      />

      {/* Hero */}
      <section className="py-24 text-center relative" style={{ background: '#F0EBE3' }}>
        <GeoArc size={120} opacity={0.2} className="top-4 right-4" />
        <div className="container">
          <p className="eyebrow mb-5">Nasza Oferta</p>
          <h1
            className="font-display text-5xl md:text-7xl text-espresso mb-6"
            style={{ fontStyle: 'italic', fontWeight: 300 }}
          >
            Nasze Usługi
          </h1>
          <p className="text-mink text-lg max-w-lg mx-auto font-light">
            Profesjonalne zabiegi kosmetyczne i podologiczne wykonywane z pasją i precyzją.
          </p>
        </div>
      </section>

      {/* Sticky layout: header left, cards right */}
      <section data-tour="services-list" style={{ background: '#FAF7F2' }}>
        <div className="container py-16">
          <div className="flex gap-16 items-start">
            {/* Sticky sidebar header */}
            <div
              ref={headerRef}
              className="hidden lg:block w-56 shrink-0"
              style={{
                position: 'sticky',
                top: '72px',
                opacity: headerRevealed ? 1 : 0,
                transform: headerRevealed ? 'translateY(0)' : 'translateY(16px)',
                transition: 'opacity 0.6s ease, transform 0.6s ease',
              }}
            >
              <p className="eyebrow mb-4">Zabiegi</p>
              <h2
                className="font-display text-4xl text-espresso leading-tight"
                style={{ fontStyle: 'italic', fontWeight: 300 }}
              >
                Co możemy dla Ciebie zrobić
              </h2>
              <div className="w-8 h-px bg-caramel mt-6 mb-4" />
              <p className="text-mink text-sm leading-relaxed">
                Każdy zabieg wykonujemy z pełnym zaangażowaniem i dbałością o detal.
              </p>
            </div>

            {/* Cards grid */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              {services?.map((service, i) => (
                <ServiceCard key={service.id} service={service} index={i} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
