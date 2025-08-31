#!/bin/bash

# ========================================
# Homebiyori Webhook Services Build Script
# ========================================
# Builds Webhook services (Stripe EventBridge handlers)
#
# Usage:
#   ./build-webhooks.sh                             # Build all webhook services
#   ./build-webhooks.sh handle-payment-succeeded    # Build only handle-payment-succeeded
#   ./build-webhooks.sh --help                      # Show help
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
    echo "Homebiyori Webhook Services Build Script"
    echo ""
    echo "Usage:"
    echo "  ./build-webhooks.sh                             # Build all webhook services"
    echo "  ./build-webhooks.sh SERVICE_NAME                # Build specific service only"
    echo "  ./build-webhooks.sh --help                      # Show this help"
    echo ""
    echo "Webhook services (Stripe EventBridge handlers):"
    echo "  handle-payment-succeeded   - Process successful payment events"
    echo "  handle-payment-failed      - Process failed payment events" 
    echo "  handle-subscription-updated - Process subscription update events"
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
WEBHOOK_SOURCE_DIR="$BACKEND_SOURCE_DIR/services/webhook_service/stripe"

log_info "Webhook Services Build Configuration:"
log_info "  Project Root: $PROJECT_ROOT"
log_info "  Backend Source: $BACKEND_SOURCE_DIR"
log_info "  Webhook Source: $WEBHOOK_SOURCE_DIR"
log_info "  Build Dir: $BUILD_DIR"
log_info "  Functions Output: $FUNCTIONS_DIR"

# ========================================
# Validation
# ========================================
if [[ ! -d "$WEBHOOK_SOURCE_DIR/handlers" ]]; then
    log_error "Webhook handlers directory not found: $WEBHOOK_SOURCE_DIR/handlers"
    exit 1
fi

# ========================================
# Setup
# ========================================
log_info "Setting up build environment for webhook services..."

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

# Build webhook handler function
build_webhook_handler() {
    local handler_name="$1"           # e.g., handle_payment_succeeded
    local service_name="$2"           # e.g., handle-payment-succeeded (for ZIP filename)
    local handler_file="$WEBHOOK_SOURCE_DIR/handlers/$handler_name.py"
    local function_build_dir="$BUILD_DIR/function_$service_name"
    local function_output_zip="$FUNCTIONS_DIR/$service_name.zip"
    
    if [[ ! -f "$handler_file" ]]; then
        log_warning "Webhook handler file not found: $handler_file"
        return 0
    fi
    
    log_info "Processing webhook handler: $service_name"
    
    # Create function build directory
    mkdir -p "$function_build_dir"
    
    # Copy webhook service shared code (models, services, database)
    log_info "  Copying webhook service shared code..."
    
    # Copy common directory if it exists
    if [[ -d "$WEBHOOK_SOURCE_DIR/common" ]]; then
        cp -r "$WEBHOOK_SOURCE_DIR/common" "$function_build_dir/"
    fi
    
    # Copy models directory if it exists
    if [[ -d "$WEBHOOK_SOURCE_DIR/models" ]]; then
        cp -r "$WEBHOOK_SOURCE_DIR/models" "$function_build_dir/"
    fi
    
    # Copy services directory if it exists
    if [[ -d "$WEBHOOK_SOURCE_DIR/services" ]]; then
        cp -r "$WEBHOOK_SOURCE_DIR/services" "$function_build_dir/"
    fi
    
    # Copy database directory if it exists
    if [[ -d "$WEBHOOK_SOURCE_DIR/database" ]]; then
        cp -r "$WEBHOOK_SOURCE_DIR/database" "$function_build_dir/"
    fi
    
    # Copy utils directory if it exists
    if [[ -d "$WEBHOOK_SOURCE_DIR/utils" ]]; then
        cp -r "$WEBHOOK_SOURCE_DIR/utils" "$function_build_dir/"
    fi
    
    # Copy the specific handler file as main handler
    log_info "  Copying handler file: $handler_name.py..."
    cp "$handler_file" "$function_build_dir/"
    
    # Copy webhook service __init__.py if it exists
    if [[ -f "$WEBHOOK_SOURCE_DIR/__init__.py" ]]; then
        cp "$WEBHOOK_SOURCE_DIR/__init__.py" "$function_build_dir/"
    fi
    
    # Remove __pycache__ directories to avoid conflicts
    find "$function_build_dir" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    
    # Install function-specific dependencies if requirements.txt exists
    if [[ -f "$WEBHOOK_SOURCE_DIR/requirements.txt" ]]; then
        log_info "  Installing dependencies for $service_name..."
        
        # Try standard pip install first
        if pip install -r "$WEBHOOK_SOURCE_DIR/requirements.txt" -t "$function_build_dir" --quiet 2>/dev/null; then
            log_info "  Dependencies installed successfully with pip"
        else
            log_warning "  Standard pip failed, trying alternative method..."
            
            # For problematic services, use full Python path with no-deps
            if command -v "C:/Users/hplat/AppData/Local/Programs/Python/Python313/python.exe" >/dev/null 2>&1; then
                if "C:/Users/hplat/AppData/Local/Programs/Python/Python313/python.exe" -m pip install -r "$WEBHOOK_SOURCE_DIR/requirements.txt" -t "$function_build_dir" --no-deps --quiet 2>/dev/null; then
                    log_info "  Dependencies installed with alternative method (no-deps)"
                else
                    log_error "Failed to install dependencies for $service_name with both methods"
                    return 1
                fi
            else
                log_error "Alternative Python path not found, dependencies installation failed for $service_name"
                return 1
            fi
        fi
    fi
    
    # Final cleanup: Remove any __pycache__ directories created during pip install
    find "$function_build_dir" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    
    # Create ZIP file
    log_info "  Creating ZIP file for $service_name..."
    create_zip "$function_build_dir" "$function_output_zip"
    
    if [[ $? -ne 0 ]]; then
        log_error "Failed to create ZIP file for webhook handler $service_name"
        return 1
    fi
    
    local zip_size=$(du -h "$function_output_zip" | cut -f1)
    log_success "Webhook handler $service_name built successfully ($zip_size)"
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

log_info "Building Webhook Lambda Functions..."

# Webhook services mapping: handler_file_name -> service_zip_name
declare -A WEBHOOK_SERVICES=(
    ["handle_payment_succeeded"]="handle-payment-succeeded"
    ["handle_payment_failed"]="handle-payment-failed" 
    ["handle_subscription_updated"]="handle-subscription-updated"
)

# Track if any service was built
SERVICES_BUILT=false

for handler_name in "${!WEBHOOK_SERVICES[@]}"; do
    service_name="${WEBHOOK_SERVICES[$handler_name]}"
    if should_build_service "$service_name"; then
        build_webhook_handler "$handler_name" "$service_name"
        SERVICES_BUILT=true
    fi
done

# Check if target service was found and built
if [[ -n "$TARGET_SERVICE" ]] && [[ "$SERVICES_BUILT" == false ]]; then
    log_error "Webhook service '$TARGET_SERVICE' not found!"
    log_info "Available webhook services: ${WEBHOOK_SERVICES[*]}"
    exit 1
fi

# ========================================
# Summary
# ========================================
log_success "Webhook services build completed successfully!"

if [[ -n "$TARGET_SERVICE" ]]; then
    log_info "Webhook service '$TARGET_SERVICE' has been packaged and is ready for deployment."
else
    log_info "All webhook services have been packaged and are ready for deployment."
fi

# Show built functions
if [[ -d "$FUNCTIONS_DIR" ]]; then
    log_info "Built Webhook Functions:"
    for function in "$FUNCTIONS_DIR"/*.zip; do
        if [[ -f "$function" ]]; then
            function_name=$(basename "$function" .zip)
            # Only show webhook services
            for service_name in "${WEBHOOK_SERVICES[@]}"; do
                if [[ "$function_name" == "$service_name" ]]; then
                    function_size=$(du -h "$function" | cut -f1)
                    log_info "  - $function_name ($function_size)"
                    break
                fi
            done
        fi
    done
fi

log_success "Webhook services build complete!"