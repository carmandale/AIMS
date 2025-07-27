import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
interface SignupFormProps {
  onSubmit: (email: string, password: string, name?: string) => Promise<void>;
  isLoading?: boolean;
  error?: string;
  className?: string;
}
const SignupForm: React.FC<SignupFormProps> = ({
  onSubmit,
  isLoading = false,
  error,
  className,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [acceptTerms, setAcceptTerms] = useState(false);
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  const validatePassword = (password: string) => {
    return password.length >= 8;
  };
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear field errors on input change
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
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
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!acceptTerms) {
      newErrors.terms = 'You must accept the terms and conditions';
    }
    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || isLoading) return;
    try {
      await onSubmit(formData.email, formData.password, formData.name);
    } catch (err) {
      // Error handling is managed by parent component
    }
  };
  const passwordStrength = getPasswordStrength(formData.password);
  const strengthColors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-blue-500',
    'bg-green-500',
  ];
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {/* Name Field */}
      <div className="space-y-2">
        <label htmlFor="signup-name" className="block text-sm font-medium text-gray-300">
          Full name
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            id="signup-name"
            type="text"
            value={formData.name}
            onChange={e => handleInputChange('name', e.target.value)}
            disabled={isLoading}
            className={cn(
              'w-full pl-10 pr-4 py-3 rounded-xl border transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
              'placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed',
              'bg-gray-700/50 text-white',
              fieldErrors.name
                ? 'border-red-500/50 bg-red-900/20'
                : 'border-gray-600 hover:border-gray-500 focus:bg-gray-700/70'
            )}
            placeholder="Enter your full name"
            autoComplete="name"
          />
        </div>
        {fieldErrors.name && (
          <motion.p
            initial={{
              opacity: 0,
              y: -5,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="text-red-400 text-xs flex items-center space-x-1"
          >
            <span>{fieldErrors.name}</span>
          </motion.p>
        )}
      </div>

      {/* Email Field */}
      <div className="space-y-2">
        <label htmlFor="signup-email" className="block text-sm font-medium text-gray-300">
          Email address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            id="signup-email"
            type="email"
            value={formData.email}
            onChange={e => handleInputChange('email', e.target.value)}
            disabled={isLoading}
            className={cn(
              'w-full pl-10 pr-4 py-3 rounded-xl border transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
              'placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed',
              'bg-gray-700/50 text-white',
              fieldErrors.email
                ? 'border-red-500/50 bg-red-900/20'
                : 'border-gray-600 hover:border-gray-500 focus:bg-gray-700/70'
            )}
            placeholder="Enter your email"
            autoComplete="email"
          />
        </div>
        {fieldErrors.email && (
          <motion.p
            initial={{
              opacity: 0,
              y: -5,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="text-red-400 text-xs flex items-center space-x-1"
          >
            <span>{fieldErrors.email}</span>
          </motion.p>
        )}
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <label htmlFor="signup-password" className="block text-sm font-medium text-gray-300">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={e => handleInputChange('password', e.target.value)}
            disabled={isLoading}
            className={cn(
              'w-full pl-10 pr-12 py-3 rounded-xl border transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
              'placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed',
              'bg-gray-700/50 text-white',
              fieldErrors.password
                ? 'border-red-500/50 bg-red-900/20'
                : 'border-gray-600 hover:border-gray-500 focus:bg-gray-700/70'
            )}
            placeholder="Create a password"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {/* Password Strength Indicator */}
        {formData.password && (
          <div className="space-y-2">
            <div className="flex space-x-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-all duration-300',
                    i < passwordStrength ? strengthColors[passwordStrength - 1] : 'bg-gray-600'
                  )}
                />
              ))}
            </div>
            <p className="text-xs text-gray-400">
              Password strength:{' '}
              <span
                className={cn(
                  'font-medium',
                  passwordStrength < 2
                    ? 'text-red-400'
                    : passwordStrength < 4
                      ? 'text-yellow-400'
                      : 'text-green-400'
                )}
              >
                {strengthLabels[passwordStrength - 1] || 'Very Weak'}
              </span>
            </p>
          </div>
        )}

        {fieldErrors.password && (
          <motion.p
            initial={{
              opacity: 0,
              y: -5,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="text-red-400 text-xs flex items-center space-x-1"
          >
            <span>{fieldErrors.password}</span>
          </motion.p>
        )}
      </div>

      {/* Confirm Password Field */}
      <div className="space-y-2">
        <label
          htmlFor="signup-confirm-password"
          className="block text-sm font-medium text-gray-300"
        >
          Confirm password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            id="signup-confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={e => handleInputChange('confirmPassword', e.target.value)}
            disabled={isLoading}
            className={cn(
              'w-full pl-10 pr-12 py-3 rounded-xl border transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
              'placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed',
              'bg-gray-700/50 text-white',
              fieldErrors.confirmPassword
                ? 'border-red-500/50 bg-red-900/20'
                : formData.confirmPassword && formData.password === formData.confirmPassword
                  ? 'border-green-500/50 bg-green-900/20'
                  : 'border-gray-600 hover:border-gray-500 focus:bg-gray-700/70'
            )}
            placeholder="Confirm your password"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            disabled={isLoading}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
          {formData.confirmPassword && formData.password === formData.confirmPassword && (
            <Check className="absolute right-10 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-400" />
          )}
        </div>
        {fieldErrors.confirmPassword && (
          <motion.p
            initial={{
              opacity: 0,
              y: -5,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="text-red-400 text-xs flex items-center space-x-1"
          >
            <span>{fieldErrors.confirmPassword}</span>
          </motion.p>
        )}
      </div>

      {/* Terms and Conditions */}
      <div className="space-y-2">
        <div className="flex items-start space-x-3">
          <input
            id="accept-terms"
            type="checkbox"
            checked={acceptTerms}
            onChange={e => setAcceptTerms(e.target.checked)}
            disabled={isLoading}
            className="w-4 h-4 mt-0.5 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500/50 focus:ring-2 disabled:opacity-50"
          />
          <label htmlFor="accept-terms" className="text-sm text-gray-400 leading-relaxed">
            I agree to the{' '}
            <button
              type="button"
              className="text-blue-400 font-medium hover:text-blue-300 transition-all duration-200"
            >
              Terms of Service
            </button>{' '}
            and{' '}
            <button
              type="button"
              className="text-blue-400 font-medium hover:text-blue-300 transition-all duration-200"
            >
              Privacy Policy
            </button>
          </label>
        </div>
        {fieldErrors.terms && (
          <motion.p
            initial={{
              opacity: 0,
              y: -5,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="text-red-400 text-xs flex items-center space-x-1"
          >
            <span>{fieldErrors.terms}</span>
          </motion.p>
        )}
      </div>

      {/* General Error */}
      {error && (
        <motion.div
          initial={{
            opacity: 0,
            y: -5,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="p-3 bg-red-900/20 border border-red-500/30 rounded-xl"
        >
          <p className="text-red-400 text-sm">{error}</p>
        </motion.div>
      )}

      {/* Submit Button */}
      <motion.button
        type="submit"
        disabled={isLoading}
        whileHover={
          !isLoading
            ? {
                scale: 1.02,
              }
            : {}
        }
        whileTap={
          !isLoading
            ? {
                scale: 0.98,
              }
            : {}
        }
        className={cn(
          'w-full py-3 px-4 rounded-xl font-medium transition-all duration-200',
          'flex items-center justify-center space-x-2',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
          isLoading
            ? 'bg-gray-600 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
        )}
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Creating account...</span>
          </>
        ) : (
          <>
            <span>Create account</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </motion.button>

      {/* Social Signup Options */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-600" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-gray-800 text-gray-400">Or sign up with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={isLoading}
          className="flex items-center justify-center px-4 py-2 border border-gray-600 rounded-xl text-sm font-medium text-gray-300 bg-gray-700/50 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </button>
        <button
          type="button"
          disabled={isLoading}
          className="flex items-center justify-center px-4 py-2 border border-gray-600 rounded-xl text-sm font-medium text-gray-300 bg-gray-700/50 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          GitHub
        </button>
      </div>
    </form>
  );
};
export default SignupForm;
