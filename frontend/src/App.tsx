import { useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Container, Theme } from './settings/types';
import { Home } from './components/Home';
import AIMSDashboard from './components/generated/AIMSDashboard';
import { MorningBriefCard } from './components/MorningBriefCard';
import { IncomeGoalTracker } from './components/IncomeGoalTracker';
import { TasksPage } from './components/TasksPage';
import { TradeTicketForm } from './components/TradeTicketForm';
import {
  SnapTradeRegistration,
  AccountConnectionFlow,
  ConnectedAccountsList,
} from './components/snaptrade';
import { Toaster } from 'sonner';
import { AuthProvider } from './components/auth/AuthProvider';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AuthLayout from './components/auth/AuthLayout';

const theme: Theme = 'dark';
const container: Container = 'none';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Component types for routing
type ComponentType =
  | 'home'
  | 'dashboard'
  | 'morning-brief'
  | 'income-tracker'
  | 'tasks'
  | 'trade-ticket'
  | 'snaptrade-register'
  | 'snaptrade-connect'
  | 'snaptrade-accounts'
  | 'login';

function App() {
  // Check URL for routing
  const getInitialComponent = (): ComponentType => {
    const path = window.location.pathname;
    if (path === '/login') return 'login';
    return 'home';
  };

  const [currentComponent, setCurrentComponent] = useState<ComponentType>(getInitialComponent());

  function setTheme(theme: Theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  setTheme(theme);

  const generatedComponent = useMemo(() => {
    switch (currentComponent) {
      case 'login':
        return <AuthLayout />;
      case 'home':
        return (
          <ProtectedRoute>
            <Home onNavigate={component => setCurrentComponent(component as ComponentType)} />
          </ProtectedRoute>
        );
      case 'dashboard':
        return (
          <ProtectedRoute>
            <AIMSDashboard />
          </ProtectedRoute>
        );
      case 'morning-brief':
        return (
          <ProtectedRoute>
            <MorningBriefCard />
          </ProtectedRoute>
        );
      case 'income-tracker':
        return (
          <ProtectedRoute>
            <IncomeGoalTracker />
          </ProtectedRoute>
        );
      case 'tasks':
        return (
          <ProtectedRoute>
            <TasksPage />
          </ProtectedRoute>
        );
      case 'trade-ticket':
        return (
          <ProtectedRoute>
            <TradeTicketForm />
          </ProtectedRoute>
        );
      case 'snaptrade-register':
        return (
          <ProtectedRoute>
            <SnapTradeRegistration
              onRegistrationComplete={() => {
                console.log('SnapTrade registration completed');
              }}
              onNavigateToConnection={() => setCurrentComponent('snaptrade-connect')}
            />
          </ProtectedRoute>
        );
      case 'snaptrade-connect':
        return (
          <ProtectedRoute>
            <AccountConnectionFlow
              onBack={() => setCurrentComponent('snaptrade-register')}
              onConnectionComplete={() => setCurrentComponent('snaptrade-accounts')}
            />
          </ProtectedRoute>
        );
      case 'snaptrade-accounts':
        return (
          <ProtectedRoute>
            <ConnectedAccountsList
              onAddAccount={() => setCurrentComponent('snaptrade-connect')}
              onAccountDisconnect={accountId => {
                console.log('Account disconnected:', accountId);
              }}
            />
          </ProtectedRoute>
        );
      default:
        return (
          <ProtectedRoute>
            <Home onNavigate={component => setCurrentComponent(component as ComponentType)} />
          </ProtectedRoute>
        );
    }
  }, [currentComponent]);

  const renderContent = () => {
    if (container === 'centered') {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center">
          {generatedComponent}
        </div>
      );
    } else {
      return generatedComponent;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="min-h-screen">
          {/* Add Home button if not on home screen and not on login */}
          {currentComponent !== 'home' && currentComponent !== 'login' && (
            <button
              onClick={() => setCurrentComponent('home')}
              className="fixed top-4 left-4 z-50 px-4 py-2 bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700/80 transition-colors"
            >
              ← Home
            </button>
          )}

          {/* Content */}
          {renderContent()}
        </div>
        <Toaster richColors position="top-right" />
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
