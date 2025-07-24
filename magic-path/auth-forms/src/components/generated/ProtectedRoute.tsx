import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
  className?: string;
}
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
  token?: string;
}
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallback,
  redirectTo = '/login',
  requireAuth = true,
  className
}) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true
  });

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setAuthState({
            isAuthenticated: false,
            isLoading: false
          });
          return;
        }

        // Validate token with API (mock implementation)
        const isValidToken = await validateToken(token);
        if (isValidToken) {
          // Get user data from token or API
          const userData = await getUserData(token);
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            user: userData,
            token
          });
        } else {
          // Invalid token, remove it
          localStorage.removeItem('auth_token');
          setAuthState({
            isAuthenticated: false,
            isLoading: false
          });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('auth_token');
        setAuthState({
          isAuthenticated: false,
          isLoading: false
        });
      }
    };
    checkAuth();
  }, []);

  // Mock token validation function
  const validateToken = async (token: string): Promise<boolean> => {
    // Simulate API call
    return new Promise(resolve => {
      setTimeout(() => {
        // Mock validation - in real app, this would be an API call
        resolve(token === 'mock_jwt_token' || token.startsWith('valid_'));
      }, 500);
    });
  };

  // Mock user data fetching
  const getUserData = async (token: string) => {
    // Simulate API call to get user data
    return new Promise<{
      id: string;
      email: string;
      name?: string;
    }>(resolve => {
      setTimeout(() => {
        resolve({
          id: '1',
          email: 'user@example.com',
          name: 'John Doe'
        });
      }, 200);
    });
  };

  // Loading state
  if (authState.isLoading) {
    return <div className={cn("min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100", className)}>
        <motion.div initial={{
        opacity: 0,
        scale: 0.9
      }} animate={{
        opacity: 1,
        scale: 1
      }} className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Verifying access...
          </h2>
          <div className="flex items-center justify-center space-x-1">
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{
            animationDelay: '0ms'
          }} />
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{
            animationDelay: '150ms'
          }} />
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{
            animationDelay: '300ms'
          }} />
          </div>
        </motion.div>
      </div>;
  }

  // Not authenticated and auth is required
  if (requireAuth && !authState.isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    // Default unauthorized component
    return <div className={cn("min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4", className)}>
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="w-full max-w-md text-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-slate-200/50 p-8">
            <motion.div initial={{
            scale: 0.8
          }} animate={{
            scale: 1
          }} transition={{
            delay: 0.2,
            duration: 0.5
          }} className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl mb-6">
              <Lock className="w-8 h-8 text-red-600" />
            </motion.div>
            
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Access Restricted
            </h1>
            
            <p className="text-slate-600 text-sm mb-6">
              You need to be signed in to access this page.
            </p>

            <div className="space-y-3">
              <motion.button whileHover={{
              scale: 1.02
            }} whileTap={{
              scale: 0.98
            }} onClick={() => {
              // In a real app, this would use a router
              window.location.href = redirectTo;
            }} className="w-full py-3 px-4 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900/20">
                Sign In
              </motion.button>
              
              <button onClick={() => window.history.back()} className="w-full py-3 px-4 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900/20">
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
      </div>;
  }

  // Authenticated or auth not required - render children
  return <motion.div initial={{
    opacity: 0
  }} animate={{
    opacity: 1
  }} transition={{
    duration: 0.3
  }} className={className}>
      {children}
    </motion.div>;
};

// Higher-order component for easier usage
export const withProtectedRoute = <P extends object,>(Component: React.ComponentType<P>, options?: Omit<ProtectedRouteProps, 'children'>) => {
  return (props: P) => <ProtectedRoute {...options}>
      <Component {...props} />
    </ProtectedRoute>;
};

// Hook to access auth state within protected components
export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true
  });
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setAuthState({
          isAuthenticated: false,
          isLoading: false
        });
        return;
      }

      // Mock validation
      const isValid = token === 'mock_jwt_token' || token.startsWith('valid_');
      setAuthState({
        isAuthenticated: isValid,
        isLoading: false,
        token: isValid ? token : undefined,
        user: isValid ? {
          id: '1',
          email: 'user@example.com',
          name: 'John Doe'
        } : undefined
      });
    };
    checkAuth();
  }, []);
  const logout = () => {
    localStorage.removeItem('auth_token');
    setAuthState({
      isAuthenticated: false,
      isLoading: false
    });
    window.location.href = '/login';
  };
  const login = (token: string, userData?: any) => {
    localStorage.setItem('auth_token', token);
    setAuthState({
      isAuthenticated: true,
      isLoading: false,
      token,
      user: userData
    });
  };
  return {
    ...authState,
    logout,
    login
  };
};
export default ProtectedRoute;