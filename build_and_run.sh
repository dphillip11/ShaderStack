#!/bin/bash

# WebGPU Shader Editor - Build and Run Script
# This script builds the Svelte frontend and runs the Go backend server

set -e  # Exit on any error

echo "🚀 WebGPU Shader Editor - Build and Run"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "go.mod" ]; then
    print_error "go.mod not found. Please run this script from the project root directory."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js to build the frontend."
    exit 1
fi

# Check if Go is installed
if ! command -v go &> /dev/null; then
    print_error "Go is not installed. Please install Go to build the backend."
    exit 1
fi

# Parse command line arguments
SKIP_FRONTEND=false
SKIP_BACKEND=false
DEV_MODE=false
PORT=8080

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-frontend)
            SKIP_FRONTEND=true
            shift
            ;;
        --skip-backend)
            SKIP_BACKEND=true
            shift
            ;;
        --dev)
            DEV_MODE=true
            shift
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-frontend    Skip building the Svelte frontend"
            echo "  --skip-backend     Skip building the Go backend"
            echo "  --dev              Run in development mode (with file watching)"
            echo "  --port PORT        Set the server port (default: 8080)"
            echo "  -h, --help         Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Build Svelte frontend
if [ "$SKIP_FRONTEND" = false ]; then
    print_status "Building Svelte frontend..."
    
    cd static/svelte
    
    # Check if node_modules exists, if not install dependencies
    if [ ! -d "node_modules" ]; then
        print_status "Installing npm dependencies..."
        npm install
    fi
    
    # Build the frontend
    if [ "$DEV_MODE" = true ]; then
        print_status "Building frontend in development mode..."
        npm run build:dev 2>/dev/null || npm run build
    else
        print_status "Building frontend for production..."
        npm run build
    fi
    
    cd ../..
    print_success "Frontend build completed"
else
    print_warning "Skipping frontend build"
fi

# Build Go backend
if [ "$SKIP_BACKEND" = false ]; then
    print_status "Building Go backend..."
    
    # Download Go dependencies
    print_status "Downloading Go dependencies..."
    go mod download
    go mod tidy
    
    # Build the Go binary
    print_status "Compiling Go server..."
    go build -o main cmd/server/main.go
    
    print_success "Backend build completed"
else
    print_warning "Skipping backend build"
fi

# Check if the binary was created
if [ ! -f "main" ]; then
    print_error "Failed to build the server binary"
    exit 1
fi

# Make sure data directory exists
if [ ! -d "data" ]; then
    print_status "Creating data directory..."
    mkdir -p data
fi

# Initialize data files if they don't exist
if [ ! -f "data/users.json" ]; then
    print_status "Initializing users.json..."
    echo '[]' > data/users.json
fi

if [ ! -f "data/shaders.json" ]; then
    print_status "Initializing shaders.json..."
    echo '[]' > data/shaders.json
fi

if [ ! -f "data/tags.json" ]; then
    print_status "Initializing tags.json..."
    echo '[]' > data/tags.json
fi

# Set environment variables
export PORT=$PORT

print_success "Build completed successfully!"
echo ""
print_status "Starting WebGPU Shader Editor server..."
print_status "Server will be available at: http://localhost:$PORT"
print_status "Press Ctrl+C to stop the server"
echo ""

# Run the server
if [ "$DEV_MODE" = true ]; then
    print_status "Running in development mode..."
    # In dev mode, you might want to use air or similar for hot reloading
    if command -v air &> /dev/null; then
        air
    else
        ./main
    fi
else
    ./main
fi