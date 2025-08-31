#!/bin/bash

# ========================================
# Homebiyori Backend Build Script
# ========================================
# This script packages Python Lambda functions and layers for Terraform deployment
# - Copies source code from backend/ to infrastructure/environments/prod/backend/src/
# - Installs dependencies from requirements.txt
# - Creates ZIP files for Lambda deployment
#
# Usage:
#   ./build.sh                    # Build all services and layers
#   ./build.sh chat_service       # Build only chat_service
#   ./build.sh --help             # Show help
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
    echo "Homebiyori Backend Build Script"
    echo ""
    echo "Usage:"
    echo "  ./build.sh                    # Build all services and layers"
    echo "  ./build.sh SERVICE_NAME       # Build specific service only"
    echo "  ./build.sh --help             # Show this help"
    echo ""
    echo "Available services:"
    echo "  user_service, chat_service, admin_service, billing_service,"
    echo "  contact_service, health_check_service, tree_service,"
    echo "  deletion_processor, webhook services"
    echo ""
    echo "Examples:"
    echo "  ./build.sh chat_service       # Build only chat_service"
    echo "  ./build.sh user_service       # Build only user_service"
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

# PowerShell ZIP function for Windows compatibility
create_zip() {
    local source_dir="$1"
    local output_zip="$2"
    
    # Convert Unix paths to Windows paths for PowerShell
    local windows_source_dir=$(cygpath -w "$source_dir")
    local windows_output_zip=$(cygpath -w "$output_zip")
    
    # Use PowerShell Compress-Archive
    powershell.exe -Command "Compress-Archive -Path '${windows_source_dir}\\*' -DestinationPath '${windows_output_zip}' -Force"
    
    if [[ $? -eq 0 ]]; then
        return 0
    else
        log_error "Failed to create ZIP file: $output_zip"
        return 1
    fi
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
FUNCTIONS_DIR="$INFRASTRUCTURE_DIR/src/functions"

log_info "Build configuration:"
log_info "  Project Root: $PROJECT_ROOT"
log_info "  Backend Source: $BACKEND_SOURCE_DIR"
log_info "  Infrastructure Dir: $INFRASTRUCTURE_DIR"
log_info "  Build Dir: $BUILD_DIR"
log_info "  Layers Output: $LAYERS_DIR"
log_info "  Functions Output: $FUNCTIONS_DIR"

# ========================================
# Validation
# ========================================
if [[ ! -d "$BACKEND_SOURCE_DIR" ]]; then
    log_error "Backend source directory not found: $BACKEND_SOURCE_DIR"
    exit 1
fi

if [[ ! -d "$BACKEND_SOURCE_DIR/services" ]]; then
    log_error "Backend services directory not found: $BACKEND_SOURCE_DIR/services"
    exit 1
fi

if [[ ! -d "$BACKEND_SOURCE_DIR/layers" ]]; then
    log_error "Backend layers directory not found: $BACKEND_SOURCE_DIR/layers"
    exit 1
fi

# ========================================
# Setup
# ========================================
log_info "Setting up build environment..."

# Clean build directory only, preserve existing ZIP files
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# ========================================
# Build Lambda Layers
# ========================================
log_info "Building Lambda Layers..."

build_layer() {
    local layer_name="$1"
    local layer_source_dir="$BACKEND_SOURCE_DIR/layers/$layer_name"
    local layer_build_dir="$BUILD_DIR/layer_$layer_name"
    local layer_output_zip="$LAYERS_DIR/$layer_name.zip"
    
    log_info "Processing layer: $layer_name"
    
    if [[ ! -d "$layer_source_dir" ]]; then
        log_warning "Layer source directory not found: $layer_source_dir"
        return 1
    fi
    
    # Create layer build directory
    mkdir -p "$layer_build_dir/python"
    
    # Copy layer source code
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
    log_success "  Layer $layer_name built successfully ($zip_size)"
}

# Build common layer only if no specific service is targeted or if layer doesn't exist
if [[ -z "$TARGET_SERVICE" ]] || [[ ! -f "$LAYERS_DIR/common.zip" ]]; then
    log_info "Building Lambda Layer: common"
    build_layer "common"
else
    log_info "Skipping layer build (common.zip already exists)"
fi

# ========================================
# Build Lambda Functions
# ========================================
log_info "Building Lambda Functions..."

build_function() {
    local service_name="$1"
    local service_source_dir="$BACKEND_SOURCE_DIR/services/$service_name"
    local function_build_dir="$BUILD_DIR/function_$service_name"
    local function_output_zip="$FUNCTIONS_DIR/$service_name.zip"
    
    log_info "Processing function: $service_name"
    
    if [[ ! -d "$service_source_dir" ]]; then
        log_warning "Service source directory not found: $service_source_dir"
        return 1
    fi
    
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
        
        # Try standard pip install first
        if pip install -r "$function_build_dir/requirements.txt" -t "$function_build_dir" --quiet 2>/dev/null; then
            log_info "  Dependencies installed successfully with pip"
        else
            log_warning "  Standard pip failed, trying alternative method..."
            
            # For problematic services like chat_service, use full Python path with no-deps
            if command -v "C:/Users/hplat/AppData/Local/Programs/Python/Python313/python.exe" >/dev/null 2>&1; then
                if "C:/Users/hplat/AppData/Local/Programs/Python/Python313/python.exe" -m pip install -r "$function_build_dir/requirements.txt" -t "$function_build_dir" --no-deps --quiet 2>/dev/null; then
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
        
        # Remove requirements.txt from the package
        rm "$function_build_dir/requirements.txt"
    fi
    
    # Final cleanup: Remove any __pycache__ directories created during pip install
    find "$function_build_dir" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    
    # Create ZIP file
    log_info "  Creating ZIP file for $service_name..."
    create_zip "$function_build_dir" "$function_output_zip"
    
    if [[ $? -ne 0 ]]; then
        log_error "Failed to create ZIP file for function $service_name"
        return 1
    fi
    
    local zip_size=$(du -h "$function_output_zip" | cut -f1)
    log_success "  Function $service_name built successfully ($zip_size)"
}

# Build main Lambda services
LAMBDA_SERVICES=(
    "user_service"
    "chat_service" 
    "tree_service"
    "health_check_service"
    "notification_service"
    "billing_service"
    "admin_service"
    "contact_service"
)

# Build operation services (special handling for subdirectories)
OPERATION_SERVICES=(
    "operation_service/deletion_processor"
)

# Check if specific service should be built
should_build_service() {
    local service_name="$1"
    
    # If no target specified, build all
    if [[ -z "$TARGET_SERVICE" ]]; then
        return 0
    fi
    
    # Check if service matches target (handle different naming formats)
    if [[ "$service_name" == "$TARGET_SERVICE" ]] || \
       [[ "$(basename "$service_name")" == "$TARGET_SERVICE" ]] || \
       [[ "$service_name" == *"$TARGET_SERVICE"* ]]; then
        return 0
    fi
    
    return 1
}

# Track if any service was built
SERVICES_BUILT=false

for service in "${LAMBDA_SERVICES[@]}"; do
    if should_build_service "$service"; then
        build_function "$service"
        SERVICES_BUILT=true
    fi
done

# Build operation services with subdirectory support
for operation_service in "${OPERATION_SERVICES[@]}"; do
    # Extract service path components
    service_path_array=(${operation_service//\// })
    service_dir_name="${service_path_array[0]}"
    sub_service_name="${service_path_array[1]}"
    
    if should_build_service "$sub_service_name" || should_build_service "$operation_service"; then
        # Full path to the operation service
        operation_source_dir="$BACKEND_SOURCE_DIR/services/$operation_service"
        
        if [[ -d "$operation_source_dir" ]]; then
            # Create a temporary service structure 
            temp_service_dir="$BUILD_DIR/temp_${sub_service_name}"
            mkdir -p "$temp_service_dir"
            cp -r "$operation_source_dir"/* "$temp_service_dir/"
            
            # Update the service source dir for build_function
            BACKEND_SOURCE_DIR_BACKUP="$BACKEND_SOURCE_DIR"
            BACKEND_SOURCE_DIR="$BUILD_DIR"
            mkdir -p "$BUILD_DIR/services"
            mv "$temp_service_dir" "$BUILD_DIR/services/${sub_service_name}"
            
            build_function "${sub_service_name}"
            SERVICES_BUILT=true
            
            # Restore original backend source dir
            BACKEND_SOURCE_DIR="$BACKEND_SOURCE_DIR_BACKUP"
            rm -rf "$BUILD_DIR/services"
        else
            log_warning "Operation service directory not found: $operation_source_dir"
        fi
    fi
done

# Build Stripe webhook services
STRIPE_WEBHOOK_SERVICES=(
    "handle-payment-succeeded"
    "handle-payment-failed" 
    "handle-subscription-updated"
)

for webhook_service in "${STRIPE_WEBHOOK_SERVICES[@]}"; do
    if should_build_service "$webhook_service"; then
        # Stripe webhook services are typically in webhook_service/stripe/handlers/
        webhook_source_dir="$BACKEND_SOURCE_DIR/services/webhook_service/stripe/handlers/$webhook_service"
        if [[ -d "$webhook_source_dir" ]]; then
            # Create a temporary service structure for the webhook handler
            temp_service_dir="$BUILD_DIR/temp_$webhook_service"
            mkdir -p "$temp_service_dir"
            cp -r "$webhook_source_dir"/* "$temp_service_dir/"
            
            # Copy common webhook files if they exist
            common_webhook_dir="$BACKEND_SOURCE_DIR/services/webhook_service/stripe/common"
            if [[ -d "$common_webhook_dir" ]]; then
                cp -r "$common_webhook_dir"/* "$temp_service_dir/"
            fi
            
            # Update the service source dir for build_function
            BACKEND_SOURCE_DIR_BACKUP="$BACKEND_SOURCE_DIR"
            BACKEND_SOURCE_DIR="$BUILD_DIR"
            mkdir -p "$BUILD_DIR/services"
            mv "$temp_service_dir" "$BUILD_DIR/services/$webhook_service"
            
            build_function "$webhook_service"
            SERVICES_BUILT=true
            
            # Restore original backend source dir
            BACKEND_SOURCE_DIR="$BACKEND_SOURCE_DIR_BACKUP"
            rm -rf "$BUILD_DIR/services"
        else
            log_warning "Stripe webhook service directory not found: $webhook_source_dir"
        fi
    fi
done

# Check if target service was found and built
if [[ -n "$TARGET_SERVICE" ]] && [[ "$SERVICES_BUILT" == false ]]; then
    log_error "Service '$TARGET_SERVICE' not found!"
    log_info "Available services:"
    log_info "  Main services: ${LAMBDA_SERVICES[*]}"
    log_info "  Operation services: ${OPERATION_SERVICES[*]}"
    log_info "  Webhook services: ${STRIPE_WEBHOOK_SERVICES[*]}"
    exit 1
fi

# ========================================
# Summary
# ========================================
log_success "Build completed successfully!"
if [[ -n "$TARGET_SERVICE" ]]; then
    log_info "Service '$TARGET_SERVICE' has been packaged and is ready for Terraform deployment."
else
    log_info "All services have been packaged and are ready for Terraform deployment."
fi

log_info "Built artifacts:"

if [[ -d "$LAYERS_DIR" ]]; then
    log_info "  Lambda Layers:"
    for layer in "$LAYERS_DIR"/*.zip; do
        if [[ -f "$layer" ]]; then
            layer_name=$(basename "$layer" .zip)
            layer_size=$(du -h "$layer" | cut -f1)
            log_info "    - $layer_name ($layer_size)"
        fi
    done
fi

if [[ -d "$FUNCTIONS_DIR" ]]; then
    log_info "  Lambda Functions:"
    for function in "$FUNCTIONS_DIR"/*.zip; do
        if [[ -f "$function" ]]; then
            function_name=$(basename "$function" .zip)
            function_size=$(du -h "$function" | cut -f1)
            log_info "    - $function_name ($function_size)"
        fi
    done
fi

# ========================================
# Cleanup
# ========================================
log_info "Cleaning up build directory..."
rm -rf "$BUILD_DIR"

log_success "All done! Ready for Terraform deployment."