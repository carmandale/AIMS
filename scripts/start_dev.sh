#!/bin/bash
# AIMS Full Stack Development Server Startup Script
# 
# This script starts both backend and frontend servers for local development.
# It manages both processes and provides a unified development experience.

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get the script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Change to project root
cd "$PROJECT_ROOT"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down AIMS development servers...${NC}"
    
    # Kill backend and frontend processes
    if [ ! -z "$BACKEND_PID" ]; then
        kill -TERM "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill -TERM "$FRONTEND_PID" 2>/dev/null || true
    fi
    
    # Wait a moment for processes to terminate
    sleep 2
    
    # Force kill if still running
    if [ ! -z "$BACKEND_PID" ]; then
        kill -9 "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill -9 "$FRONTEND_PID" 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✓ Servers stopped${NC}"
    exit 0
}

# Set up trap to cleanup on script exit
trap cleanup EXIT INT TERM

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}     AIMS Full Stack Development Server${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

# Check for required commands
MISSING_DEPS=0

if ! command -v uv &> /dev/null; then
    echo -e "${RED}✗ UV package manager not found${NC}"
    MISSING_DEPS=1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found${NC}"
    MISSING_DEPS=1
fi

if ! command -v yarn &> /dev/null; then
    echo -e "${RED}✗ Yarn not found${NC}"
    MISSING_DEPS=1
fi

if [ $MISSING_DEPS -eq 1 ]; then
    echo ""
    echo -e "${RED}Missing dependencies! Please install required tools first.${NC}"
    echo "See docs/local-setup.md for installation instructions."
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites found${NC}"

# Check environment setup
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file${NC}"
fi

# Run setup verification
echo ""
echo -e "${BLUE}Running setup verification...${NC}"
if uv run python scripts/verify_setup.py --skip-backend --quick > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Setup verification passed${NC}"
else
    echo -e "${YELLOW}⚠ Setup verification had warnings${NC}"
    echo "Run 'uv run python scripts/verify_setup.py' for details"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Get ports from environment
BACKEND_PORT=${API_PORT:-8000}
FRONTEND_PORT=${FRONTEND_PORT:-5173}

# Check if ports are available
echo ""
echo -e "${BLUE}Checking port availability...${NC}"

if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}✗ Backend port $BACKEND_PORT is already in use${NC}"
    exit 1
fi

if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}✗ Frontend port $FRONTEND_PORT is already in use${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Ports are available${NC}"

# Create log directory
LOG_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOG_DIR"

# Start backend server
echo ""
echo -e "${BLUE}Starting backend server...${NC}"

# Start backend in background
(
    cd "$PROJECT_ROOT"
    export PYTHONPATH="$PROJECT_ROOT:$PYTHONPATH"
    uv run uvicorn src.api.main:app \
        --host 0.0.0.0 \
        --port "$BACKEND_PORT" \
        --reload \
        --reload-dir "$PROJECT_ROOT/src" \
        --log-level info \
        2>&1 | tee "$LOG_DIR/backend.log" | sed 's/^/[BACKEND] /'
) &
BACKEND_PID=$!

# Wait for backend to start
echo -e "${BLUE}Waiting for backend to start...${NC}"
BACKEND_READY=0
for i in {1..30}; do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$BACKEND_PORT/api/health" | grep -q "200"; then
        BACKEND_READY=1
        break
    fi
    sleep 1
done

if [ $BACKEND_READY -eq 0 ]; then
    echo -e "${RED}✗ Backend failed to start${NC}"
    echo "Check logs/backend.log for details"
    exit 1
fi

echo -e "${GREEN}✓ Backend started successfully${NC}"

# Start frontend server
echo ""
echo -e "${BLUE}Starting frontend server...${NC}"

# Small delay to ensure backend is fully ready
sleep 2

# Start frontend in background
(
    cd "$PROJECT_ROOT/frontend"
    yarn dev --port "$FRONTEND_PORT" --host \
        2>&1 | tee "$LOG_DIR/frontend.log" | sed 's/^/[FRONTEND] /'
) &
FRONTEND_PID=$!

# Wait for frontend to start
echo -e "${BLUE}Waiting for frontend to start...${NC}"
FRONTEND_READY=0
for i in {1..30}; do
    if curl -s -o /dev/null "http://localhost:$FRONTEND_PORT" 2>/dev/null; then
        FRONTEND_READY=1
        break
    fi
    sleep 1
done

if [ $FRONTEND_READY -eq 0 ]; then
    echo -e "${YELLOW}⚠ Frontend may still be starting...${NC}"
fi

# Display success message
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}    AIMS Development Servers Running!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${CYAN}📡 Backend API:${NC}"
echo -e "   ${BLUE}➜${NC} API URL: http://localhost:${BACKEND_PORT}"
echo -e "   ${BLUE}➜${NC} API Docs: http://localhost:${BACKEND_PORT}/docs"
echo -e "   ${BLUE}➜${NC} Alternative Docs: http://localhost:${BACKEND_PORT}/redoc"
echo ""
echo -e "${CYAN}🎨 Frontend UI:${NC}"
echo -e "   ${BLUE}➜${NC} Application: http://localhost:${FRONTEND_PORT}"
echo ""
echo -e "${CYAN}📝 Logs:${NC}"
echo -e "   ${BLUE}➜${NC} Backend: logs/backend.log"
echo -e "   ${BLUE}➜${NC} Frontend: logs/frontend.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""

# Keep script running and show combined output
tail -f "$LOG_DIR/backend.log" "$LOG_DIR/frontend.log" 2>/dev/null | sed 's/^==>.*/\n&/' &
TAIL_PID=$!

# Wait for interrupt
wait $BACKEND_PID $FRONTEND_PID