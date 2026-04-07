import { Outlet, useLocation, ScrollRestoration } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { FloatingBookingCTA } from '@/components/ui/FloatingBookingCTA';

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } },
  exit:    { opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } },
};

export const PublicLayout = () => {
  const location = useLocation();
  const shouldReduce = useReducedMotion();
  const activeVariants = shouldReduce
    ? { initial: {}, animate: {}, exit: {} }
    : pageVariants;

  return (
    <div className="min-h-screen flex flex-col bg-ivory">
      <Navbar />
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          className="flex-1 pt-[72px]"
          variants={activeVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
      <Footer />
      <FloatingBookingCTA />
      <ScrollRestoration />
    </div>
  );
};
