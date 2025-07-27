import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from './contexts/AuthContext';
import AuthLayout from './components/auth/AuthLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
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

function App() {
  function setTheme(theme: Theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  // Set initial theme
  setTheme(theme);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-background text-foreground">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<AuthLayout />} />
              
              {/* Protected Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              } />
              
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <AIMSDashboard onNavigate={() => {}} />
                </ProtectedRoute>
              } />
              
              <Route path="/morning-brief" element={
                <ProtectedRoute>
                  <div className="container mx-auto py-8">
                    <MorningBriefCard />
                  </div>
                </ProtectedRoute>
              } />
              
              <Route path="/income-tracker" element={
                <ProtectedRoute>
                  <div className="container mx-auto py-8">
                    <IncomeGoalTracker />
                  </div>
                </ProtectedRoute>
              } />
              
              <Route path="/tasks" element={
                <ProtectedRoute>
                  <TasksPage />
                </ProtectedRoute>
              } />
              
              <Route path="/trade-ticket" element={
                <ProtectedRoute>
                  <div className="container mx-auto py-8">
                    <TradeTicketForm
                      onSubmit={ticket => console.log('Trade ticket submitted:', ticket)}
                      onCancel={() => console.log('Trade ticket cancelled')}
                    />
                  </div>
                </ProtectedRoute>
              } />
              
              <Route path="/snaptrade/register" element={
                <ProtectedRoute>
                  <div className="container mx-auto py-8">
                    <SnapTradeRegistration
                      onConnectionReady={url => window.open(url, '_blank')}
                    />
                  </div>
                </ProtectedRoute>
              } />
              
              <Route path="/snaptrade/connect" element={
                <ProtectedRoute>
                  <div className="container mx-auto py-8">
                    <AccountConnectionFlow />
                  </div>
                </ProtectedRoute>
              } />
              
              <Route path="/snaptrade/accounts" element={
                <ProtectedRoute>
                  <div className="container mx-auto py-8">
                    <ConnectedAccountsList />
                  </div>
                </ProtectedRoute>
              } />
              
              {/* Catch all - redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            
            <Toaster theme={theme} richColors />
          </div>
        </Router>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;