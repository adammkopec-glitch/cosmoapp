// filepath: apps/web/src/App.tsx
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'sonner';
import { router } from './router';
import { queryClient } from './lib/queryClient';
import { useAuthStore } from './store/auth.store';
import { useEffect } from 'react';
import { api } from './lib/axios';
import { getSocket } from './lib/socket';

function App() {
  const { hydrate, setAccessToken, logout } = useAuthStore();

  // Initial token refresh on app start
  useEffect(() => {
    api.post('/auth/refresh')
      .then((res) => {
        setAccessToken(res.data.data.accessToken);
        // user is hydrated from localStorage — no need to set here
      })
      .catch(() => {
        // Don't logout here — keep localStorage state intact.
        // If the token is truly expired, the axios interceptor will logout
        // when the next authenticated API call fails.
      })
      .finally(() => {
        hydrate();
      });
  }, []);

  // PWA: refresh token and reconnect socket when app becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;

      const { accessToken } = useAuthStore.getState();
      if (!accessToken) return;

      api.post('/auth/refresh')
        .then((res) => {
          setAccessToken(res.data.data.accessToken);
          // Reconnect socket with fresh token
          const sock = getSocket();
          sock.auth = { token: res.data.data.accessToken };
          if (!sock.connected) sock.connect();
        })
        .catch(() => {
          logout();
        });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors />
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
