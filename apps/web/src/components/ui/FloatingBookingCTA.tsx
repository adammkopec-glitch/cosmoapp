import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const HIDDEN_PATHS = ['/rezerwacja', '/auth', '/user', '/admin', '/employee'];

export const FloatingBookingCTA = () => {
  const [visible, setVisible] = useState(false);
  const location = useLocation();

  const isHidden = HIDDEN_PATHS.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && !isHidden && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.4, ease: [0.76, 0, 0.24, 1] }}
          className="fixed bottom-0 left-0 right-0 z-40 glass-dark border-t border-caramel/30"
          style={{ borderTop: '1px solid rgba(196,168,130,0.3)' }}
        >
          <div className="container flex items-center justify-between py-3">
            <div>
              <p className="eyebrow mb-0.5">Gotowa na zmianę?</p>
              <p className="font-display text-sm text-ivory" style={{ fontStyle: 'italic' }}>
                Zarezerwuj wizytę online
              </p>
            </div>
            <Link
              to="/rezerwacja"
              className="shrink-0 px-6 py-3 bg-caramel text-espresso text-[9px] font-semibold tracking-[0.3em] uppercase hover:bg-caramel/90 transition-colors"
            >
              Rezerwuj →
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
