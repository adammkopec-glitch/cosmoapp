import { useQuery } from '@tanstack/react-query';
import { Facebook, Instagram, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { employeesApi } from '../../api/employees.api';
import { SEO } from '../../lib/seo-config';

const TikTokIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-5 w-5"
    aria-hidden="true"
  >
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z" />
  </svg>
);

interface Employee {
  id: string;
  name: string;
  specialties: string[];
  avatarPath: string | null;
  isActive: boolean;
}

const EmployeeCard = ({ employee }: { employee: Employee }) => {
  const initial = employee.name.charAt(0).toUpperCase();
  const specialty = employee.specialties?.[0] ?? '';

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      {employee.avatarPath ? (
        <img
          src={employee.avatarPath}
          alt={employee.name}
          className="h-16 w-16 rounded-full object-cover"
          style={{ border: '2px solid #B8913A' }}
        />
      ) : (
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold"
          style={{ backgroundColor: 'rgba(184,145,58,0.2)', color: '#B8913A' }}
        >
          {initial}
        </div>
      )}
      <div>
        <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>{employee.name}</p>
        {specialty && (
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{specialty}</p>
        )}
      </div>
    </div>
  );
};

export const Footer = () => {
  const { data: employees } = useQuery<Employee[]>({
    queryKey: ['employees-public'],
    queryFn: () => employeesApi.getAll(),
    staleTime: 300_000,
  });

  const activeEmployees = employees?.filter((e) => e.isActive) ?? [];

  return (
    <footer style={{ backgroundColor: '#1A1208' }}>
      {/* Main grid */}
      <div className="container py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          {/* Column 1 — Logo + description + social */}
          <div className="flex flex-col gap-5">
            <Link
              to="/"
              className="font-heading font-bold text-2xl"
              style={{ color: '#FDFAF6', letterSpacing: '-0.02em' }}
            >
              Cosmo
            </Link>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Salon Kosmetologiczny & Gabinet Podologiczny w Limanowej. Zadbaj o siebie razem z nami.
            </p>
            <div className="flex gap-4">
              {[
                { href: SEO.fbProfile, label: 'Facebook', Icon: Facebook },
                { href: SEO.igProfile, label: 'Instagram', Icon: Instagram },
              ].map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="transition-colors"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#B8913A')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)')}
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
              <a
                href={SEO.ttProfile}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="transition-colors"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#B8913A')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)')}
              >
                <TikTokIcon />
              </a>
            </div>
          </div>

          {/* Column 2 — Address & contact */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#B8913A' }}>
              Kontakt
            </h3>
            <div className="flex items-start gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#B8913A' }} />
              <span>
                {SEO.address.street}<br />
                {SEO.address.postalCode} {SEO.address.city}
              </span>
            </div>
            <a
              href={`tel:${SEO.phone}`}
              className="flex items-center gap-2 text-sm transition-colors"
              style={{ color: 'rgba(255,255,255,0.55)' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#B8913A')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)')}
            >
              <Phone className="h-4 w-4 shrink-0" style={{ color: '#B8913A' }} />
              {SEO.phone}
            </a>
            <a
              href={`mailto:${SEO.email}`}
              className="flex items-center gap-2 text-sm transition-colors"
              style={{ color: 'rgba(255,255,255,0.55)' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#B8913A')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)')}
            >
              <Mail className="h-4 w-4 shrink-0" style={{ color: '#B8913A' }} />
              {SEO.email}
            </a>
          </div>

          {/* Column 3 — Opening hours */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#B8913A' }}>
              Godziny pracy
            </h3>
            <dl className="space-y-1.5">
              {SEO.openingHours.map(({ days, hours }) => (
                <div key={days} className="flex justify-between gap-4 text-sm">
                  <dt style={{ color: 'rgba(255,255,255,0.55)' }}>{days}</dt>
                  <dd
                    style={{
                      color: hours === 'Nieczynne' ? 'rgba(239,68,68,0.8)' : 'rgba(255,255,255,0.85)',
                      fontWeight: 500,
                    }}
                  >
                    {hours}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Team section */}
        {activeEmployees.length > 0 && (
          <div className="mt-12" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '2.5rem' }}>
            <h3 className="mb-8 text-xs font-semibold uppercase tracking-widest" style={{ color: '#B8913A' }}>
              Nasz Zespół
            </h3>
            <div className="flex flex-wrap gap-10">
              {activeEmployees.map((emp) => (
                <EmployeeCard key={emp.id} employee={emp} />
              ))}
            </div>
          </div>
        )}

        {/* Google Maps */}
        <div
          className="mt-10 overflow-hidden"
          style={{
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <iframe
            title="Lokalizacja salonu Cosmo"
            src={`https://maps.google.com/maps?q=${SEO.lat},${SEO.lon}&z=15&output=embed`}
            width="100%"
            height="280"
            style={{ border: 0, display: 'block' }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>

      {/* Copyright bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', paddingBottom: '1rem' }}>
        <div className="container flex flex-col items-center justify-between gap-2 text-xs sm:flex-row" style={{ color: 'rgba(255,255,255,0.35)' }}>
          <span>© {new Date().getFullYear()} Cosmo. Wszelkie prawa zastrzeżone.</span>
          <Link
            to="/privacy"
            className="transition-colors"
            style={{ color: 'rgba(255,255,255,0.35)' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#B8913A')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)')}
          >
            Polityka prywatności
          </Link>
        </div>
      </div>
    </footer>
  );
};
