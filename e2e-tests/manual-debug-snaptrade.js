// Manual debug script for SnapTrade connection issue
// Run this in the browser console after logging in

async function debugSnapTradeConnection() {
  console.log('=== SnapTrade Connection Debug ===');
  
  // Get auth token
  const token = localStorage.getItem('auth_token');
  console.log('Auth token present:', !!token);
  
  // Check registration status
  try {
    console.log('\n1. Checking registration status...');
    const registerResponse = await fetch('http://localhost:8002/api/snaptrade/register', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    const registerData = await registerResponse.json();
    console.log('Registration response:', registerData);
  } catch (error) {
    console.error('Registration check failed:', error);
  }
  
  // Check connected accounts
  try {
    console.log('\n2. Checking connected accounts...');
    const accountsResponse = await fetch('http://localhost:8002/api/snaptrade/accounts', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const accountsData = await accountsResponse.json();
    console.log('Accounts response:', accountsData);
    console.log('Number of accounts:', accountsData.accounts?.length || 0);
  } catch (error) {
    console.error('Accounts check failed:', error);
  }
  
  // Get connection URL
  try {
    console.log('\n3. Getting connection URL...');
    const connectResponse = await fetch('http://localhost:8002/api/snaptrade/connect', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const connectData = await connectResponse.json();
    console.log('Connection URL response:', connectData);
    console.log('Connection URL:', connectData.connection_url);
  } catch (error) {
    console.error('Connection URL failed:', error);
  }
  
  // Check localStorage for any SnapTrade state
  console.log('\n4. Checking localStorage...');
  const localStorageKeys = Object.keys(localStorage).filter(key => 
    key.toLowerCase().includes('snap') || key.toLowerCase().includes('trade')
  );
  console.log('SnapTrade-related localStorage keys:', localStorageKeys);
  localStorageKeys.forEach(key => {
    console.log(`  ${key}:`, localStorage.getItem(key));
  });
  
  // Check sessionStorage too
  console.log('\n5. Checking sessionStorage...');
  const sessionStorageKeys = Object.keys(sessionStorage).filter(key => 
    key.toLowerCase().includes('snap') || key.toLowerCase().includes('trade')
  );
  console.log('SnapTrade-related sessionStorage keys:', sessionStorageKeys);
  sessionStorageKeys.forEach(key => {
    console.log(`  ${key}:`, sessionStorage.getItem(key));
  });
  
  console.log('\n=== Debug Complete ===');
}

// Run the debug function
debugSnapTradeConnection();

// Additional helper to simulate the connection flow
function simulateConnectionFlow() {
  console.log('\nTo test the connection flow:');
  console.log('1. Click "Connect Brokerage" from home');
  console.log('2. Click "Connect Your Account" on registration page');
  console.log('3. Select a broker (e.g., Fidelity)');
  console.log('4. Click through security confirmation');
  console.log('5. Click "Connect to [Broker]"');
  console.log('6. After popup, click "I\'ve Completed the Connection"');
  console.log('\nWatch the console for API calls and responses.');
}

simulateConnectionFlow();