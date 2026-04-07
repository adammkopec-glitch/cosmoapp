// filepath: apps/web/src/pages/public/MetamorphosesGallery.tsx
import { useQuery } from '@tanstack/react-query';
import { metamorphosesApi } from '@/api/metamorphoses.api';
import { BeforeAfterSlider } from '@/components/shared/BeforeAfterSlider';
import { PageSEO } from '@/components/shared/SEO';
import { ShareButton } from '@/components/metamorphoses/ShareButton';

export const MetamorphosesGallery = () => {
  const { data: metamorphoses, isLoading } = useQuery({ queryKey: ['metamorphoses'], queryFn: metamorphosesApi.getAll });

  if (isLoading) return (
    <div className="container py-16 flex justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );

  return (
    <>
      <PageSEO
        title="Metamorfozy — Efekty Zabiegów"
        description="Zobacz spektakularne efekty zabiegów kosmetycznych i podologicznych. Galeria przed i po z naszego salonu w Limanowej."
        canonical="/metamorfozy"
      />

      {/* Hero */}
      <section className="py-16 text-center" style={{ backgroundColor: '#F5F0EB' }}>
        <div className="container max-w-3xl mx-auto">
          <div
            className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-6"
            style={{ backgroundColor: 'rgba(184,145,58,0.12)', color: '#B8913A' }}
          >
            Galeria metamorfoz
          </div>
          <h1 className="text-4xl font-heading font-bold tracking-tight sm:text-5xl mb-5" style={{ color: '#1A1208' }}>
            Metamorfozy i Efekty
          </h1>
          <p className="text-lg leading-relaxed" style={{ color: 'rgba(26,18,8,0.55)' }}>
            Zobacz prawdziwe efekty naszych zabiegów na osobach, które nam zaufały. Przed i po zabiegach w naszym gabinecie.
          </p>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-16" style={{ backgroundColor: '#FDFAF6' }}>
        <div className="container">
          {metamorphoses?.length === 0 ? (
            <div
              className="text-center p-16"
              style={{
                borderRadius: '24px',
                border: '2px dashed rgba(0,0,0,0.1)',
                color: 'rgba(26,18,8,0.4)',
              }}
            >
              Brak dostępnych zdjęć do wyświetlenia w galerii.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {metamorphoses?.map((m: any) => (
                <div key={m.id} className="flex flex-col">
                  <BeforeAfterSlider
                    title={m.title}
                    description={m.description}
                    beforeSrc={m.beforeImage}
                    afterSrc={m.afterImage}
                  />
                  <div className="mt-2 flex justify-end">
                    <ShareButton
                      beforeImage={m.beforeImage}
                      afterImage={m.afterImage}
                      title={m.title || 'Metamorfoza'}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
};
