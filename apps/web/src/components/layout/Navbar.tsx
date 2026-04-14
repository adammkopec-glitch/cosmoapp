// apps/web/src/components/layout/Navbar.tsx
import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/api/auth.api';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_LINKS = [
  { to: '/uslugi', label: 'Usługi', num: '01' },
  { to: '/metamorfozy', label: 'Metamorfozy', num: '02' },
  { to: '/blog', label: 'Blog', num: '03' },
  { to: '/o-nas', label: 'O nas', num: '04' },
  { to: '/kontakt', label: 'Kontakt', num: '05' },
  { to: '/program-lojalnosciowy', label: 'Lojalność', num: '06' },
];

export const Navbar = () => {
  const { isAuthenticated, isAdmin, isEmployee, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.logout();
      logout();
      navigate('/');
    } catch (e) {
      console.error(e);
    }
    setMobileOpen(false);
  };

  const panelLink = isAdmin ? '/admin' : isEmployee ? '/employee' : '/user';
  const panelLabel = isAdmin ? 'Panel Admina' : isEmployee ? 'Panel Pracownika' : 'Moje Konto';

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          height: '72px',
          background: scrolled ? 'rgba(250,247,242,0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(28,21,16,0.08)' : 'none',
        }}
      >
        <div className="container h-full flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="font-display text-[13px] uppercase"
            style={{ color: scrolled ? '#1C1510' : '#FAF7F2', fontStyle: 'normal', fontWeight: 300, letterSpacing: '0.08em' }}
          >
            Cosmo
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `text-[11px] tracking-[0.2em] uppercase transition-colors hover:text-caramel${isActive ? ' border-b border-caramel pb-px' : ''}`
                }
                style={{ color: scrolled ? '#6B5A4E' : 'rgba(250,247,242,0.75)' }}
              >
                {label}
              </NavLink>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Button variant="ghost-underline" size="sm" asChild data-tour="navbar-booking-btn">
                  <Link to="/rezerwacja">Rezerwacja</Link>
                </Button>
                <Link
                  to={panelLink}
                  className="text-[10px] tracking-[0.2em] uppercase transition-colors hover:text-caramel"
                  style={{ color: scrolled ? '#6B5A4E' : 'rgba(250,247,242,0.6)' }}
                >
                  {panelLabel}
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-[10px] tracking-[0.2em] uppercase transition-colors hover:text-caramel"
                  style={{ color: scrolled ? '#6B5A4E' : 'rgba(250,247,242,0.6)' }}
                >
                  Wyloguj
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/auth/login"
                  className="text-[10px] tracking-[0.2em] uppercase transition-colors hover:text-caramel"
                  style={{ color: scrolled ? '#6B5A4E' : 'rgba(250,247,242,0.7)' }}
                >
                  Zaloguj
                </Link>
                <Button variant="ghost-underline" size="sm" asChild>
                  <Link to="/rezerwacja">Rezerwacja</Link>
                </Button>
              </>
            )}
          </div>

          {/* Hamburger — mobile only */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-2"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Zamknij menu' : 'Otwórz menu'}
          >
            <span
              className="block h-px w-[22px] transition-all duration-300"
              style={{ background: scrolled ? '#1C1510' : '#FAF7F2' }}
            />
            <span
              className="block h-px w-[14px] transition-all duration-300"
              style={{ background: scrolled ? '#1C1510' : '#FAF7F2' }}
            />
          </button>
        </div>
      </nav>

      {/* Mobile fullscreen overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.4, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: '#1C1510' }}
          >
            {/* Header row */}
            <div className="container flex items-center justify-between" style={{ height: '72px' }}>
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className="font-display text-[13px] tracking-[0.45em] uppercase text-ivory"
                style={{ fontStyle: 'normal', fontWeight: 300 }}
              >
                Cosmo
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-ivory text-2xl leading-none p-2"
                aria-label="Zamknij menu"
              >
                ✕
              </button>
            </div>

            {/* Nav links */}
            <div className="container flex-1 flex flex-col justify-center gap-1">
              {NAV_LINKS.map(({ to, label, num }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-baseline gap-4 py-3 border-b border-ivory/10 group"
                >
                  <span className="eyebrow text-caramel">{num}</span>
                  <span
                    className="font-display text-[28px] text-ivory transition-colors group-hover:text-caramel"
                    style={{ fontStyle: 'italic', fontWeight: 300 }}
                  >
                    {label}
                  </span>
                </Link>
              ))}
            </div>

            {/* Bottom area */}
            <div className="container pb-8 flex flex-col gap-3 border-t border-ivory/10 pt-6">
              {isAuthenticated ? (
                <>
                  <Link
                    to={panelLink}
                    onClick={() => setMobileOpen(false)}
                    className="text-[10px] tracking-[0.3em] uppercase text-ivory/60 hover:text-ivory transition-colors py-2"
                  >
                    {panelLabel}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-[10px] tracking-[0.3em] uppercase text-ivory/60 hover:text-ivory transition-colors text-left py-2"
                  >
                    Wyloguj
                  </button>
                </>
              ) : (
                <Link
                  to="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="text-[10px] tracking-[0.3em] uppercase text-ivory/60 hover:text-ivory transition-colors py-2"
                >
                  Zaloguj się
                </Link>
              )}
              <Link
                to="/rezerwacja"
                onClick={() => setMobileOpen(false)}
                className="mt-2 py-4 text-center text-[10px] tracking-[0.3em] uppercase font-medium bg-caramel text-espresso hover:bg-caramel/90 transition-colors"
              >
                Zarezerwuj wizytę
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
