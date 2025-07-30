import React, { useEffect, useState } from 'react';
import { useSnapTradeStatus } from '../../hooks/useSnapTrade';
import { SnapTradeRegistration } from './SnapTradeRegistration';
import { AccountConnectionFlow } from './AccountConnectionFlow';
import { ConnectedAccountsList } from './ConnectedAccountsList';
import { RefreshCw } from 'lucide-react';

interface SnapTradeSetupProps {
  onBack?: () => void;
}

export function SnapTradeSetup({ onBack }: SnapTradeSetupProps) {
  const { isRegistered, hasConnectedAccounts, isLoading, error } = useSnapTradeStatus();
  const [currentView, setCurrentView] = useState<'loading' | 'register' | 'connect' | 'accounts'>('loading');
  const [manuallySetView, setManuallySetView] = useState<string | null>(null);
  
  // Determine which view to show based on registration and connection status
  useEffect(() => {
    // Don't override manually set views
    if (manuallySetView) return;
    
    if (isLoading) {
      setCurrentView('loading');
    } else if (!isRegistered) {
      setCurrentView('register');
    } else if (hasConnectedAccounts) {
      setCurrentView('accounts');
    } else {
      // Registered but no accounts - show connection flow
      setCurrentView('connect');
    }
  }, [isRegistered, hasConnectedAccounts, isLoading, manuallySetView]);
  
  // Loading state
  if (currentView === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-blue-500/20 p-4 rounded-full w-16 h-16 mx-auto mb-4">
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Checking Registration Status</h3>
          <p className="text-slate-300">Please wait...</p>
        </div>
      </div>
    );
  }
  
  // Registration view
  if (currentView === 'register') {
    return (
      <SnapTradeRegistration
        onRegistrationComplete={() => {
          // After registration, move to connection flow
          setCurrentView('connect');
        }}
        onNavigateToConnection={() => {
          // This shouldn't be called anymore, but handle it just in case
          setCurrentView('connect');
        }}
      />
    );
  }
  
  // Connection flow view
  if (currentView === 'connect') {
    return (
      <AccountConnectionFlow
        onBack={onBack}
        onConnectionComplete={() => {
          // After connection, show accounts list
          setCurrentView('accounts');
        }}
      />
    );
  }
  
  // Accounts list view
  return (
    <ConnectedAccountsList
      onAddAccount={() => {
        // When adding another account, go to connection flow (NOT registration)
        setCurrentView('connect');
      }}
      onAccountDisconnect={(accountId) => {
        console.log('Account disconnected:', accountId);
        // Could refresh the status here if needed
      }}
    />
  );
}