/**
 * Position Sizing Calculator Types
 *
 * Type definitions for the position sizing calculator component and API responses
 */

// Position sizing methods
export type SizingMethod = 'fixed_risk' | 'kelly' | 'volatility_based';

// API request types
export interface CalculatePositionRequest {
  method: SizingMethod;
  account_value: number;
  risk_percentage?: number;
  entry_price?: number;
  stop_loss?: number;
  target_price?: number;
  win_rate?: number;
  avg_win_loss_ratio?: number;
  confidence_level?: number;
  atr?: number;
  atr_multiplier?: number;
}

export interface ValidatePositionRequest {
  symbol: string;
  position_size: number;
  entry_price: number;
  account_id: number;
}

// API response types
export interface PositionSizeResponse {
  position_size: number;
  position_value: number;
  risk_amount: number;
  risk_percentage: number;
  stop_loss_percentage: number;
  risk_reward_ratio?: number;
  kelly_percentage?: number;
  warnings: string[];
  metadata: Record<string, unknown>;
}

export interface ValidatePositionResponse {
  valid: boolean;
  violations: string[];
  warnings: string[];
  adjusted_size: number;
  max_allowed_size: number;
}

export interface MethodInfo {
  id: SizingMethod;
  name: string;
  description: string;
  required_fields: string[];
  optional_fields: string[];
}

export interface MethodsResponse {
  methods: MethodInfo[];
}

// Component props types
export interface PositionSizeCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  onCopyToTrade?: (data: PositionSizeCalculationResult) => void;
  initialData?: Partial<PositionSizeCalculationData>;
}

// Internal component types
export interface PositionSizeCalculationData {
  method: SizingMethod;
  account_value: number;
  risk_percentage: number;
  entry_price: number;
  stop_loss: number;
  target_price?: number;
  win_rate?: number;
  avg_win_loss_ratio?: number;
  confidence_level: number;
  atr?: number;
  atr_multiplier: number;
  symbol?: string;
}

export interface PositionSizeCalculationResult extends PositionSizeResponse {
  entry_price: number;
  stop_loss: number;
  target_price?: number;
  symbol?: string;
}

// Form validation types
export interface ValidationErrors {
  [key: string]: string;
}

// Chart data types for risk/reward visualization
export interface RiskRewardChartData {
  price: number;
  profit_loss: number;
  zone: 'loss' | 'breakeven' | 'profit';
}

// State management types (for Zustand store)
export interface PositionSizingStore {
  // Calculator state
  isCalculatorOpen: boolean;
  currentCalculation: PositionSizeCalculationData | null;
  calculationResult: PositionSizeCalculationResult | null;

  // Available methods (cached from API)
  availableMethods: MethodInfo[];

  // UI state
  isCalculating: boolean;
  errors: ValidationErrors;
  warnings: string[];

  // Actions
  openCalculator: (initialData?: Partial<PositionSizeCalculationData>) => void;
  closeCalculator: () => void;
  updateCalculation: (data: Partial<PositionSizeCalculationData>) => void;
  setResult: (result: PositionSizeCalculationResult) => void;
  setErrors: (errors: ValidationErrors) => void;
  setWarnings: (warnings: string[]) => void;
  clearState: () => void;
}
