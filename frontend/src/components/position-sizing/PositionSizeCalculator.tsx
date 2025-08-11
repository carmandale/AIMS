import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calculator, TrendingUp, Shield, Activity, AlertTriangle, Copy } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api-client';
import {
  PositionSizeCalculatorProps,
  PositionSizeCalculationData,
  PositionSizeCalculationResult,
  SizingMethod,
  ValidationErrors,
  MethodInfo,
} from '../../types/position-sizing';
import { RiskRewardChart } from './RiskRewardChart';

// Default form data
const getDefaultFormData = (): PositionSizeCalculationData => ({
  method: 'fixed_risk',
  account_value: 100000,
  risk_percentage: 0.02, // 2%
  entry_price: 0,
  stop_loss: 0,
  target_price: undefined,
  win_rate: 0.6,
  avg_win_loss_ratio: 2.0,
  confidence_level: 1.0,
  atr: undefined,
  atr_multiplier: 2.0,
  symbol: 'AAPL',
});

export const PositionSizeCalculator: React.FC<PositionSizeCalculatorProps> = ({
  isOpen,
  onClose,
  onCopyToTrade,
  initialData,
}) => {
  // State
  const [formData, setFormData] = useState<PositionSizeCalculationData>(() => ({
    ...getDefaultFormData(),
    ...initialData,
  }));
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [result, setResult] = useState<PositionSizeCalculationResult | null>(null);

  // Load available methods
  const { data: methodsData } = useQuery({
    queryKey: ['position-sizing-methods'],
    queryFn: async () => {
      const response = await api.positionSizing.getMethods();
      return response.data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Calculate position size mutation
  const calculateMutation = useMutation({
    mutationFn: async (data: PositionSizeCalculationData) => {
      const response = await api.positionSizing.calculate({
        method: data.method,
        account_value: data.account_value,
        risk_percentage: data.risk_percentage,
        entry_price: data.entry_price,
        stop_loss: data.stop_loss,
        target_price: data.target_price,
        win_rate: data.win_rate,
        avg_win_loss_ratio: data.avg_win_loss_ratio,
        confidence_level: data.confidence_level,
        atr: data.atr,
        atr_multiplier: data.atr_multiplier,
      });
      return response.data;
    },
    onSuccess: data => {
      const calculationResult: PositionSizeCalculationResult = {
        ...data,
        entry_price: formData.entry_price,
        stop_loss: formData.stop_loss,
        target_price: formData.target_price,
        symbol: formData.symbol,
      };
      setResult(calculationResult);
      setErrors({});
    },
    onError: (error: {
      response?: {
        status: number;
        data: { detail: string | Array<{ loc?: string[]; msg: string }> };
      };
    }) => {
      console.error('Calculation error:', error);
      setResult(null);

      // Handle validation errors
      if (error.response?.status === 422) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          toast.error(detail);
        } else if (Array.isArray(detail)) {
          // Pydantic validation errors
          const newErrors: ValidationErrors = {};
          detail.forEach((err: { loc?: string[]; msg: string }) => {
            const field = err.loc?.[err.loc.length - 1];
            if (field) {
              newErrors[field] = err.msg;
            }
          });
          setErrors(newErrors);
        }
      } else {
        toast.error('Failed to calculate position size');
      }
    },
  });

  // Form validation
  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};

    // Common validations
    if (!formData.account_value || formData.account_value <= 0) {
      newErrors.account_value = 'Account value must be greater than 0';
    }

    // Method-specific validations
    if (formData.method === 'fixed_risk') {
      if (!formData.risk_percentage || formData.risk_percentage <= 0) {
        newErrors.risk_percentage = 'Risk percentage is required';
      }
      if (!formData.entry_price || formData.entry_price <= 0) {
        newErrors.entry_price = 'Entry price is required';
      }
      if (!formData.stop_loss || formData.stop_loss <= 0) {
        newErrors.stop_loss = 'Stop loss is required';
      }
      if (
        formData.entry_price &&
        formData.stop_loss &&
        formData.stop_loss >= formData.entry_price
      ) {
        newErrors.stop_loss = 'Stop loss must be below entry price';
      }
    } else if (formData.method === 'kelly') {
      if (!formData.win_rate || formData.win_rate <= 0 || formData.win_rate >= 1) {
        newErrors.win_rate = 'Win rate must be between 0 and 1';
      }
      if (!formData.avg_win_loss_ratio || formData.avg_win_loss_ratio <= 0) {
        newErrors.avg_win_loss_ratio = 'Win/loss ratio must be greater than 0';
      }
    } else if (formData.method === 'volatility_based') {
      if (!formData.risk_percentage || formData.risk_percentage <= 0) {
        newErrors.risk_percentage = 'Risk percentage is required';
      }
      if (!formData.entry_price || formData.entry_price <= 0) {
        newErrors.entry_price = 'Entry price is required';
      }
      if (!formData.atr || formData.atr <= 0) {
        newErrors.atr = 'ATR is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Auto-calculate when form data changes
  useEffect(() => {
    const isValid = validateForm();
    if (isValid) {
      const timer = setTimeout(() => {
        calculateMutation.mutate(formData);
      }, 500); // Debounce calculation

      return () => clearTimeout(timer);
    } else {
      setResult(null);
    }
  }, [formData, calculateMutation]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({ ...getDefaultFormData(), ...initialData });
    }
  }, [isOpen, initialData]);

  // Handle input changes
  const handleInputChange = (
    field: keyof PositionSizeCalculationData,
    value: string | number | undefined
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle method change
  const handleMethodChange = (method: SizingMethod) => {
    setFormData(prev => ({ ...prev, method }));
    setResult(null);
    setErrors({});
  };

  // Handle copy to trade
  const handleCopyToTrade = () => {
    if (result && onCopyToTrade) {
      onCopyToTrade(result);
      toast.success('Position size copied to trade ticket');
      onClose();
    }
  };

  // Handle close modal
  const handleClose = useCallback(() => {
    setResult(null);
    setErrors({});
    onClose();
  }, [onClose]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calculator className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Position Size Calculator</h2>
                <p className="text-sm text-gray-500">
                  Determine optimal position size based on risk parameters
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Form */}
              <div className="space-y-6">
                {/* Method Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Calculation Method
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      {
                        id: 'fixed_risk',
                        name: 'Fixed Risk',
                        icon: Shield,
                        desc: 'Size based on fixed risk amount',
                      },
                      {
                        id: 'kelly',
                        name: 'Kelly Criterion',
                        icon: TrendingUp,
                        desc: 'Optimal size based on win rate',
                      },
                      {
                        id: 'volatility_based',
                        name: 'Volatility-Based',
                        icon: Activity,
                        desc: 'Size based on ATR volatility',
                      },
                    ].map(method => (
                      <button
                        key={method.id}
                        onClick={() => handleMethodChange(method.id as SizingMethod)}
                        className={cn(
                          'flex items-center space-x-3 p-3 rounded-lg border-2 text-left transition-colors',
                          formData.method === method.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        )}
                      >
                        <method.icon className="w-5 h-5 text-gray-600" />
                        <div>
                          <div className="font-medium text-gray-900">{method.name}</div>
                          <div className="text-sm text-gray-500">{method.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  {/* Account Value - Always shown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Value ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={formData.account_value}
                      onChange={e =>
                        handleInputChange('account_value', parseFloat(e.target.value) || 0)
                      }
                      className={cn(
                        'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                        errors.account_value ? 'border-red-500' : 'border-gray-300'
                      )}
                      placeholder="100000"
                    />
                    {errors.account_value && (
                      <p className="mt-1 text-sm text-red-600">{errors.account_value}</p>
                    )}
                  </div>

                  {/* Method-specific fields */}
                  {formData.method === 'fixed_risk' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Risk Per Trade (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={(formData.risk_percentage || 0) * 100}
                          onChange={e =>
                            handleInputChange(
                              'risk_percentage',
                              (parseFloat(e.target.value) || 0) / 100
                            )
                          }
                          className={cn(
                            'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                            errors.risk_percentage ? 'border-red-500' : 'border-gray-300'
                          )}
                          placeholder="2"
                        />
                        {errors.risk_percentage && (
                          <p className="mt-1 text-sm text-red-600">{errors.risk_percentage}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Entry Price ($)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.entry_price}
                          onChange={e =>
                            handleInputChange('entry_price', parseFloat(e.target.value) || 0)
                          }
                          className={cn(
                            'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                            errors.entry_price ? 'border-red-500' : 'border-gray-300'
                          )}
                          placeholder="150.00"
                        />
                        {errors.entry_price && (
                          <p className="mt-1 text-sm text-red-600">{errors.entry_price}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Stop Loss ($)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.stop_loss}
                          onChange={e =>
                            handleInputChange('stop_loss', parseFloat(e.target.value) || 0)
                          }
                          className={cn(
                            'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                            errors.stop_loss ? 'border-red-500' : 'border-gray-300'
                          )}
                          placeholder="145.00"
                        />
                        {errors.stop_loss && (
                          <p className="mt-1 text-sm text-red-600">{errors.stop_loss}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Target Price ($) <span className="text-gray-400">(Optional)</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.target_price || ''}
                          onChange={e =>
                            handleInputChange(
                              'target_price',
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="165.00"
                        />
                      </div>
                    </>
                  )}

                  {/* Kelly Criterion fields */}
                  {formData.method === 'kelly' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Win Rate (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={(formData.win_rate || 0) * 100}
                          onChange={e =>
                            handleInputChange('win_rate', (parseFloat(e.target.value) || 0) / 100)
                          }
                          className={cn(
                            'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                            errors.win_rate ? 'border-red-500' : 'border-gray-300'
                          )}
                          placeholder="60"
                        />
                        {errors.win_rate && (
                          <p className="mt-1 text-sm text-red-600">{errors.win_rate}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Average Win/Loss Ratio
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={formData.avg_win_loss_ratio}
                          onChange={e =>
                            handleInputChange('avg_win_loss_ratio', parseFloat(e.target.value) || 0)
                          }
                          className={cn(
                            'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                            errors.avg_win_loss_ratio ? 'border-red-500' : 'border-gray-300'
                          )}
                          placeholder="2.0"
                        />
                        {errors.avg_win_loss_ratio && (
                          <p className="mt-1 text-sm text-red-600">{errors.avg_win_loss_ratio}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confidence Level
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.1"
                          value={formData.confidence_level}
                          onChange={e =>
                            handleInputChange('confidence_level', parseFloat(e.target.value) || 1)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="1.0"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          1.0 = Full Kelly, 0.5 = Half Kelly (more conservative)
                        </p>
                      </div>
                    </>
                  )}

                  {/* Volatility-based fields */}
                  {formData.method === 'volatility_based' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Risk Per Trade (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={(formData.risk_percentage || 0) * 100}
                          onChange={e =>
                            handleInputChange(
                              'risk_percentage',
                              (parseFloat(e.target.value) || 0) / 100
                            )
                          }
                          className={cn(
                            'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                            errors.risk_percentage ? 'border-red-500' : 'border-gray-300'
                          )}
                          placeholder="2"
                        />
                        {errors.risk_percentage && (
                          <p className="mt-1 text-sm text-red-600">{errors.risk_percentage}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Entry Price ($)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.entry_price}
                          onChange={e =>
                            handleInputChange('entry_price', parseFloat(e.target.value) || 0)
                          }
                          className={cn(
                            'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                            errors.entry_price ? 'border-red-500' : 'border-gray-300'
                          )}
                          placeholder="150.00"
                        />
                        {errors.entry_price && (
                          <p className="mt-1 text-sm text-red-600">{errors.entry_price}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Average True Range (ATR)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.atr || ''}
                          onChange={e =>
                            handleInputChange(
                              'atr',
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          className={cn(
                            'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                            errors.atr ? 'border-red-500' : 'border-gray-300'
                          )}
                          placeholder="2.50"
                        />
                        {errors.atr && <p className="mt-1 text-sm text-red-600">{errors.atr}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ATR Multiplier
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={formData.atr_multiplier}
                          onChange={e =>
                            handleInputChange('atr_multiplier', parseFloat(e.target.value) || 2)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="2.0"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          Multiplier for ATR to calculate stop distance
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Right Column - Results */}
              <div className="space-y-6">
                {result ? (
                  <>
                    {/* Calculation Results */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Calculation Results
                      </h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                          <span className="text-gray-600">Position Size</span>
                          <span className="text-xl font-semibold text-gray-900">
                            {result.position_size.toLocaleString()} shares
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                          <span className="text-gray-600">Position Value</span>
                          <span className="text-lg font-medium text-gray-900">
                            ${result.position_value.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                          <span className="text-gray-600">Risk Amount</span>
                          <span className="text-lg font-medium text-red-600">
                            ${result.risk_amount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                          <span className="text-gray-600">Risk Percentage</span>
                          <span className="text-lg font-medium text-gray-900">
                            {(result.risk_percentage * 100).toFixed(2)}%
                          </span>
                        </div>
                        {result.risk_reward_ratio && (
                          <div className="flex justify-between items-center py-2 border-b border-gray-200">
                            <span className="text-gray-600">Risk/Reward Ratio</span>
                            <span className="text-lg font-medium text-green-600">
                              1:{result.risk_reward_ratio.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {result.kelly_percentage && (
                          <div className="flex justify-between items-center py-2 border-b border-gray-200">
                            <span className="text-gray-600">Kelly Percentage</span>
                            <span className="text-lg font-medium text-blue-600">
                              {(result.kelly_percentage * 100).toFixed(2)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Risk/Reward Visualization */}
                    {formData.method === 'fixed_risk' &&
                      formData.entry_price > 0 &&
                      formData.stop_loss > 0 && (
                        <RiskRewardChart
                          entryPrice={formData.entry_price}
                          stopLoss={formData.stop_loss}
                          targetPrice={formData.target_price}
                          positionSize={result.position_size}
                        />
                      )}

                    {/* Warnings */}
                    {result.warnings.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-medium text-yellow-800">Warnings</h4>
                            <ul className="mt-1 text-sm text-yellow-700 space-y-1">
                              {result.warnings.map((warning, index) => (
                                <li key={index}>• {warning}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Copy to Trade Button */}
                    {onCopyToTrade && (
                      <button
                        onClick={handleCopyToTrade}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                        <span>Copy to Trade Ticket</span>
                      </button>
                    )}
                  </>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">
                      {calculateMutation.isPending
                        ? 'Calculating...'
                        : Object.keys(errors).length > 0
                          ? 'Please fix validation errors'
                          : 'Enter parameters to calculate position size'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
