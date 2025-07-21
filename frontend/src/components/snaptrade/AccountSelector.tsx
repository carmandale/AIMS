import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Building2, ExternalLink, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSnapTradeAccounts } from '../../hooks/useSnapTrade';
import type { SnapTradeAccount } from '../../types/snaptrade';

export interface AccountSelectorProps {
  selectedAccountId?: string;
  onAccountSelect?: (accountId: string) => void;
  onConnectAccounts?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AccountSelector: React.FC<AccountSelectorProps> = ({
  selectedAccountId,
  onAccountSelect,
  onConnectAccounts,
  size = 'md',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const { accounts = [], isLoading, error } = useSnapTradeAccounts();
  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base',
  };

  const dropdownSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  // Handle click outside and keyboard navigation
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Format account number to show last 4 digits
  const formatAccountNumber = (accountNumber: string) => {
    if (accountNumber.length <= 4) return accountNumber;
    return `•••${accountNumber.slice(-4)}`;
  };

  // Format balance with currency
  const formatBalance = (balance: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(balance);
  };

  // Get status indicator color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-500';
      case 'syncing':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-slate-500';
    }
  };

  // Loading skeleton component
  const SkeletonLoader = () => (
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center space-x-3 p-3">
          <div className="w-5 h-5 bg-slate-600 rounded animate-pulse" />
          <div className="flex-1 space-y-1">
            <div className="h-3 bg-slate-600 rounded w-24 animate-pulse" />
            <div className="h-2 bg-slate-700 rounded w-16 animate-pulse" />
          </div>
          <div className="h-3 bg-slate-600 rounded w-16 animate-pulse" />
        </div>
      ))}
    </div>
  );

  // Empty state component
  const EmptyState = () => (
    <div className="p-4 text-center">
      <Building2 className="w-8 h-8 text-slate-500 mx-auto mb-2" />
      <p className="text-slate-400 text-sm mb-3">No accounts connected</p>
      <button
        onClick={onConnectAccounts}
        className="inline-flex items-center space-x-1 text-blue-400 hover:text-blue-300 text-sm transition-colors"
      >
        <span>Connect accounts</span>
        <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  );

  // Error state
  if (error) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-700/50 rounded-lg text-red-300',
          className
        )}
      >
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">Failed to load accounts</span>
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className={cn('relative inline-flex', className)}>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'inline-flex items-center justify-between space-x-2 bg-slate-800 border border-slate-700 rounded-md text-slate-200 hover:bg-slate-750 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors',
          sizeClasses[size]
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={isLoading}
      >
        <div className="flex items-center space-x-2 min-w-0">
          <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className="truncate">
            {isLoading ? (
              <span className="inline-block w-20 h-4 bg-slate-600 rounded animate-pulse" />
            ) : selectedAccount ? (
              `${selectedAccount.institution_name} ${formatAccountNumber(selectedAccount.account_number)}`
            ) : accounts.length > 0 ? (
              'Select account'
            ) : (
              'No accounts'
            )}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-slate-400 transition-transform flex-shrink-0',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              'absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-xl z-50 min-w-64',
              dropdownSizeClasses[size]
            )}
            role="listbox"
          >
            {isLoading ? (
              <SkeletonLoader />
            ) : accounts.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="py-1 max-h-64 overflow-y-auto">
                {accounts.map(account => (
                  <button
                    key={account.id}
                    onClick={() => {
                      onAccountSelect?.(account.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-slate-700 focus:bg-slate-700 focus:outline-none transition-colors',
                      selectedAccountId === account.id && 'bg-slate-700'
                    )}
                    role="option"
                    aria-selected={selectedAccountId === account.id}
                  >
                    <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-slate-200 truncate">
                          {account.institution_name}
                        </span>
                        <span className="text-slate-400 text-xs bg-slate-700 px-1.5 py-0.5 rounded">
                          {account.account_type}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-slate-500 text-xs">
                          {formatAccountNumber(account.account_number)}
                        </span>
                        <div
                          className={cn('w-2 h-2 rounded-full', getStatusColor(account.status))}
                        />
                      </div>
                    </div>
                    <div className="text-slate-300 font-medium text-right flex-shrink-0">
                      {formatBalance(account.balance, account.currency)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
