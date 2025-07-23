#!/bin/bash

# Script to run the connect-all-accounts test with headed mode and focus on the main test

echo "========================================"
echo "Running Connect All Accounts Test"
echo "========================================"
echo ""
echo "This test will:"
echo "1. Open the AIMS application"
echo "2. Navigate to Connect Brokerage"
echo "3. Complete SnapTrade registration"
echo "4. Attempt to connect to Fidelity, Robinhood, and Coinbase"
echo ""
echo "IMPORTANT: When connecting to each broker:"
echo "- If a popup opens: Complete the connection in the popup"
echo "- Look for 'I've Completed the Connection' button and click it"
echo "- The test will capture screenshots at each step"
echo ""
echo "Press Enter to start the test..."
read

# Ensure we're in the right directory
cd "/Users/dalecarman/Groove Jones Dropbox/Dale Carman/Projects/dev/AIMS"

# Make sure the backend and frontend are running
echo "Checking if services are running..."
if ! lsof -ti:8000 > /dev/null; then
    echo "Backend not running on port 8000. Please start it first with: uv run uvicorn backend.main:app --reload"
    exit 1
fi

if ! lsof -ti:5173 > /dev/null; then
    echo "Frontend not running on port 5173. Please start it first with: npm run dev"
    exit 1
fi

echo "Services are running. Starting test..."
echo ""

# Change to e2e-tests directory
cd e2e-tests

# Clear previous screenshots
echo "Clearing previous screenshots..."
rm -rf screenshots/all-accounts/*

# Run the specific test in headed mode
npx playwright test tests/connect-all-accounts.spec.ts \
  --headed \
  --workers=1 \
  --project=chromium \
  --timeout=300000 \
  --grep "should connect all three required accounts" \
  --reporter=list

echo ""
echo "========================================"
echo "Test completed!"
echo "========================================"
echo ""
echo "Screenshots saved in: e2e-tests/screenshots/all-accounts/"
echo ""
echo "To view the screenshots:"
echo "  open e2e-tests/screenshots/all-accounts/"