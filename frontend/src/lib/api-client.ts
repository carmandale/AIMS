/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8002/api';

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  config => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('auth_token');
      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const api = {
  // Authentication
  auth: {
    login: (email: string, password: string) => apiClient.post('/auth/login', { email, password }),
    register: (email: string, password: string) =>
      apiClient.post('/auth/register', { email, password }),
    logout: () => apiClient.post('/auth/logout'),
    getCurrentUser: () => apiClient.get('/auth/me'),
  },

  // Health check
  health: {
    check: () => apiClient.get('/health'),
  },

  // Morning Brief
  morningBrief: {
    get: (date?: string) => apiClient.get('/morning-brief', { params: { date } }),
    generate: () => apiClient.post('/morning-brief/generate'),
    getAlerts: () => apiClient.get('/morning-brief/alerts'),
  },

  // Portfolio
  portfolio: {
    getSummary: () => apiClient.get('/portfolio/summary'),
    getPositions: (broker?: string) =>
      apiClient.get('/portfolio/positions', { params: { broker } }),
    getBalances: () => apiClient.get('/portfolio/balances'),
    getTransactions: (days = 7, broker?: string) =>
      apiClient.get('/portfolio/transactions', { params: { days, broker } }),
    getWeeklyPerformance: () => apiClient.get('/portfolio/performance/weekly'),
    refresh: () => apiClient.post('/portfolio/refresh'),
    getPerformanceMetrics: (userId: string, timeframe: string, benchmark?: string) =>
      apiClient.get('/portfolio/performance', {
        params: { user_id: userId, timeframe, benchmark },
      }),
    getRiskMetrics: (userId: string, timeframe?: string) =>
      apiClient.get('/portfolio/risk-metrics', { params: { user_id: userId, timeframe } }),
    getAssetAllocation: (userId: string) =>
      apiClient.get('/portfolio/allocation', { params: { user_id: userId } }),
    getConcentrationAnalysis: (userId: string) =>
      apiClient.get('/portfolio/concentration', { params: { user_id: userId } }),
    getPositionRiskContributions: (userId: string) =>
      apiClient.get('/portfolio/position-risks', { params: { user_id: userId } }),
    getCorrelationMatrix: (userId: string) =>
      apiClient.get('/portfolio/correlations', { params: { user_id: userId } }),
    getRebalancingSuggestions: (userId: string, targetAllocation: any, driftThreshold: number) =>
      apiClient.post('/portfolio/rebalance', {
        user_id: userId,
        target_allocation: targetAllocation,
        drift_threshold: driftThreshold,
      }),
    runStressTest: (userId: string, scenarios: string[]) =>
      apiClient.post('/portfolio/stress-test', { user_id: userId, scenarios }),
  },

  // Market Data
  market: {
    getQuotes: (symbols: string[]) =>
      apiClient.get('/market/quotes', { params: { symbols: symbols.join(',') } }),
    getIndices: () => apiClient.get('/market/indices'),
    getCrypto: () => apiClient.get('/market/crypto'),
  },

  // Task Management
  tasks: {
    getPending: (includeCompleted = false, startDate?: string, endDate?: string) =>
      apiClient.get('/tasks', {
        params: { include_completed: includeCompleted, start_date: startDate, end_date: endDate },
      }),
    getOverdue: () => apiClient.get('/tasks/overdue'),
    complete: (taskId: number, notes?: string) =>
      apiClient.post(`/tasks/${taskId}/complete`, { notes }),
    skip: (taskId: number, reason: string) => apiClient.post(`/tasks/${taskId}/skip`, { reason }),
    updateStatus: (taskId: number, status: string) =>
      apiClient.put(`/tasks/${taskId}/status`, { status }),
    getCompliance: (startDate: string, endDate: string) =>
      apiClient.get('/tasks/compliance', { params: { start_date: startDate, end_date: endDate } }),
    getBlockingStatus: (checkDate?: string) =>
      apiClient.get('/tasks/blocking-status', { params: { check_date: checkDate } }),
    getWeeklyReadiness: (checkDate?: string) =>
      apiClient.get('/tasks/weekly-readiness', { params: { check_date: checkDate } }),

    // Template management
    getTemplates: (activeOnly = true) =>
      apiClient.get('/tasks/templates', { params: { active_only: activeOnly } }),
    createTemplate: (templateData: any) => apiClient.post('/tasks/templates', templateData),
    updateTemplate: (templateId: number, templateData: any) =>
      apiClient.put(`/tasks/templates/${templateId}`, templateData),
    deleteTemplate: (templateId: number) => apiClient.delete(`/tasks/templates/${templateId}`),
  },

  // Reports
  reports: {
    generate: (userId: string, reportType: string, parameters: any, format = 'pdf') =>
      apiClient.post('/reports/generate', {
        user_id: userId,
        report_type: reportType,
        parameters,
        format,
      }),
    list: (userId: string) => apiClient.get('/reports', { params: { user_id: userId } }),
    download: (reportId: string) =>
      apiClient.get(`/reports/${reportId}/download`, { responseType: 'blob' }),
  },

  // Performance Analytics
  performance: {
    getMetrics: (timeframe = 'ytd', benchmark?: string) =>
      apiClient.get('/performance/metrics', { params: { timeframe, benchmark } }),
    getHistorical: (startDate?: string, endDate?: string, interval = 'daily') =>
      apiClient.get('/performance/historical', {
        params: { start_date: startDate, end_date: endDate, interval },
      }),
    configureBenchmark: (benchmark: string, custom_data?: any) =>
      apiClient.post('/performance/benchmark', { benchmark, custom_data }),
  },

  // SnapTrade Integration
  snaptrade: {
    // User registration
    register: () => apiClient.post('/snaptrade/register', {}),

    // Account connection
    getConnectionUrl: () => apiClient.get('/snaptrade/connect'),

    // Account management
    getAccounts: () => apiClient.get('/snaptrade/accounts'),

    // Portfolio data
    getPositions: (accountId: string) =>
      apiClient.get(`/snaptrade/accounts/${accountId}/positions`),

    getBalances: (accountId: string) => apiClient.get(`/snaptrade/accounts/${accountId}/balances`),

    getTransactions: (startDate?: string, endDate?: string) =>
      apiClient.get('/snaptrade/transactions', {
        params: { start_date: startDate, end_date: endDate },
      }),

    // Data synchronization
    syncData: () => apiClient.post('/snaptrade/sync'),

    // Connection callback
    processCallback: () => apiClient.post('/snaptrade/callback'),

    // User deletion
    deleteUser: () => apiClient.delete('/snaptrade/user'),
  },

  // Position Sizing Calculator
  positionSizing: {
    // Calculate position size based on method and parameters
    calculate: (params: {
      method: 'fixed_risk' | 'kelly' | 'volatility_based';
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
    }) => apiClient.post('/position-sizing/calculate', params),

    // Get available position sizing methods and their requirements
    getMethods: () => apiClient.get('/position-sizing/methods'),

    // Validate position size against portfolio rules
    validate: (params: {
      symbol: string;
      position_size: number;
      entry_price: number;
      account_id: number;
    }) => apiClient.post('/position-sizing/validate', params),
  },
};

export default apiClient;
