#!/bin/bash

# ========================================
# Homebiyori Operations Build Script
# ========================================
# Builds operation services (deletion_processor, etc.)
#
# Usage:
#   ./build-operations.sh                        # Build all operation services
#   ./build-operations.sh deletion_processor     # Build only deletion_processor
#   ./build-operations.sh --help                 # Show help
# ========================================

set -e  # Exit on any error

# Parse arguments
TARGET_SERVICE=""
SHOW_HELP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            SHOW_HELP=true
            shift
            ;;
        *)
            TARGET_SERVICE="$1"
            shift
            ;;
    esac
done

# Show help if requested
if [[ "$SHOW_HELP" == true ]]; then
    echo "Homebiyori Operations Build Script"
    echo ""
    echo "Usage:"
    echo "  ./build-operations.sh                        # Build all operation services"
    echo "  ./build-operations.sh SERVICE_NAME           # Build specific service only"
    echo "  ./build-operations.sh --help                 # Show this help"
    echo ""
    echo "Operation services:"
    echo "  deletion_processor - User deletion batch processing service"
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
FUNCTIONS_DIR="$INFRASTRUCTURE_DIR/src/functions"

log_info "Operations Build Configuration:"
log_info "  Project Root: $PROJECT_ROOT"
log_info "  Backend Source: $BACKEND_SOURCE_DIR"
log_info "  Build Dir: $BUILD_DIR"
log_info "  Functions Output: $FUNCTIONS_DIR"

# ========================================
# Validation
# ========================================
if [[ ! -d "$BACKEND_SOURCE_DIR/services/operation_service" ]]; then
    log_error "Backend operation service directory not found: $BACKEND_SOURCE_DIR/services/operation_service"
    exit 1
fi

# ========================================
# Setup
# ========================================
log_info "Setting up build environment for operation services..."

# Clean build directory only, preserve existing ZIP files
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR" "$FUNCTIONS_DIR"

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

# Build function
build_function() {
    local service_name="$1"
    local service_source_dir="$BACKEND_SOURCE_DIR/services/operation_service/$service_name"
    local function_build_dir="$BUILD_DIR/function_$service_name"
    local function_output_zip="$FUNCTIONS_DIR/${service_name//_/-}.zip"
    
    if [[ ! -d "$service_source_dir" ]]; then
        log_warning "Operation service source directory not found: $service_source_dir"
        log_warning "Skipping $service_name (not implemented yet)"
        return 0
    fi
    
    log_info "Processing operation function: $service_name"
    
    # Create function build directory
    mkdir -p "$function_build_dir"
    
    # Copy function source code
    log_info "  Copying source code for $service_name..."
    cp -r "$service_source_dir"/* "$function_build_dir/"
    
    # Remove __pycache__ directories to avoid conflicts
    find "$function_build_dir" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    
    # Install function-specific dependencies if requirements.txt exists
    if [[ -f "$function_build_dir/requirements.txt" ]]; then
        log_info "  Installing dependencies for $service_name..."
        
        # Install with Linux platform target for Lambda compatibility
        if pip install -r "$function_build_dir/requirements.txt" -t "$function_build_dir" \
            --platform linux_x86_64 --implementation cp --python-version 3.13 \
            --only-binary=:all: --upgrade --quiet 2>/dev/null; then
            log_info "  Dependencies installed successfully with Linux platform target"
        else
            log_warning "  Linux platform install failed, trying no-deps fallback..."
            pip install -r "$function_build_dir/requirements.txt" -t "$function_build_dir" --no-deps --quiet
            log_info "  Dependencies installed with no-deps fallback"
        fi
        
        # Remove requirements.txt from the package
        rm "$function_build_dir/requirements.txt"
    fi
    
    # Final cleanup: Remove any __pycache__ directories created during pip install
    find "$function_build_dir" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    
    # Create ZIP file
    log_info "  Creating ZIP file for $service_name..."
    create_zip "$function_build_dir" "$function_output_zip"
    
    if [[ $? -ne 0 ]]; then
        log_error "Failed to create ZIP file for operation function $service_name"
        return 1
    fi
    
    local zip_size=$(du -h "$function_output_zip" | cut -f1)
    log_success "Operation function $service_name built successfully ($zip_size)"
}

# Check if specific service should be built
should_build_service() {
    local service_name="$1"
    
    # If no target specified, build all
    if [[ -z "$TARGET_SERVICE" ]]; then
        return 0
    fi
    
    # Check if service matches target
    if [[ "$service_name" == "$TARGET_SERVICE" ]]; then
        return 0
    fi
    
    return 1
}

# ========================================
# Main Execution
# ========================================

log_info "Building Operation Lambda Functions..."

# Operation services
OPERATION_SERVICES=(
    "deletion_processor"
)

# Track if any service was built
SERVICES_BUILT=false

for service in "${OPERATION_SERVICES[@]}"; do
    if should_build_service "$service"; then
        build_function "$service"
        SERVICES_BUILT=true
    fi
done

# Check if target service was found and built
if [[ -n "$TARGET_SERVICE" ]] && [[ "$SERVICES_BUILT" == false ]]; then
    log_error "Operation service '$TARGET_SERVICE' not found!"
    log_info "Available operation services: ${OPERATION_SERVICES[*]}"
    exit 1
fi

# ========================================
# Summary
# ========================================
log_success "Operation services build completed successfully!"

if [[ -n "$TARGET_SERVICE" ]]; then
    log_info "Operation service '$TARGET_SERVICE' has been packaged and is ready for deployment."
else
    log_info "All operation services have been packaged and are ready for deployment."
fi

# Show built functions
if [[ -d "$FUNCTIONS_DIR" ]]; then
    log_info "Built Operation Functions:"
    for function in "$FUNCTIONS_DIR"/*.zip; do
        if [[ -f "$function" ]]; then
            function_name=$(basename "$function" .zip)
            # Only show operation services (convert underscores to hyphens for comparison)
            for operation_service in "${OPERATION_SERVICES[@]}"; do
                if [[ "$function_name" == "${operation_service//_/-}" ]]; then
                    function_size=$(du -h "$function" | cut -f1)
                    log_info "  - $function_name ($function_size)"
                    break
                fi
            done
        fi
    done
fi

log_success "Operation services build complete!"