import { test, expect } from '@playwright/test';

test.describe('Verify SnapTrade Fix - Simple', () => {
  test('should verify SnapTrade connection endpoint works', async ({ request }) => {
    // First login to get a token
    const loginResponse = await request.post('http://localhost:8002/api/auth/login', {
      data: {
        email: 'test@aims.local',
        password: 'password123'
      }
    });
    
    expect(loginResponse.ok()).toBeTruthy();
    const { access_token } = await loginResponse.json();
    console.log('✅ Logged in successfully');
    
    // Test SnapTrade registration endpoint
    const registerResponse = await request.post('http://localhost:8002/api/snaptrade/register', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      },
      data: {}
    });
    
    expect(registerResponse.ok()).toBeTruthy();
    const registerData = await registerResponse.json();
    console.log('Registration response:', registerData);
    expect(registerData.status).toBe('already_registered');
    console.log('✅ User already registered');
    
    // Test SnapTrade connection URL endpoint (THE KEY TEST)
    const connectResponse = await request.get('http://localhost:8002/api/snaptrade/connect', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    
    // This should now work after our encryption fix
    expect(connectResponse.ok()).toBeTruthy();
    const connectData = await connectResponse.json();
    console.log('Connect response:', connectData);
    
    expect(connectData).toHaveProperty('connection_url');
    expect(connectData.connection_url).toMatch(/^https:\/\/app\.snaptrade\.com/);
    
    console.log('✅ SnapTrade connection URL retrieved successfully!');
    console.log('🎉 ENCRYPTION FIX VERIFIED - Integration is working!');
  });
});