import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ArrowRight, Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from './AuthProvider';
interface AuthLayoutProps {
  className?: string;
}
const AuthLayout: React.FC<AuthLayoutProps> = ({
  className
}) => {
  const { login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  const validatePassword = (password: string) => {
    return password.length >= 8;
  };
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear errors on input change
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (!isLogin && !formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (!isLogin && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        // Redirect to dashboard on successful login
        window.location.href = '/';
      } else {
        await signup(formData.email, formData.password);
        // Redirect to dashboard on successful signup
        window.location.href = '/';
      }
    } catch (error: unknown) {
      setErrors({
        general: error instanceof Error ? error.message : 'Authentication failed. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };
  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: '',
      password: '',
      confirmPassword: ''
    });
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
  };
  return <div className={cn("min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4", className)}>
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.6,
      ease: "easeOut"
    }} className="w-full max-w-md">
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/50 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div initial={{
            scale: 0.8
          }} animate={{
            scale: 1
          }} transition={{
            delay: 0.2,
            duration: 0.5
          }} className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6">
              <Shield className="w-8 h-8 text-white" />
            </motion.div>
            
            <AnimatePresence mode="wait">
              <motion.h1 key={isLogin ? 'login' : 'signup'} initial={{
              opacity: 0,
              y: -10
            }} animate={{
              opacity: 1,
              y: 0
            }} exit={{
              opacity: 0,
              y: 10
            }} className="text-2xl font-bold text-white mb-2">
                {isLogin ? 'Welcome back' : 'Create account'}
              </motion.h1>
            </AnimatePresence>
            
            <p className="text-gray-400 text-sm">
              {isLogin ? 'Sign in to your account' : 'Join us today'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input id="email" type="email" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} className={cn("w-full pl-10 pr-4 py-3 rounded-xl border transition-all duration-200", "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500", "placeholder:text-gray-500 bg-gray-700/50 text-white", errors.email ? "border-red-500/50 bg-red-900/20" : "border-gray-600 hover:border-gray-500")} placeholder="Enter your email" />
              </div>
              {errors.email && <motion.p initial={{
              opacity: 0,
              y: -5
            }} animate={{
              opacity: 1,
              y: 0
            }} className="text-red-400 text-xs">
                  {errors.email}
                </motion.p>}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input id="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={e => handleInputChange('password', e.target.value)} className={cn("w-full pl-10 pr-12 py-3 rounded-xl border transition-all duration-200", "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500", "placeholder:text-gray-500 bg-gray-700/50 text-white", errors.password ? "border-red-500/50 bg-red-900/20" : "border-gray-600 hover:border-gray-500")} placeholder="Enter your password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <motion.p initial={{
              opacity: 0,
              y: -5
            }} animate={{
              opacity: 1,
              y: 0
            }} className="text-red-400 text-xs">
                  {errors.password}
                </motion.p>}
            </div>

            {/* Confirm Password Field (Signup only) */}
            <AnimatePresence>
              {!isLogin && <motion.div initial={{
              opacity: 0,
              height: 0
            }} animate={{
              opacity: 1,
              height: 'auto'
            }} exit={{
              opacity: 0,
              height: 0
            }} className="space-y-2">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={e => handleInputChange('confirmPassword', e.target.value)} className={cn("w-full pl-10 pr-12 py-3 rounded-xl border transition-all duration-200", "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500", "placeholder:text-gray-500 bg-gray-700/50 text-white", errors.confirmPassword ? "border-red-500/50 bg-red-900/20" : "border-gray-600 hover:border-gray-500")} placeholder="Confirm your password" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors">
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <motion.p initial={{
                opacity: 0,
                y: -5
              }} animate={{
                opacity: 1,
                y: 0
              }} className="text-red-400 text-xs">
                      {errors.confirmPassword}
                    </motion.p>}
                </motion.div>}
            </AnimatePresence>

            {/* General Error */}
            {errors.general && <motion.div initial={{
            opacity: 0,
            y: -5
          }} animate={{
            opacity: 1,
            y: 0
          }} className="p-3 bg-red-900/20 border border-red-500/30 rounded-xl">
                <p className="text-red-400 text-sm">{errors.general}</p>
              </motion.div>}

            {/* Submit Button */}
            <motion.button type="submit" disabled={isLoading} whileHover={{
            scale: 1.02
          }} whileTap={{
            scale: 0.98
          }} className={cn("w-full py-3 px-4 rounded-xl font-medium transition-all duration-200", "flex items-center justify-center space-x-2", "focus:outline-none focus:ring-2 focus:ring-blue-500/50", isLoading ? "bg-gray-600 cursor-not-allowed" : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl")}>
              {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>
                  <span>{isLogin ? 'Sign in' : 'Create account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>}
            </motion.button>
          </form>

          {/* Toggle Auth Mode */}
          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button type="button" onClick={toggleAuthMode} className="ml-1 text-blue-400 font-medium hover:text-blue-300 transition-all duration-200">
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>;
};
export default AuthLayout;
