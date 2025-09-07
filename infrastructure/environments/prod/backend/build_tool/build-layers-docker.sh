#!/bin/bash

# ========================================
# Docker-based Lambda Layers Build Script  
# ========================================
# Uses Docker to build Lambda layers in a Linux environment
# This ensures binary compatibility with AWS Lambda runtime

set -e

# Color output functions
RED='\033[0;31m'
GREEN='\033[0;32m' 
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"
BACKEND_SOURCE_DIR="$PROJECT_ROOT/backend"
INFRASTRUCTURE_DIR="$SCRIPT_DIR/.."
LAYERS_DIR="$INFRASTRUCTURE_DIR/src/layers"

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed or not available in PATH"
    log_info "Please install Docker Desktop for Windows"
    exit 1
fi

log_info "Building Lambda Layer with Docker for Linux compatibility..."

# Create output directory
mkdir -p "$LAYERS_DIR"

# Docker build command for Lambda Layer
log_info "Running Docker container to build Python packages..."

# Convert Windows paths to Docker-compatible format
# Use absolute Unix-style paths for Docker
SOURCE_ABS_PATH=$(cd "$BACKEND_SOURCE_DIR/layers/common" && pwd)
OUTPUT_ABS_PATH=$(cd "$(dirname "$LAYERS_DIR")" && pwd)/$(basename "$LAYERS_DIR")

# Convert to Unix paths for Docker
DOCKER_SOURCE_PATH=$(echo "$SOURCE_ABS_PATH" | sed 's|^/c|/c|')
DOCKER_OUTPUT_PATH=$(echo "$OUTPUT_ABS_PATH" | sed 's|^/c|/c|')

log_info "Docker source path: $DOCKER_SOURCE_PATH"
log_info "Docker output path: $DOCKER_OUTPUT_PATH"

# Use MSYS_NO_PATHCONV to prevent path conversion issues
export MSYS_NO_PATHCONV=1

docker run --rm \
  -v "$DOCKER_SOURCE_PATH:/app/source" \
  -v "$DOCKER_OUTPUT_PATH:/app/output" \
  -w /app \
  python:3.13-slim \
  bash -c "
    set -e
    echo 'Installing build dependencies...'
    apt-get update -q
    apt-get install -y -q gcc g++ make zip
    
    echo 'Creating layer structure...'
    mkdir -p /app/layer/python
    
    echo 'Installing Python packages...'
    pip install --upgrade pip
    pip install -r /app/source/requirements.txt -t /app/layer/python
    
    echo 'Copying any additional files...'
    if [ -d /app/source/python ]; then
      cp -r /app/source/python/* /app/layer/python/
    fi
    
    echo 'Cleaning up unnecessary files...'
    find /app/layer -name '__pycache__' -type d -exec rm -rf {} + 2>/dev/null || true
    find /app/layer -name '*.pyc' -delete 2>/dev/null || true
    
    echo 'Creating ZIP file...'
    cd /app/layer
    zip -r /app/output/common.zip . -x '*.pyc' '*/__pycache__/*'
    
    echo 'Verifying pydantic-core binary...'
    find /app/layer -name '*pydantic_core*' -type f | grep -E '\.(so|pyd)$' || echo 'No pydantic-core binary found'
    
    echo 'Build completed successfully!'
    ls -la /app/output/
  "

if [ $? -eq 0 ]; then
    log_success "Docker build completed successfully!"
    
    # Show file info
    if [ -f "$LAYERS_DIR/common.zip" ]; then
        local zip_size=$(du -h "$LAYERS_DIR/common.zip" | cut -f1)
        log_success "Lambda Layer created: common.zip ($zip_size)"
        
        # Verify contents
        log_info "Verifying pydantic-core binary..."
        unzip -l "$LAYERS_DIR/common.zip" | grep pydantic_core | grep -E "\.(so|pyd)$" || log_warning "No pydantic-core binary found"
    else
        log_error "ZIP file was not created"
        exit 1
    fi
else
    log_error "Docker build failed"
    exit 1
fi

log_success "Lambda Layer build with Docker completed!"