import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/api-client';

// TypeScript interfaces for drawdown data
export interface CurrentDrawdown {
	amount: number;
	percentage: number;
	high_water_mark: number;
	current_value: number;
	days_in_drawdown: number;
	last_high_date: string;
}

export interface MaxDrawdown {
	amount: number;
	percentage: number;
	date: string;
}

export interface BenchmarkDrawdown {
	amount: number;
	percentage: number;
	symbol: string;
}

export interface CurrentDrawdownMetrics {
	current_drawdown: CurrentDrawdown;
	max_drawdown: MaxDrawdown;
	benchmark_drawdown: BenchmarkDrawdown;
}

export interface DrawdownEvent {
	id: number;
	start_date: string;
	end_date: string;
	peak_value: number;
	trough_value: number;
	recovery_value: number;
	max_drawdown_amount: number;
	max_drawdown_percent: number;
	duration_days: number;
	recovery_days: number;
	is_recovered: boolean;
}

export interface DrawdownStatistics {
	total_events: number;
	avg_duration_days: number;
	avg_recovery_days: number;
	max_drawdown_ever: number;
	current_recovery_days: number;
}

export interface DrawdownChartData {
	date: string;
	portfolio_value: number;
	drawdown_percent: number;
	underwater_curve: number;
}

export interface HistoricalDrawdownData {
	drawdown_events: DrawdownEvent[];
	statistics: DrawdownStatistics;
	chart_data: DrawdownChartData[];
}

export interface DrawdownAlert {
	level: 'normal' | 'warning' | 'critical' | 'emergency';
	threshold: number;
	current_drawdown: number;
	triggered_at?: string;
	message?: string;
}

export interface DrawdownAlertConfig {
	current_status: 'normal' | 'warning' | 'critical' | 'emergency';
	alerts: DrawdownAlert[];
	thresholds: {
		warning: number;
		critical: number;
		emergency: number;
	};
	notifications_enabled: boolean;
}

export interface DrawdownAlertUpdateRequest {
	warning_threshold: number;
	critical_threshold: number;
	emergency_threshold: number;
	notifications_enabled: boolean;
	email_notifications?: boolean;
	dashboard_alerts?: boolean;
}

export interface DrawdownAlertUpdateResponse {
	message: string;
	config: {
		warning_threshold: number;
		critical_threshold: number;
		emergency_threshold: number;
		notifications_enabled: boolean;
	};
}

/**
 * Hook to fetch current real-time drawdown metrics
 */
export function useCurrentDrawdownMetrics(benchmark?: string) {
	return useQuery<CurrentDrawdownMetrics>({
		queryKey: ['drawdown', 'current', benchmark],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (benchmark) {
				params.append('benchmark', benchmark);
			}
			
			const response = await apiClient.get(`/performance/drawdown/current?${params.toString()}`);
			return response.data;
		},
		staleTime: 30000, // Consider data stale after 30 seconds
		gcTime: 5 * 60 * 1000, // Keep data cached for 5 minutes
	});
}

/**
 * Hook to fetch historical drawdown analysis
 */
export function useHistoricalDrawdownData(
	startDate: string,
	endDate: string,
	minDrawdown: number = 1.0
) {
	return useQuery<HistoricalDrawdownData>({
		queryKey: ['drawdown', 'historical', startDate, endDate, minDrawdown],
		queryFn: async () => {
			const params = new URLSearchParams({
				start_date: startDate,
				end_date: endDate,
				min_drawdown: minDrawdown.toString(),
			});
			
			const response = await apiClient.get(`/performance/drawdown/historical?${params.toString()}`);
			return response.data;
		},
		staleTime: 5 * 60 * 1000, // Historical data is less frequently updated
		gcTime: 10 * 60 * 1000, // Keep cached for 10 minutes
		enabled: !!startDate && !!endDate, // Only run query when dates are provided
	});
}

/**
 * Hook to fetch current drawdown alert status and configuration
 */
export function useDrawdownAlerts() {
	return useQuery<DrawdownAlertConfig>({
		queryKey: ['drawdown', 'alerts'],
		queryFn: async () => {
			const response = await apiClient.get('/performance/drawdown/alerts');
			return response.data;
		},
		staleTime: 60 * 1000, // Check alerts every minute
		gcTime: 5 * 60 * 1000,
	});
}

/**
 * Hook to update drawdown alert configuration
 */
export function useUpdateDrawdownAlerts() {
	const queryClient = useQueryClient();
	
	return useMutation<DrawdownAlertUpdateResponse, Error, DrawdownAlertUpdateRequest>({
		mutationFn: async (config: DrawdownAlertUpdateRequest) => {
			const response = await apiClient.post('/performance/drawdown/alerts/config', config);
			return response.data;
		},
		onSuccess: () => {
			// Invalidate and refetch alert data
			queryClient.invalidateQueries({ queryKey: ['drawdown', 'alerts'] });
			// Also refresh current metrics as alert status may have changed
			queryClient.invalidateQueries({ queryKey: ['drawdown', 'current'] });
		},
	});
}

/**
 * Helper function to get drawdown trend color based on percentage
 */
export function getDrawdownTrendColor(drawdownPercent: number): string {
	if (drawdownPercent <= 5) return 'text-emerald-400';
	if (drawdownPercent <= 10) return 'text-yellow-400';
	if (drawdownPercent <= 15) return 'text-orange-400';
	return 'text-red-400';
}

/**
 * Helper function to get alert level color
 */
export function getAlertLevelColor(level: DrawdownAlert['level']): string {
	switch (level) {
		case 'normal':
			return 'text-emerald-400';
		case 'warning':
			return 'text-yellow-400';
		case 'critical':
			return 'text-orange-400';
		case 'emergency':
			return 'text-red-400';
		default:
			return 'text-slate-400';
	}
}

/**
 * Helper function to format duration in days to human readable format
 */
export function formatDuration(days: number): string {
	if (days < 1) return '< 1 day';
	if (days === 1) return '1 day';
	if (days < 7) return `${days} days`;
	if (days < 30) {
		const weeks = Math.floor(days / 7);
		const remainingDays = days % 7;
		if (remainingDays === 0) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
		return `${weeks}w ${remainingDays}d`;
	}
	const months = Math.floor(days / 30);
	const remainingDays = days % 30;
	if (remainingDays === 0) return `${months} ${months === 1 ? 'month' : 'months'}`;
	return `${months}m ${remainingDays}d`;
}