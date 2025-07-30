#!/bin/bash
# AIMS Backend Development Server Startup Script
# 
# This script starts the FastAPI backend server with auto-reload for development.
# It handles environment setup, dependency checking, and graceful startup.

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

# Change to project root
cd "$PROJECT_ROOT"

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}  AIMS Backend Development Server${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Warning: .env file not found!${NC}"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${GREEN}Created .env file. Please update it with your settings.${NC}"
fi

# Check if UV is installed
if ! command -v uv &> /dev/null; then
    echo -e "${RED}Error: UV package manager not found!${NC}"
    echo "Please install UV first: https://github.com/astral-sh/uv"
    exit 1
fi

# Sync dependencies
echo -e "${BLUE}Checking Python dependencies...${NC}"
uv sync

# Check if database exists
if [ ! -f "aims.db" ]; then
    echo -e "${YELLOW}Database not found. Initializing...${NC}"
    uv run python scripts/init_db.py
fi

# Run quick verification
echo -e "${BLUE}Running quick verification...${NC}"
if uv run python scripts/verify_setup.py --skip-backend --quick > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Verification passed${NC}"
else
    echo -e "${YELLOW}⚠ Verification had warnings. Check with: uv run python scripts/verify_setup.py${NC}"
fi

# Get port from environment or use default
PORT=${API_PORT:-8002}
HOST=${API_HOST:-0.0.0.0}

# Check if port is already in use
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}Error: Port $PORT is already in use!${NC}"
    echo "Either stop the existing process or change API_PORT in .env"
    exit 1
fi

# Start the backend server
echo ""
echo -e "${GREEN}Starting backend server...${NC}"
echo -e "${BLUE}➜ API URL: http://localhost:${PORT}${NC}"
echo -e "${BLUE}➜ API Docs: http://localhost:${PORT}/docs${NC}"
echo -e "${BLUE}➜ Alternative Docs: http://localhost:${PORT}/redoc${NC}"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Set development environment variables
export PYTHONPATH="$PROJECT_ROOT:$PYTHONPATH"

# Start uvicorn with auto-reload
exec uv run uvicorn src.api.main:app \
    --host "$HOST" \
    --port "$PORT" \
    --reload \
    --reload-dir "$PROJECT_ROOT/src" \
    --log-level info