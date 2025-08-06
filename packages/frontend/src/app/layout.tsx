'use client';

import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from 'react-query';
import { SnackbarProvider } from 'notistack';
import { AuthContext, useAuthProvider } from '@/hooks/useAuth';
import { lightTheme } from '@/lib/theme';
import '@/lib/amplify';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const auth = useAuthProvider();

  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>EduRetain - Plataforma de Retención Estudiantil</title>
        <meta name="description" content="Plataforma escalable para detección de deserción y comunicación educativa" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <ThemeProvider theme={lightTheme}>
          <CssBaseline />
          <QueryClientProvider client={queryClient}>
            <SnackbarProvider
              maxSnack={3}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              preventDuplicate
            >
              <AuthContext.Provider value={auth}>
                {children}
              </AuthContext.Provider>
            </SnackbarProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}