'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCartStore } from '@/stores/useCartStore';
import { useWishlistStore } from '@/stores/useWishlistStore';

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isHydrated, fetchUser } = useAuthStore();
  const { fetchCart } = useCartStore();
  const { fetchWishlist } = useWishlistStore();

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      fetchUser();
      fetchCart();
      fetchWishlist();
    }
  }, [isHydrated, isAuthenticated]);

  if (!isHydrated) {
    return (
      <div style={{ 
        height: '100vh', 
        width: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        fontWeight: 'bold',
        letterSpacing: '0.1em'
      }}>
        LOADING_SYSTEM...
      </div>
    );
  }

  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#ffffff',
              color: '#0a0a0a',
              border: '1px solid #0a0a0a',
              borderRadius: '0px',
              fontSize: '12px',
              fontWeight: 'bold',
              fontFamily: 'var(--font-mono)',
              padding: '12px 24px',
              boxShadow: 'none',
            },
            success: {
              iconTheme: {
                primary: '#0a0a0a',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#0a0a0a',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </AuthInitializer>
    </QueryClientProvider>
  );
}
