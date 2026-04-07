import { Link } from 'react-router-dom';
import { formatPrice } from '@/lib/utils';
import { ServiceRating } from '@/components/reviews/ServiceRating';

interface ServiceCardProps {
  service: {
    id: string;
    slug: string;
    name: string;
    description?: string;
    durationMinutes: number;
    price: number;
    imagePath?: string;
    category?: string;
    avgRating?: number;
    reviewCount?: number;
  };
  index?: number; // for stagger delay
}

export const ServiceCard = ({ service, index = 0 }: ServiceCardProps) => {
  const delay = index * 80; // ms stagger

  return (
    <Link
      to={`/uslugi/${service.slug}`}
      className="block group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className="overflow-hidden flex flex-col transition-all duration-500 hover:-translate-y-1"
        style={{
          boxShadow: '0 8px 32px rgba(28,21,16,0.12)',
          borderRadius: '4px',
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.boxShadow = '0 16px 48px rgba(28,21,16,0.18)')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(28,21,16,0.12)')
        }
      >
        {/* Image with glassmorphism overlay */}
        <div className="relative overflow-hidden" style={{ height: '200px' }}>
          {service.imagePath ? (
            <img
              src={service.imagePath}
              alt={service.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-cream to-caramel/40" />
          )}
          {/* Dark gradient + glassmorphism label */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, transparent 35%, rgba(28,21,16,0.72) 100%)' }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 p-4 glass"
            style={{
              background: 'rgba(250,247,242,0.1)',
              borderTop: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            {service.category && (
              <p className="eyebrow mb-1" style={{ color: '#C4A882' }}>
                {service.category} · {service.durationMinutes} min
              </p>
            )}
            <h2
              className="font-display text-[18px] text-ivory leading-tight"
              style={{ fontStyle: 'italic', fontWeight: 300 }}
            >
              {service.name}
            </h2>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex items-center justify-between px-5 py-4 bg-ivory"
          style={{ borderTop: '1px solid rgba(28,21,16,0.06)' }}
        >
          <div>
            <span className="font-display text-[20px] text-espresso" style={{ fontWeight: 300 }}>
              {formatPrice(service.price)}
            </span>
            {(service.avgRating !== undefined) && (
              <div className="mt-0.5">
                <ServiceRating avgRating={service.avgRating} reviewCount={service.reviewCount ?? 0} />
              </div>
            )}
          </div>
          <div className="px-5 py-2.5 bg-espresso text-ivory text-[9px] tracking-[0.25em] uppercase font-medium hover:bg-espresso/90 transition-colors">
            Umów wizytę
          </div>
        </div>
      </div>
    </Link>
  );
};
