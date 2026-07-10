import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { useEffect } from 'react';

import { clearToken, getToken } from '@/lib/auth';
import { ApiError } from '@workspace/api-client-react';

import NotFound from '@/pages/not-found';
import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import Customers from '@/pages/customers';
import ImportCustomers from '@/pages/customers-import';
import Campaigns from '@/pages/campaigns';
import NewCampaign from '@/pages/campaigns-new';
import CampaignDetail from '@/pages/campaigns-detail';
import Settings from '@/pages/settings';
import { AppLayout } from '@/components/layout/AppLayout';

const handleUnauthorized = (error: unknown) => {
  if (error instanceof ApiError && error.status === 401) {
    clearToken();
    window.location.href = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/login`;
  }
};

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleUnauthorized,
  }),
  mutationCache: new MutationCache({
    onError: handleUnauthorized,
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status === 401) return false;
        return failureCount < 2;
      },
    },
  },
});

// Auth guard — renders children only if logged in, otherwise redirects to /login.
// Must be used *inside* a <Route> so Switch sees Route directly as its children.
function AuthGuard({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!getToken() && location !== '/login') {
      setLocation('/login');
    }
  }, [location, setLocation]);

  if (!getToken()) return null;

  return (
    <AppLayout>
      {children}
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />

      {/* Root redirect */}
      <Route path="/">
        {() => {
          const [, setLocation] = useLocation();
          useEffect(() => { setLocation('/dashboard'); }, [setLocation]);
          return null;
        }}
      </Route>

      {/* All protected routes — Route is a direct child of Switch so matching works correctly */}
      <Route path="/dashboard">
        <AuthGuard><Dashboard /></AuthGuard>
      </Route>
      <Route path="/customers/import">
        <AuthGuard><ImportCustomers /></AuthGuard>
      </Route>
      <Route path="/customers">
        <AuthGuard><Customers /></AuthGuard>
      </Route>
      <Route path="/campaigns/new">
        <AuthGuard><NewCampaign /></AuthGuard>
      </Route>
      <Route path="/campaigns/:id">
        <AuthGuard><CampaignDetail /></AuthGuard>
      </Route>
      <Route path="/campaigns">
        <AuthGuard><Campaigns /></AuthGuard>
      </Route>
      <Route path="/settings">
        <AuthGuard><Settings /></AuthGuard>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;