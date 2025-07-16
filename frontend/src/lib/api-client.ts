import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Task management endpoints
  tasks: {
    getPending: () => apiClient.get('/tasks'),
    getOverdue: () => apiClient.get('/tasks/overdue'),
    getCompliance: (startDate: string, endDate: string) => 
      apiClient.get('/tasks/compliance', { params: { start_date: startDate, end_date: endDate } }),
    getBlockingStatus: () => apiClient.get('/tasks/blocking-status'),
    getWeeklyReadiness: () => apiClient.get('/tasks/weekly-readiness'),
    complete: (taskId: number, notes?: string) => 
      apiClient.post(`/tasks/${taskId}/complete`, { notes }),
    skip: (taskId: number, reason: string) => 
      apiClient.post(`/tasks/${taskId}/skip`, { reason }),
    updateStatus: (taskId: number, status: string) =>
      apiClient.put(`/tasks/${taskId}/status`, { status }),
    
    // Template management
    getTemplates: () => apiClient.get('/tasks/templates'),
    createTemplate: (template: any) => apiClient.post('/tasks/templates', template),
    updateTemplate: (templateId: number, updates: any) => 
      apiClient.put(`/tasks/templates/${templateId}`, updates),
    deleteTemplate: (templateId: number) => 
      apiClient.delete(`/tasks/templates/${templateId}`),
    
    // Task generation
    generateTasks: (startDate: string, endDate: string) =>
      apiClient.post('/tasks/generate', null, { params: { start_date: startDate, end_date: endDate } }),
  },
  
  // Portfolio endpoints
  portfolio: {
    getOverview: () => apiClient.get('/portfolio/overview'),
    getPerformance: () => apiClient.get('/portfolio/performance'),
    getHoldings: () => apiClient.get('/portfolio/holdings'),
  },
  
  // Market data endpoints
  market: {
    getQuotes: (symbols: string[]) => 
      apiClient.get('/market/quotes', { params: { symbols: symbols.join(',') } }),
    getIndices: () => apiClient.get('/market/indices'),
  },
  
  // Reports endpoints
  reports: {
    generateWeekly: () => apiClient.post('/reports/weekly'),
    getLatest: () => apiClient.get('/reports/latest'),
  },
  
  // Trade ticket endpoints
  trades: {
    generateTicket: (params: any) => apiClient.post('/trades/generate-ticket', params),
    submitTicket: (ticket: any) => apiClient.post('/trades/submit', ticket),
  },
  
  // Health check
  health: () => apiClient.get('/health'),
};