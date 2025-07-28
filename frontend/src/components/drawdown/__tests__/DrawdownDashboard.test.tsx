import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DrawdownDashboard } from '../DrawdownDashboard';
import * as useDrawdownHooks from '../../../hooks/use-drawdown';

// Mock the drawdown hooks
jest.mock('../../../hooks/use-drawdown');

// Mock Recharts to avoid canvas issues in tests
jest.mock('recharts', () => ({
	LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
	Line: () => <div data-testid="line" />,
	XAxis: () => <div data-testid="x-axis" />,
	YAxis: () => <div data-testid="y-axis" />,
	CartesianGrid: () => <div data-testid="cartesian-grid" />,
	Tooltip: () => <div data-testid="tooltip" />,
	Legend: () => <div data-testid="legend" />,
	ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="responsive-container">{children}</div>
	),
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
	motion: {
		div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
	},
}));

const mockCurrentDrawdownData = {
	current_drawdown: {
		amount: -15000.0,
		percentage: -2.5,
		high_water_mark: 600000.0,
		current_value: 585000.0,
		days_in_drawdown: 15,
		last_high_date: '2025-07-10',
	},
	max_drawdown: {
		amount: -45000.0,
		percentage: -7.5,
		date: '2025-03-15',
	},
	benchmark_drawdown: {
		amount: -8000.0,
		percentage: -1.3,
		symbol: 'SPY',
	},
};

const mockHistoricalDrawdownData = {
	drawdown_events: [
		{
			id: 1,
			start_date: '2025-03-01',
			end_date: '2025-04-15',
			peak_value: 600000.0,
			trough_value: 555000.0,
			recovery_value: 602000.0,
			max_drawdown_amount: -45000.0,
			max_drawdown_percent: -7.5,
			duration_days: 45,
			recovery_days: 67,
			is_recovered: true,
		},
	],
	statistics: {
		total_events: 5,
		avg_duration_days: 28,
		avg_recovery_days: 42,
		max_drawdown_ever: -7.5,
		current_recovery_days: 0,
	},
	chart_data: [
		{
			date: '2025-03-01',
			portfolio_value: 600000.0,
			drawdown_percent: 0.0,
			underwater_curve: 0.0,
		},
		{
			date: '2025-03-15',
			portfolio_value: 555000.0,
			drawdown_percent: -7.5,
			underwater_curve: -7.5,
		},
	],
};

const mockAlertData = {
	current_status: 'warning' as const,
	alerts: [
		{
			level: 'warning' as const,
			threshold: 15.0,
			current_drawdown: 16.2,
			triggered_at: '2025-07-28T10:30:00Z',
			message: 'Portfolio drawdown (16.2%) exceeds warning threshold of 15%',
		},
	],
	thresholds: {
		warning: 15.0,
		critical: 20.0,
		emergency: 25.0,
	},
	notifications_enabled: true,
};

function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				gcTime: 0,
			},
		},
	});
}

function renderWithQueryClient(component: React.ReactElement) {
	const queryClient = createTestQueryClient();
	return render(
		<QueryClientProvider client={queryClient}>
			{component}
		</QueryClientProvider>
	);
}

describe('DrawdownDashboard', () => {
	const mockUseCurrentDrawdownMetrics = useDrawdownHooks.useCurrentDrawdownMetrics as jest.MockedFunction<
		typeof useDrawdownHooks.useCurrentDrawdownMetrics
	>;
	const mockUseHistoricalDrawdownData = useDrawdownHooks.useHistoricalDrawdownData as jest.MockedFunction<
		typeof useDrawdownHooks.useHistoricalDrawdownData
	>;
	const mockUseDrawdownAlerts = useDrawdownHooks.useDrawdownAlerts as jest.MockedFunction<
		typeof useDrawdownHooks.useDrawdownAlerts
	>;

	beforeEach(() => {
		// Reset all mocks before each test
		jest.clearAllMocks();
		
		// Default mock implementations
		mockUseCurrentDrawdownMetrics.mockReturnValue({
			data: mockCurrentDrawdownData,
			isLoading: false,
			error: null,
			refetch: jest.fn(),
		} as ReturnType<typeof useDrawdownHooks.useCurrentDrawdownMetrics>);

		mockUseHistoricalDrawdownData.mockReturnValue({
			data: mockHistoricalDrawdownData,
			isLoading: false,
			error: null,
		} as ReturnType<typeof useDrawdownHooks.useHistoricalDrawdownData>);

		mockUseDrawdownAlerts.mockReturnValue({
			data: mockAlertData,
			isLoading: false,
			error: null,
		} as ReturnType<typeof useDrawdownHooks.useDrawdownAlerts>);
	});

	it('renders without crashing', () => {
		renderWithQueryClient(<DrawdownDashboard />);
		expect(screen.getByText('Drawdown Analysis')).toBeInTheDocument();
	});

	it('displays loading state when data is loading', () => {
		mockUseCurrentDrawdownMetrics.mockReturnValue({
			data: undefined,
			isLoading: true,
			error: null,
			refetch: jest.fn(),
		} as ReturnType<typeof useDrawdownHooks.useCurrentDrawdownMetrics>);

		renderWithQueryClient(<DrawdownDashboard />);
		expect(screen.getByText('Loading drawdown analysis...')).toBeInTheDocument();
	});

	it('displays error state when there is an error', () => {
		const errorMessage = 'Failed to fetch drawdown data';
		mockUseCurrentDrawdownMetrics.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: new Error(errorMessage),
			refetch: jest.fn(),
		} as ReturnType<typeof useDrawdownHooks.useCurrentDrawdownMetrics>);

		renderWithQueryClient(<DrawdownDashboard />);
		expect(screen.getByText('Unable to load drawdown data')).toBeInTheDocument();
		expect(screen.getByText('Try Again')).toBeInTheDocument();
	});

	it('displays current drawdown metrics when data is loaded', async () => {
		renderWithQueryClient(<DrawdownDashboard />);

		await waitFor(() => {
			// Check that current drawdown percentage is displayed
			expect(screen.getByText('-2.5%')).toBeInTheDocument();
			// Check that current drawdown amount is displayed
			expect(screen.getByText('-$15,000')).toBeInTheDocument();
			// Check that days in drawdown is displayed
			expect(screen.getByText('15 days')).toBeInTheDocument();
		});
	});

	it('displays historical drawdown statistics', async () => {
		renderWithQueryClient(<DrawdownDashboard />);

		await waitFor(() => {
			// Check that max drawdown ever is displayed
			expect(screen.getByText('-7.5%')).toBeInTheDocument();
			// Check that average duration is displayed
			expect(screen.getByText('28 days')).toBeInTheDocument();
			// Check that total events is displayed
			expect(screen.getByText('5 events')).toBeInTheDocument();
		});
	});

	it('displays alert status when alerts are active', async () => {
		renderWithQueryClient(<DrawdownDashboard />);

		await waitFor(() => {
			expect(screen.getByText('Warning Alert')).toBeInTheDocument();
			expect(screen.getByText('Portfolio drawdown (16.2%) exceeds warning threshold of 15%')).toBeInTheDocument();
		});
	});

	it('renders drawdown chart with correct data', async () => {
		renderWithQueryClient(<DrawdownDashboard />);

		await waitFor(() => {
			expect(screen.getByTestId('line-chart')).toBeInTheDocument();
			expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
		});
	});

	it('renders historical drawdown events table', async () => {
		renderWithQueryClient(<DrawdownDashboard />);

		await waitFor(() => {
			// Check table headers
			expect(screen.getByText('Start Date')).toBeInTheDocument();
			expect(screen.getByText('Max Drawdown')).toBeInTheDocument();
			expect(screen.getByText('Duration')).toBeInTheDocument();
			expect(screen.getByText('Recovery')).toBeInTheDocument();
			expect(screen.getByText('Status')).toBeInTheDocument();

			// Check table data
			expect(screen.getByText('Mar 1, 2025')).toBeInTheDocument();
			expect(screen.getByText('-7.5%')).toBeInTheDocument();
			expect(screen.getByText('45 days')).toBeInTheDocument();
			expect(screen.getByText('67 days')).toBeInTheDocument();
			expect(screen.getByText('Recovered')).toBeInTheDocument();
		});
	});

	it('handles benchmark comparison when provided', async () => {
		renderWithQueryClient(<DrawdownDashboard benchmark="SPY" />);

		await waitFor(() => {
			expect(screen.getByText('vs SPY: -1.3%')).toBeInTheDocument();
		});
	});

	it('handles empty state when no historical data is available', async () => {
		mockUseHistoricalDrawdownData.mockReturnValue({
			data: {
				...mockHistoricalDrawdownData,
				drawdown_events: [],
				statistics: {
					...mockHistoricalDrawdownData.statistics,
					total_events: 0,
				},
			},
			isLoading: false,
			error: null,
		} as ReturnType<typeof useDrawdownHooks.useHistoricalDrawdownData>);

		renderWithQueryClient(<DrawdownDashboard />);

		await waitFor(() => {
			expect(screen.getByText('No Drawdown Events')).toBeInTheDocument();
			expect(screen.getByText('No significant drawdown events found in the selected period.')).toBeInTheDocument();
		});
	});

	it('calls refetch when refresh button is clicked', async () => {
		const refetchMock = jest.fn();
		mockUseCurrentDrawdownMetrics.mockReturnValue({
			data: mockCurrentDrawdownData,
			isLoading: false,
			error: null,
			refetch: refetchMock,
		} as ReturnType<typeof useDrawdownHooks.useCurrentDrawdownMetrics>);

		renderWithQueryClient(<DrawdownDashboard />);

		const refreshButton = screen.getByRole('button', { name: /refresh/i });
		refreshButton.click();

		expect(refetchMock).toHaveBeenCalledTimes(1);
	});

	it('applies correct CSS classes for responsive design', () => {
		renderWithQueryClient(<DrawdownDashboard />);

		const container = screen.getByText('Drawdown Analysis').closest('div');
		expect(container).toHaveClass('min-h-screen', 'bg-slate-950');
	});

	it('handles different timeframe selections', async () => {
		const { rerender } = renderWithQueryClient(<DrawdownDashboard timeframe="monthly" />);

		// Verify initial call with monthly timeframe
		expect(mockUseHistoricalDrawdownData).toHaveBeenCalledWith(
			expect.any(String), // start date
			expect.any(String), // end date
			1.0 // min drawdown
		);

		// Change timeframe and verify new call
		rerender(
			<QueryClientProvider client={createTestQueryClient()}>
				<DrawdownDashboard timeframe="yearly" />
			</QueryClientProvider>
		);

		await waitFor(() => {
			expect(mockUseHistoricalDrawdownData).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				1.0
			);
		});
	});
});