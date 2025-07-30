/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from './lib/api-client';

// Test API connection
console.log('Testing API connection to http://localhost:8002...\n');

// Test endpoints
const endpoints = [
  { name: 'Health Check', url: 'http://localhost:8002/health' },
  { name: 'API Health', url: 'http://localhost:8002/api/health' },
  { name: 'API Docs', url: 'http://localhost:8002/docs' },
];

async function testAPI() {
  try {
    // Test health endpoint
    console.log('1. Testing health check...');
    const healthResponse = await api.health.check();
    console.log('✓ Health check passed:', healthResponse.data);

    // Test morning brief
    console.log('\n2. Testing morning brief...');
    const morningBriefResponse = await api.morningBrief.get();
    console.log('✓ Morning brief retrieved:', {
      date: morningBriefResponse.data.date,
      portfolio_value: morningBriefResponse.data.portfolio_value,
      alerts_count: morningBriefResponse.data.volatility_alerts?.length || 0,
    });

    // Test portfolio summary
    console.log('\n3. Testing portfolio summary...');
    const portfolioResponse = await api.portfolio.getSummary();
    console.log('✓ Portfolio summary retrieved:', {
      total_value: portfolioResponse.data.total_value,
      positions_count: portfolioResponse.data.positions?.length || 0,
    });

    // Test market indices
    console.log('\n4. Testing market indices...');
    const indicesResponse = await api.market.getIndices();
    console.log('✓ Market indices retrieved:', Object.keys(indicesResponse.data));

    console.log(
      '\n✅ All API tests passed! The frontend is successfully connected to the backend.'
    );
  } catch (error: any) {
    console.error('\n❌ API test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    console.error('\nMake sure the FastAPI backend is running on http://localhost:8002');
  }
}

// Run the test
testAPI();
