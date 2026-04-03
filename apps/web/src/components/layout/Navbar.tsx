// filepath: apps/web/src/components/layout/Navbar.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/api/auth.api';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

const NAV_LINKS = [
  { to: '/uslugi', label: 'Usługi' },
  { to: '/metamorfozy', label: 'Metamorfozy' },
  { to: '/blog', label: 'Blog' },
  { to: '/o-nas', label: 'O nas' },
  { to: '/kontakt', label: 'Kontakt' },
  { to: '/program-lojalnosciowy', label: 'Lojalność' },
];

export const Navbar = () => {
  const { isAuthenticated, isAdmin, isEmployee, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

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
    <nav className="sticky top-0 z-50 w-full bg-background border-b border-border/50">
      <div className="container grid grid-cols-3 h-16 items-center">
        {/* Logo */}
        <Link
          to="/"
          className="font-heading font-bold text-2xl text-foreground"
          style={{ letterSpacing: '-0.02em' }}
        >
          Cosmo
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex justify-center items-center gap-7">
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="text-sm font-medium text-foreground transition-colors hover:text-primary"
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Desktop auth */}
        <div className="hidden md:flex justify-end items-center gap-3">
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              <Link
                to="/rezerwacja"
                data-tour="navbar-booking-btn"
                className="text-sm font-medium px-5 py-2 rounded-full bg-foreground text-background transition-opacity hover:opacity-90"
              >
                Rezerwacja
              </Link>
              <Link
                to={panelLink}
                className="text-sm font-medium px-4 py-2 rounded-full border border-border text-foreground transition-colors hover:bg-accent"
              >
                {panelLabel}
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm font-medium px-4 py-2 rounded-full text-foreground transition-colors hover:bg-accent"
              >
                Wyloguj
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth/login"
                className="text-sm font-medium px-4 py-2 rounded-full text-foreground transition-colors hover:bg-accent"
              >
                Zaloguj
              </Link>
              <Link
                to="/auth/register"
                className="text-sm font-medium px-5 py-2 rounded-full bg-foreground text-background transition-opacity hover:opacity-90"
              >
                Rejestracja
              </Link>
            </>
          )}
        </div>

        {/* Hamburger */}
        <button
          className="md:hidden p-2 rounded-lg justify-self-end text-foreground"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? 'Zamknij menu' : 'Otwórz menu'}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/50 bg-background">
          <div className="container py-4 flex flex-col gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="text-sm font-medium py-2.5 px-3 rounded-lg text-foreground transition-colors hover:bg-accent"
                onClick={() => setMobileOpen(false)}
              >
                {label}
              </Link>
            ))}
            <div className="mt-3 pt-3 flex flex-col gap-2 border-t border-border/50">
              <div className="flex items-center justify-between px-3 py-1">
                <span className="text-sm text-muted-foreground">Motyw</span>
                <ThemeToggle />
              </div>
              {isAuthenticated ? (
                <>
                  <Link
                    to={panelLink}
                    className="text-sm font-medium py-2.5 px-3 rounded-lg border border-border text-foreground text-center transition-colors hover:bg-accent"
                    onClick={() => setMobileOpen(false)}
                  >
                    {panelLabel}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-sm font-medium py-2.5 px-3 rounded-lg text-left text-foreground transition-colors hover:bg-accent"
                  >
                    Wyloguj
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/auth/login"
                    className="text-sm font-medium py-2.5 px-3 rounded-lg text-center border border-border text-foreground transition-colors hover:bg-accent"
                    onClick={() => setMobileOpen(false)}
                  >
                    Zaloguj
                  </Link>
                  <Link
                    to="/auth/register"
                    className="text-sm font-medium py-2.5 px-3 rounded-lg text-center bg-foreground text-background transition-opacity hover:opacity-90"
                    onClick={() => setMobileOpen(false)}
                  >
                    Rejestracja
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
