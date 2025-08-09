import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Ensures light mode is always used by removing the dark class from the document element.
 * This can be called from any component that needs to ensure light mode.
 */
export function ensureLightMode() {
  if (typeof document !== 'undefined') {
    // Always set dark mode to false
    document.documentElement.classList.toggle('dark', false);
  }
}

/**
 * Removes any dark mode classes from a className string
 * @param className The class string to process
 * @returns The class string with dark mode classes removed
 */
export function removeDarkClasses(className: string): string {
  return className
    .split(' ')
    .filter(cls => !cls.startsWith('dark:'))
    .join(' ');
}

/**
 * Trade validation utilities for position sizing and risk management
 */

export interface TradeValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  adjustedAmount?: number;
}

export interface AccountLimits {
  accountValue: number;
  availableCash: number;
  buyingPower: number;
  maxPositionSize?: number;
  maxRiskPerTrade?: number; // Percentage (0.01 = 1%)
}

/**
 * Validates a trade's position size against account limits and risk parameters
 * @param amount The position size (number of shares/units)
 * @param price The price per share/unit
 * @param accountLimits Account balance and risk limits
 * @param symbol The trading symbol (for specific validations)
 * @returns Validation result with errors, warnings, and potential adjustments
 */
export function validateTradeSize(
  amount: number,
  price: number,
  accountLimits: AccountLimits,
  symbol: string = ''
): TradeValidationResult {
  const result: TradeValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  const positionValue = amount * price;

  // Basic validation
  if (amount <= 0) {
    result.errors.push('Position size must be greater than zero');
    result.isValid = false;
  }

  if (price <= 0) {
    result.errors.push('Price must be greater than zero');
    result.isValid = false;
  }

  if (!result.isValid) {
    return result;
  }

  // Cash availability check
  if (positionValue > accountLimits.availableCash) {
    result.errors.push(
      `Insufficient cash: Need $${positionValue.toLocaleString()}, available $${accountLimits.availableCash.toLocaleString()}`
    );
    result.isValid = false;

    // Suggest adjusted position size
    result.adjustedAmount = Math.floor(accountLimits.availableCash / price);
  }

  // Buying power check (for margin accounts)
  if (positionValue > accountLimits.buyingPower) {
    result.errors.push(
      `Exceeds buying power: Need $${positionValue.toLocaleString()}, available $${accountLimits.buyingPower.toLocaleString()}`
    );
    result.isValid = false;
  }

  // Maximum position size check
  if (accountLimits.maxPositionSize && positionValue > accountLimits.maxPositionSize) {
    result.errors.push(
      `Exceeds maximum position size limit of $${accountLimits.maxPositionSize.toLocaleString()}`
    );
    result.isValid = false;
  }

  // Risk per trade check
  if (accountLimits.maxRiskPerTrade) {
    const maxRiskAmount = accountLimits.accountValue * accountLimits.maxRiskPerTrade;
    const positionRiskPercentage = positionValue / accountLimits.accountValue;

    if (positionValue > maxRiskAmount) {
      result.warnings.push(
        `Large position size: ${(positionRiskPercentage * 100).toFixed(1)}% of account value (${(accountLimits.maxRiskPerTrade * 100).toFixed(1)}% recommended max)`
      );
    }
  }

  // Position concentration warnings
  const concentrationPercentage = positionValue / accountLimits.accountValue;
  if (concentrationPercentage > 0.1) {
    // More than 10% of account
    result.warnings.push(
      `High concentration: Position represents ${(concentrationPercentage * 100).toFixed(1)}% of total account value`
    );
  }

  // Asset-specific validations
  if (symbol) {
    // Cryptocurrency specific warnings
    if (
      symbol.includes('BTC') ||
      symbol.includes('ETH') ||
      symbol.includes('USD') ||
      symbol.includes('-')
    ) {
      if (concentrationPercentage > 0.05) {
        // More than 5% for crypto
        result.warnings.push(
          `High crypto exposure: Consider limiting crypto positions to 5% of portfolio`
        );
      }
    }

    // Penny stock warnings (assuming price < $5)
    if (price < 5) {
      result.warnings.push(
        `Low-priced security: $${price.toFixed(2)} per share may have higher volatility`
      );
    }
  }

  return result;
}

/**
 * Formats currency values for display in validation messages
 * @param amount The amount to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Calculates position size as percentage of account
 * @param positionValue The total value of the position
 * @param accountValue The total account value
 * @returns Percentage as decimal (0.1 = 10%)
 */
export function calculatePositionPercentage(positionValue: number, accountValue: number): number {
  if (accountValue <= 0) return 0;
  return positionValue / accountValue;
}
