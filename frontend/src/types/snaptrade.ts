/**
 * TypeScript types for SnapTrade API integration
 * Based on backend API schemas in src/api/schemas/snaptrade.py
 */

// ===== REQUEST TYPES =====

export interface SnapTradeUserRegistrationRequest {
  /** User registration request (currently empty but extensible) */
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
}

export interface SnapTradeConnectionRequest {
  /** Connection portal request (currently empty but extensible) */
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
}

// ===== RESPONSE TYPES =====

export interface SnapTradeUserRegistrationResponse {
  status: string;
  message: string;
  user_secret: string;
}

export interface SnapTradeConnectionResponse {
  connection_url: string;
  expires_at: string | null;
}

export interface SnapTradeAccount {
  id: string;
  institution_name: string;
  account_type: string;
  account_number: string;
  balance: number;
  currency: string;
  status: string;
  last_sync: string;
}

export interface SnapTradeAccountsResponse {
  accounts: SnapTradeAccount[];
}

export interface SnapTradePosition {
  symbol: string;
  quantity: number;
  average_purchase_price: number;
  last_ask_price: number;
  market_value: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
}

export interface SnapTradePositionsResponse {
  positions: SnapTradePosition[];
}

export interface SnapTradeBalance {
  cash: number;
  buying_power: number;
  total_value: number;
  currency: string;
}

export interface SnapTradeBalancesResponse {
  balances: SnapTradeBalance;
}

export interface SnapTradeTransaction {
  id: string;
  symbol: string;
  type: string;
  quantity: number;
  price: number;
  amount: number;
  trade_date: string;
  settlement_date: string;
  description: string;
  fees: number;
}

export interface SnapTradeTransactionsResponse {
  transactions: SnapTradeTransaction[];
}

export interface SnapTradeDeleteResponse {
  status: string;
  message: string;
}

// ===== UI STATE TYPES =====

export interface SnapTradeConnectionStatus {
  isRegistered: boolean;
  hasConnectedAccounts: boolean;
  accountCount: number;
  lastSync: string | null;
  connectionHealth: 'healthy' | 'warning' | 'error';
}

export interface SnapTradeRegistrationState {
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
}

export interface SnapTradeConnectionState {
  status: 'idle' | 'connecting' | 'success' | 'error';
  currentStep: number;
  selectedBroker?: string;
  error?: string;
}

// ===== BROKER TYPES =====

export interface BrokerInfo {
  id: string;
  name: string;
  logo: string;
  popular: boolean;
  rating: number;
  users: string;
  features: string[];
  connectionTime: string;
}

// ===== ERROR TYPES =====

export interface SnapTradeError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

// ===== HOOK RETURN TYPES =====

export interface UseSnapTradeRegistration {
  register: () => Promise<void>;
  state: SnapTradeRegistrationState;
  isLoading: boolean;
}

export interface UseSnapTradeConnection {
  getConnectionUrl: () => Promise<string>;
  state: SnapTradeConnectionState;
  isLoading: boolean;
}

export interface UseSnapTradeAccounts {
  accounts: SnapTradeAccount[];
  isLoading: boolean;
  error: SnapTradeError | null;
  refetch: () => void;
}

export interface UseSnapTradePositions {
  positions: SnapTradePosition[];
  isLoading: boolean;
  error: SnapTradeError | null;
  refetch: () => void;
}

export interface UseSnapTradeBalances {
  balances: SnapTradeBalance | null;
  isLoading: boolean;
  error: SnapTradeError | null;
  refetch: () => void;
}

export interface UseSnapTradeTransactions {
  transactions: SnapTradeTransaction[];
  isLoading: boolean;
  error: SnapTradeError | null;
  refetch: () => void;
}

// ===== COMPONENT PROP TYPES =====

export interface SnapTradeRegistrationProps {
  className?: string;
  onRegistrationComplete?: () => void;
  onNavigateToConnection?: () => void;
}

export interface AccountConnectionFlowProps {
  className?: string;
  onBack?: () => void;
  onConnectionComplete?: () => void;
}

export interface ConnectedAccountsListProps {
  className?: string;
  onAddAccount?: () => void;
  onAccountDisconnect?: (accountId: string) => void;
}

export interface SnapTradeStatusWidgetProps {
  className?: string;
  onManageAccounts?: () => void;
  compact?: boolean;
}
