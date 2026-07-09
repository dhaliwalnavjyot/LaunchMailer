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

function ProtectedRoute({ component: Component, path }: { component: any, path: string }) {
  const [location, setLocation] = useLocation();
  
  useEffect(() => {
    if (!getToken() && location !== '/login') {
      setLocation('/login');
    }
  }, [location, setLocation]);

  if (!getToken()) return null;

  return (
    <Route path={path}>
      <AppLayout>
        <Component />
      </AppLayout>
    </Route>
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

      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/customers" component={Customers} />
      <ProtectedRoute path="/customers/import" component={ImportCustomers} />
      <ProtectedRoute path="/campaigns" component={Campaigns} />
      <ProtectedRoute path="/campaigns/new" component={NewCampaign} />
      <ProtectedRoute path="/campaigns/:id" component={CampaignDetail} />
      <ProtectedRoute path="/settings" component={Settings} />
      
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