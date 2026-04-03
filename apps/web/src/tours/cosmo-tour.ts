// apps/web/src/tours/cosmo-tour.ts
import { type DriveStep } from 'driver.js';
import { waitForElement } from './utils';

async function navigateTo(path: string) {
  const { router } = await import('@/router');
  router.navigate(path);
}

/**
 * Builds the 11-step onboarding tour steps.
 * @param onTourEnd - called when the tour is finished or skipped (marks onboardingCompleted)
 */
export function buildTourSteps(onTourEnd: () => void): DriveStep[] {
  const markCompleted = async () => {
    try {
      const { api } = await import('@/lib/axios');
      await api.patch('/users/me', { onboardingCompleted: true });
    } catch {
      // non-blocking — tour still ends even if PATCH fails
    }
    onTourEnd();
  };

  return [
    // Step 1 — Welcome overlay (no element)
    {
      popover: {
        title: 'Witaj w COSMO! 💆‍♀️',
        description: 'Pokażemy Ci jak działa aplikacja. Możesz pominąć tour w dowolnej chwili.',
        nextBtnText: 'Zaczynamy →',
        doneBtnText: 'Pomiń tour',
      },
    },

    // Step 2 — Navbar booking button
    {
      element: '[data-tour="navbar-booking-btn"]',
      popover: {
        title: 'Rezerwacja wizyty',
        description: 'Tutaj zarezerwujesz wizytę w kilka kliknięć.',
        nextBtnText: 'Dalej →',
        doneBtnText: 'Pomiń tour',
        onNextClick: async () => {
          await navigateTo('/uslugi');
          await waitForElement('[data-tour="services-list"]');
          (window as any).__cosmoDriver?.moveNext();
        },
      },
    },

    // Step 3 — Services list
    {
      element: '[data-tour="services-list"]',
      popover: {
        title: 'Nasze usługi',
        description: 'Przeglądaj nasze zabiegi i sprawdź szczegóły każdego z nich.',
        nextBtnText: 'Dalej →',
        doneBtnText: 'Pomiń tour',
        onNextClick: async () => {
          await navigateTo('/rezerwacja');
          await waitForElement('[data-tour="booking-wizard"]');
          (window as any).__cosmoDriver?.moveNext();
        },
      },
    },

    // Step 4 — BookingWizard
    {
      element: '[data-tour="booking-wizard"]',
      popover: {
        title: 'Kreator rezerwacji',
        description: 'Nasz kreator poprowadzi Cię przez rezerwację krok po kroku.',
        nextBtnText: 'Dalej →',
        doneBtnText: 'Pomiń tour',
        onNextClick: async () => {
          await waitForElement('[data-tour="service-quiz"]');
          (window as any).__cosmoDriver?.moveNext();
        },
      },
    },

    // Step 5 — Service quiz (same page, conditional render — stable wrapper always in DOM)
    {
      element: '[data-tour="service-quiz"]',
      popover: {
        title: 'Quiz doboru zabiegu',
        description: 'Nie wiesz co wybrać? Quiz dobierze zabieg idealnie do Twoich potrzeb.',
        nextBtnText: 'Dalej →',
        doneBtnText: 'Pomiń tour',
        onNextClick: async () => {
          await navigateTo('/user/wizyty');
          await waitForElement('[data-tour="appointments-list"]');
          (window as any).__cosmoDriver?.moveNext();
        },
      },
    },

    // Step 6 — Appointments list
    {
      element: '[data-tour="appointments-list"]',
      popover: {
        title: 'Moje wizyty',
        description: 'Tutaj znajdziesz wszystkie swoje wizyty — nadchodzące i historyczne.',
        nextBtnText: 'Dalej →',
        doneBtnText: 'Pomiń tour',
        onNextClick: async () => {
          await navigateTo('/user/lojalnosc');
          await waitForElement('[data-tour="loyalty-points-bar"]');
          (window as any).__cosmoDriver?.moveNext();
        },
      },
    },

    // Step 7 — Loyalty points bar
    {
      element: '[data-tour="loyalty-points-bar"]',
      popover: {
        title: 'Program lojalnościowy',
        description: 'Zbieraj punkty za każdą wizytę i wymieniaj je na nagrody.',
        nextBtnText: 'Dalej →',
        doneBtnText: 'Pomiń tour',
        onNextClick: async () => {
          await navigateTo('/user/chat');
          await waitForElement('[data-tour="chat-window"]');
          (window as any).__cosmoDriver?.moveNext();
        },
      },
    },

    // Step 8 — Chat window
    {
      element: '[data-tour="chat-window"]',
      popover: {
        title: 'Czat z salonem',
        description: 'Napisz do nas bezpośrednio — odpowiemy najszybciej jak możemy.',
        nextBtnText: 'Dalej →',
        doneBtnText: 'Pomiń tour',
        onNextClick: async () => {
          await navigateTo('/user/dziennik');
          await waitForElement('[data-tour="skin-journal"]');
          (window as any).__cosmoDriver?.moveNext();
        },
      },
    },

    // Step 9 — Skin journal
    {
      element: '[data-tour="skin-journal"]',
      popover: {
        title: 'Dziennik skóry',
        description: 'Prowadź swój osobisty dziennik skóry i śledź postępy leczenia.',
        nextBtnText: 'Dalej →',
        doneBtnText: 'Pomiń tour',
        onNextClick: async () => {
          await navigateTo('/user/profil');
          await waitForElement('[data-tour="profile-form"]');
          (window as any).__cosmoDriver?.moveNext();
        },
      },
    },

    // Step 10 — Profile form
    {
      element: '[data-tour="profile-form"]',
      popover: {
        title: 'Mój profil',
        description: 'Uzupełnij swój profil i zarządzaj ustawieniami konta.',
        nextBtnText: 'Dalej →',
        doneBtnText: 'Pomiń tour',
        onNextClick: async () => {
          await markCompleted();
        },
      },
    },

    // Step 11 — Finish overlay (no element)
    {
      popover: {
        title: 'Gotowe! 🎉',
        description: 'To wszystko! Zapraszamy na pierwszą wizytę. Możesz wrócić do tego przewodnika w ustawieniach profilu.',
        nextBtnText: 'Zacznij korzystać →',
        doneBtnText: 'Zamknij',
        onNextClick: async () => {
          await markCompleted();
        },
      },
    },
  ];
}
