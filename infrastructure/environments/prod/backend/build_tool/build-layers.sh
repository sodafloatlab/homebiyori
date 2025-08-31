#!/bin/bash

# ========================================
# Homebiyori Lambda Layers Build Script
# ========================================
# Builds Lambda Layers (common, ai, etc.)
#
# Usage:
#   ./build-layers.sh           # Build all layers
#   ./build-layers.sh common    # Build only common layer
#   ./build-layers.sh --help    # Show help
# ========================================

set -e  # Exit on any error

# Parse arguments
TARGET_LAYER=""
SHOW_HELP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            SHOW_HELP=true
            shift
            ;;
        *)
            TARGET_LAYER="$1"
            shift
            ;;
    esac
done

# Show help if requested
if [[ "$SHOW_HELP" == true ]]; then
    echo "Homebiyori Lambda Layers Build Script"
    echo ""
    echo "Usage:"
    echo "  ./build-layers.sh           # Build all layers"
    echo "  ./build-layers.sh LAYER     # Build specific layer"
    echo "  ./build-layers.sh --help    # Show this help"
    echo ""
    echo "Available layers:"
    echo "  common - Common dependencies (FastAPI, boto3, pydantic, etc.)"
    echo ""
    exit 0
fi

# Color output functions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# ========================================
# Configuration
# ========================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"
BACKEND_SOURCE_DIR="$PROJECT_ROOT/backend"
INFRASTRUCTURE_DIR="$SCRIPT_DIR/.."
BUILD_DIR="$INFRASTRUCTURE_DIR/build"
LAYERS_DIR="$INFRASTRUCTURE_DIR/src/layers"

log_info "Lambda Layers Build Configuration:"
log_info "  Project Root: $PROJECT_ROOT"
log_info "  Backend Source: $BACKEND_SOURCE_DIR"
log_info "  Build Dir: $BUILD_DIR"
log_info "  Layers Output: $LAYERS_DIR"

# ========================================
# Validation
# ========================================
if [[ ! -d "$BACKEND_SOURCE_DIR/layers" ]]; then
    log_error "Backend layers directory not found: $BACKEND_SOURCE_DIR/layers"
    exit 1
fi

# ========================================
# Setup
# ========================================
log_info "Setting up build environment for layers..."

# Clean build directory only, preserve existing ZIP files
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR" "$LAYERS_DIR"

# ========================================
# Build Functions
# ========================================

# PowerShell ZIP creation function
create_zip() {
    local source_dir="$1"
    local output_zip="$2"
    local windows_source_dir=$(cygpath -w "$source_dir")
    local windows_output_zip=$(cygpath -w "$output_zip")
    powershell.exe -Command "Compress-Archive -Path '${windows_source_dir}\\*' -DestinationPath '${windows_output_zip}' -Force"
}

# Build layer function
build_layer() {
    local layer_name="$1"
    local layer_source_dir="$BACKEND_SOURCE_DIR/layers/$layer_name"
    local layer_build_dir="$BUILD_DIR/layer_$layer_name"
    local layer_output_zip="$LAYERS_DIR/$layer_name.zip"
    
    if [[ ! -d "$layer_source_dir" ]]; then
        log_error "Layer source directory not found: $layer_source_dir"
        return 1
    fi
    
    log_info "Building layer: $layer_name"
    mkdir -p "$layer_build_dir/python"
    
    # Install layer dependencies
    if [[ -f "$layer_source_dir/requirements.txt" ]]; then
        log_info "  Installing dependencies for $layer_name..."
        pip install -r "$layer_source_dir/requirements.txt" -t "$layer_build_dir/python" --quiet
        
        if [[ $? -ne 0 ]]; then
            log_error "Failed to install dependencies for $layer_name"
            return 1
        fi
    fi
    
    # Copy any Python files from layer source
    if ls "$layer_source_dir"/*.py 1> /dev/null 2>&1; then
        log_info "  Copying Python files for $layer_name..."
        cp "$layer_source_dir"/*.py "$layer_build_dir/python/"
    fi
    
    # Copy python subdirectory if it exists
    if [[ -d "$layer_source_dir/python" ]]; then
        log_info "  Copying python directory for $layer_name..."
        cp -r "$layer_source_dir/python/"* "$layer_build_dir/python/"
    fi
    
    # Remove any __pycache__ directories from layer build
    find "$layer_build_dir" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    
    # Create ZIP file
    log_info "  Creating ZIP file for $layer_name..."
    create_zip "$layer_build_dir" "$layer_output_zip"
    
    if [[ $? -ne 0 ]]; then
        log_error "Failed to create ZIP file for layer $layer_name"
        return 1
    fi
    
    local zip_size=$(du -h "$layer_output_zip" | cut -f1)
    log_success "Layer $layer_name built successfully ($zip_size)"
}

# Check if specific layer should be built
should_build_layer() {
    local layer_name="$1"
    
    # If no target specified, build all
    if [[ -z "$TARGET_LAYER" ]]; then
        return 0
    fi
    
    # Check if layer matches target
    if [[ "$layer_name" == "$TARGET_LAYER" ]]; then
        return 0
    fi
    
    return 1
}

# ========================================
# Main Execution
# ========================================

log_info "Building Lambda Layers..."

# Available layers
AVAILABLE_LAYERS=(
    "common"
)

# Track if any layer was built
LAYERS_BUILT=false

for layer in "${AVAILABLE_LAYERS[@]}"; do
    if should_build_layer "$layer"; then
        build_layer "$layer"
        LAYERS_BUILT=true
    fi
done

# Check if target layer was found and built
if [[ -n "$TARGET_LAYER" ]] && [[ "$LAYERS_BUILT" == false ]]; then
    log_error "Layer '$TARGET_LAYER' not found!"
    log_info "Available layers: ${AVAILABLE_LAYERS[*]}"
    exit 1
fi

# ========================================
# Summary
# ========================================
log_success "Layers build completed successfully!"

if [[ -n "$TARGET_LAYER" ]]; then
    log_info "Layer '$TARGET_LAYER' has been packaged and is ready for deployment."
else
    log_info "All layers have been packaged and are ready for deployment."
fi

# Show built layers
if [[ -d "$LAYERS_DIR" ]]; then
    log_info "Built Lambda Layers:"
    for layer in "$LAYERS_DIR"/*.zip; do
        if [[ -f "$layer" ]]; then
            layer_name=$(basename "$layer" .zip)
            layer_size=$(du -h "$layer" | cut -f1)
            log_info "  - $layer_name ($layer_size)"
        fi
    done
fi

log_success "Lambda Layers build complete!"