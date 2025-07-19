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
  | 'snaptrade-accounts';

function App() {
  const [currentComponent, setCurrentComponent] = useState<ComponentType>('home');

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
      case 'home':
        return <Home onNavigate={component => setCurrentComponent(component as ComponentType)} />;
      case 'dashboard':
        return <AIMSDashboard />;
      case 'morning-brief':
        return <MorningBriefCard />;
      case 'income-tracker':
        return <IncomeGoalTracker />;
      case 'tasks':
        return <TasksPage />;
      case 'trade-ticket':
        return <TradeTicketForm />;
      case 'snaptrade-register':
        return (
          <SnapTradeRegistration
            onRegistrationComplete={() => {
              console.log('SnapTrade registration completed');
            }}
            onNavigateToConnection={() => setCurrentComponent('snaptrade-connect')}
          />
        );
      case 'snaptrade-connect':
        return (
          <AccountConnectionFlow
            onBack={() => setCurrentComponent('snaptrade-register')}
            onConnectionComplete={() => setCurrentComponent('snaptrade-accounts')}
          />
        );
      case 'snaptrade-accounts':
        return (
          <ConnectedAccountsList
            onAddAccount={() => setCurrentComponent('snaptrade-connect')}
            onAccountDisconnect={accountId => {
              console.log('Account disconnected:', accountId);
            }}
          />
        );
      default:
        return <Home onNavigate={component => setCurrentComponent(component as ComponentType)} />;
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
      <div className="min-h-screen">
        {/* Add Home button if not on home screen */}
        {currentComponent !== 'home' && (
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
    </QueryClientProvider>
  );
}

export default App;
