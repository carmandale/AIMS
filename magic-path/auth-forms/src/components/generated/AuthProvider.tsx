import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, CheckCircle, AlertCircle, X } from 'lucide-react';
interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role?: string;
}
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}
interface AuthProviderProps {
  children: React.ReactNode;
  apiBaseUrl?: string;
  tokenStorageKey?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
interface LoginResponse {
  token: string;
  user: User;
  expiresIn?: number;
}
interface NotificationProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose: () => void;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Notification component for auth feedback
const AuthNotification: React.FC<NotificationProps> = ({
  type,
  message,
  onClose
}) => {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Shield
  };
  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };
  const Icon = icons[type];
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return <motion.div initial={{
    opacity: 0,
    y: -50,
    scale: 0.95
  }} animate={{
    opacity: 1,
    y: 0,
    scale: 1
  }} exit={{
    opacity: 0,
    y: -50,
    scale: 0.95
  }} className="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div className={`p-4 rounded-xl border shadow-lg backdrop-blur-sm ${colors[type]}`}>
        <div className="flex items-start space-x-3">
          <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">{message}</p>
          </div>
          <button onClick={onClose} className="flex-shrink-0 text-current opacity-70 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>;
};
export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  apiBaseUrl = '/api',
  tokenStorageKey = 'auth_token',
  autoRefresh = true,
  refreshInterval = 15 * 60 * 1000 // 15 minutes
}) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true
  });
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Show notification helper
  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setNotification({
      type,
      message
    });
  }, []);

  // API call helper with error handling
  const apiCall = async <T = any,>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
    try {
      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(authState.token && {
            Authorization: `Bearer ${authState.token}`
          }),
          ...options.headers
        },
        ...options
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('API call failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  };

  // Mock API calls for demonstration
  const mockApiCall = async <T = any,>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body as string) : null;

    // Mock login
    if (endpoint === '/auth/login' && method === 'POST') {
      if (body.email === 'user@example.com' && body.password === 'password123') {
        return {
          success: true,
          data: {
            token: 'mock_jwt_token_' + Date.now(),
            user: {
              id: '1',
              email: body.email,
              name: 'John Doe',
              avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
              role: 'user'
            },
            expiresIn: 3600
          } as T
        };
      } else {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }
    }

    // Mock signup
    if (endpoint === '/auth/signup' && method === 'POST') {
      if (body.email && body.password) {
        return {
          success: true,
          data: {
            token: 'mock_jwt_token_' + Date.now(),
            user: {
              id: '2',
              email: body.email,
              name: body.name || 'New User',
              role: 'user'
            },
            expiresIn: 3600
          } as T
        };
      } else {
        return {
          success: false,
          error: 'Email and password are required'
        };
      }
    }

    // Mock token validation
    if (endpoint === '/auth/validate' && method === 'GET') {
      const token = authState.token;
      if (token && token.startsWith('mock_jwt_token_')) {
        return {
          success: true,
          data: {
            user: {
              id: '1',
              email: 'user@example.com',
              name: 'John Doe',
              role: 'user'
            }
          } as T
        };
      } else {
        return {
          success: false,
          error: 'Invalid token'
        };
      }
    }
    return {
      success: false,
      error: 'Endpoint not found'
    };
  };

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem(tokenStorageKey);
        if (!storedToken) {
          setAuthState(prev => ({
            ...prev,
            isLoading: false
          }));
          return;
        }

        // Validate token with API
        const response = await mockApiCall('/auth/validate');
        if (response.success && response.data?.user) {
          setAuthState({
            user: response.data.user,
            token: storedToken,
            isAuthenticated: true,
            isLoading: false
          });
        } else {
          // Invalid token, remove it
          localStorage.removeItem(tokenStorageKey);
          setAuthState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false
          });
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        localStorage.removeItem(tokenStorageKey);
        setAuthState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false
        });
      }
    };
    initializeAuth();
  }, [tokenStorageKey]);

  // Auto-refresh token
  useEffect(() => {
    if (!autoRefresh || !authState.isAuthenticated) return;
    const interval = setInterval(async () => {
      try {
        await refreshToken();
      } catch (error) {
        console.error('Token refresh failed:', error);
      }
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, authState.isAuthenticated, refreshInterval]);
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setAuthState(prev => ({
        ...prev,
        isLoading: true
      }));
      const response = await mockApiCall<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password
        })
      });
      if (response.success && response.data) {
        const {
          token,
          user
        } = response.data;

        // Store token
        localStorage.setItem(tokenStorageKey, token);

        // Update auth state
        setAuthState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false
        });
        showNotification('success', `Welcome back, ${user.name || user.email}!`);
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false
      }));
      const message = error instanceof Error ? error.message : 'Login failed';
      showNotification('error', message);
      throw error;
    }
  };
  const signup = async (email: string, password: string, name?: string): Promise<void> => {
    try {
      setAuthState(prev => ({
        ...prev,
        isLoading: true
      }));
      const response = await mockApiCall<LoginResponse>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          name
        })
      });
      if (response.success && response.data) {
        const {
          token,
          user
        } = response.data;

        // Store token
        localStorage.setItem(tokenStorageKey, token);

        // Update auth state
        setAuthState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false
        });
        showNotification('success', `Account created successfully! Welcome, ${user.name || user.email}!`);
      } else {
        throw new Error(response.error || 'Signup failed');
      }
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false
      }));
      const message = error instanceof Error ? error.message : 'Signup failed';
      showNotification('error', message);
      throw error;
    }
  };
  const logout = useCallback(() => {
    // Clear token from storage
    localStorage.removeItem(tokenStorageKey);

    // Reset auth state
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false
    });
    showNotification('info', 'You have been signed out successfully');
  }, [tokenStorageKey]);
  const refreshToken = async (): Promise<void> => {
    try {
      const response = await mockApiCall('/auth/refresh', {
        method: 'POST'
      });
      if (response.success && response.data?.token) {
        const {
          token,
          user
        } = response.data;
        localStorage.setItem(tokenStorageKey, token);
        setAuthState(prev => ({
          ...prev,
          token,
          user: user || prev.user
        }));
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
    }
  };
  const updateUser = useCallback((userData: Partial<User>) => {
    setAuthState(prev => ({
      ...prev,
      user: prev.user ? {
        ...prev.user,
        ...userData
      } : null
    }));
  }, []);
  const contextValue: AuthContextType = {
    ...authState,
    login,
    signup,
    logout,
    refreshToken,
    updateUser
  };
  return <AuthContext.Provider value={contextValue}>
      {children}
      
      {/* Notification Portal */}
      <AnimatePresence>
        {notification && <AuthNotification type={notification.type} message={notification.message} onClose={() => setNotification(null)} />}
      </AnimatePresence>
    </AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// HOC for components that require authentication
export const withAuth = <P extends object,>(Component: React.ComponentType<P>) => {
  return (props: P) => {
    const {
      isAuthenticated,
      isLoading
    } = useAuth();
    if (isLoading) {
      return <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
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
              Loading...
            </h2>
          </motion.div>
        </div>;
    }
    if (!isAuthenticated) {
      return <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Authentication Required
            </h2>
            <p className="text-slate-600">Please sign in to access this page.</p>
          </div>
        </div>;
    }
    return <Component {...props} />;
  };
};
export default AuthProvider;