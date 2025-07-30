#!/bin/bash
# AIMS Frontend Development Server Startup Script
# 
# This script starts the React frontend development server with hot-reload.
# It handles dependency checking and provides a smooth startup experience.

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Change to frontend directory
cd "$FRONTEND_DIR"

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}  AIMS Frontend Development Server${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js not found!${NC}"
    echo "Please install Node.js 24.0 or later: https://nodejs.org/"
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 24 ]; then
    echo -e "${YELLOW}Warning: Node.js version is less than 24.0${NC}"
    echo "Current version: $(node -v)"
    echo "Recommended: v24.0.0 or later"
fi

# Check if Yarn is installed
if ! command -v yarn &> /dev/null; then
    echo -e "${RED}Error: Yarn not found!${NC}"
    echo "Installing Yarn..."
    npm install -g yarn
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Dependencies not installed. Installing...${NC}"
    yarn install
fi

# Check if dependencies are up to date
echo -e "${BLUE}Checking frontend dependencies...${NC}"
if yarn install --frozen-lockfile --check-files > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Dependencies up to date${NC}"
else
    echo -e "${YELLOW}Updating dependencies...${NC}"
    yarn install
fi

# Backend connection test
echo "🔗 Testing backend connection..."
BACKEND_URL="http://localhost:8002"
echo -e "${BLUE}Checking backend API at $BACKEND_URL...${NC}"

if curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health" | grep -q "200"; then
    echo -e "${GREEN}✓ Backend API is running${NC}"
else
    echo -e "${YELLOW}⚠ Backend API not detected at $BACKEND_URL${NC}"
    echo "Start the backend first with: ./scripts/start_backend.sh"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Get port from environment or use default
PORT=${FRONTEND_PORT:-3000}

# Check if port is already in use
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}Error: Port $PORT is already in use!${NC}"
    echo "Either stop the existing process or change the port"
    exit 1
fi

# Start the frontend server
echo ""
echo -e "${GREEN}Starting frontend server...${NC}"
echo -e "${BLUE}➜ Frontend URL: http://localhost:${PORT}${NC}"
echo -e "${BLUE}➜ Backend API: $BACKEND_URL${NC}"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start Vite dev server
exec yarn dev --port "$PORT" --host