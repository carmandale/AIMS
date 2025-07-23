#!/bin/bash

# Script to run the connect-all-accounts test with headed mode and debug options

echo "Running connect-all-accounts test in debug mode (Chromium only)..."
echo "This will open a browser window where you can see the test execution."
echo ""
echo "IMPORTANT: When the OAuth popup opens for each broker:"
echo "1. Complete the connection in the popup window"
echo "2. The test will wait for the 'I've Completed the Connection' button"
echo "3. Click the button to continue the test"
echo ""
echo "Starting the test with slowmo to make actions visible..."
echo ""

# Change to e2e-tests directory
cd e2e-tests

# Run the specific test file in headed mode with debug options
npx playwright test tests/connect-all-accounts.spec.ts \
  --headed \
  --workers=1 \
  --browser=chromium \
  --timeout=300000 \
  --grep "should connect all three required accounts" \
  --debug

echo ""
echo "Test completed. Check the screenshots in e2e-tests/screenshots/all-accounts/"