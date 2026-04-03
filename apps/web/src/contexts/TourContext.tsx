// apps/web/src/contexts/TourContext.tsx
import { createContext, useContext, useRef, useState, useCallback, ReactNode } from 'react';
import { driver, type Config } from 'driver.js';
import 'driver.js/dist/driver.css';

interface TourContextValue {
  startTour: () => void;
  stopTour: () => void;
  isActive: boolean;
}

const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  const stopTour = useCallback(() => {
    driverRef.current?.destroy();
    driverRef.current = null;
    delete (window as any).__cosmoDriver;
    setIsActive(false);
  }, []);

  const startTour = useCallback(() => {
    if (driverRef.current) return; // already running
    import('../tours/cosmo-tour').then(({ buildTourSteps }) => {
      const steps = buildTourSteps(stopTour);

      const config: Config = {
        animate: true,
        showProgress: true,
        allowClose: true,
        overlayOpacity: 0.6,
        stagePadding: 8,
        stageRadius: 8,
        popoverClass: 'cosmo-tour-popover',
        onDestroyed: () => {
          // Mark onboarding completed when user skips or finishes tour
          import('@/lib/axios').then(({ api }) => {
            api.patch('/users/me', { onboardingCompleted: true }).catch(() => {});
          });
          delete (window as any).__cosmoDriver;
          driverRef.current = null;
          setIsActive(false);
        },
        steps,
      };

      const d = driver(config);
      driverRef.current = d;
      (window as any).__cosmoDriver = d;
      setIsActive(true);
      d.drive();
    });
  }, [stopTour]);

  return (
    <TourContext.Provider value={{ startTour, stopTour, isActive }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTourContext() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTourContext must be used inside TourProvider');
  return ctx;
}
