import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from './AuthProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
  className?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallback,
  redirectTo = '/login',
  requireAuth = true,
  className
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100", className)}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Verifying access...
          </h2>
          <div className="flex items-center justify-center space-x-1">
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </motion.div>
      </div>
    );
  }

  // Not authenticated and auth is required
  if (requireAuth && !isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    // Default unauthorized component
    return (
      <div className={cn("min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4", className)}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="w-full max-w-md text-center"
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-slate-200/50 p-8">
            <motion.div 
              initial={{ scale: 0.8 }} 
              animate={{ scale: 1 }} 
              transition={{ delay: 0.2, duration: 0.5 }} 
              className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl mb-6"
            >
              <Lock className="w-8 h-8 text-red-600" />
            </motion.div>
            
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Access Restricted
            </h1>
            
            <p className="text-slate-600 text-sm mb-6">
              You need to be signed in to access this page.
            </p>

            <div className="space-y-3">
              <motion.button 
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.98 }} 
                onClick={() => {
                  window.location.href = redirectTo;
                }} 
                className="w-full py-3 px-4 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                Sign In
              </motion.button>
              
              <button 
                onClick={() => window.history.back()} 
                className="w-full py-3 px-4 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              >
                Go Back
              </button>
            </div>

            <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-amber-700 text-xs">
                  If you believe this is an error, please contact support.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Authenticated or auth not required - render children
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }} 
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Higher-order component for easier usage
export const withProtectedRoute = <P extends object,>(
  Component: React.ComponentType<P>, 
  options?: Omit<ProtectedRouteProps, 'children'>
) => {
  return (props: P) => (
    <ProtectedRoute {...options}>
      <Component {...props} />
    </ProtectedRoute>
  );
};

export default ProtectedRoute;

