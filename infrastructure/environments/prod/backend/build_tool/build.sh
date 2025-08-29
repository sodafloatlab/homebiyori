#!/bin/bash

# ========================================
# Homebiyori Backend Build Script
# ========================================
# This script packages Python Lambda functions and layers for Terraform deployment
# - Copies source code from backend/ to infrastructure/environments/prod/backend/src/
# - Installs dependencies from requirements.txt
# - Creates ZIP files for Lambda deployment
# ========================================

set -e  # Exit on any error

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
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../../../.." && pwd)"
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

# Clean and create directories
rm -rf "$BUILD_DIR" "$LAYERS_DIR" "$FUNCTIONS_DIR"
mkdir -p "$BUILD_DIR" "$LAYERS_DIR" "$FUNCTIONS_DIR"

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
    
    # Create ZIP file
    log_info "  Creating ZIP file for $layer_name..."
    cd "$layer_build_dir"
    zip -r "$layer_output_zip" . -q
    cd "$SCRIPT_DIR"
    
    local zip_size=$(du -h "$layer_output_zip" | cut -f1)
    log_success "  Layer $layer_name built successfully ($zip_size)"
}

# Build common layer
build_layer "common"

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
    
    # Install function-specific dependencies if requirements.txt exists
    if [[ -f "$function_build_dir/requirements.txt" ]]; then
        log_info "  Installing dependencies for $service_name..."
        pip install -r "$function_build_dir/requirements.txt" -t "$function_build_dir" --quiet
        
        if [[ $? -ne 0 ]]; then
            log_error "Failed to install dependencies for $service_name"
            return 1
        fi
        
        # Remove requirements.txt from the package
        rm "$function_build_dir/requirements.txt"
    fi
    
    # Create ZIP file
    log_info "  Creating ZIP file for $service_name..."
    cd "$function_build_dir"
    zip -r "$function_output_zip" . -q
    cd "$SCRIPT_DIR"
    
    local zip_size=$(du -h "$function_output_zip" | cut -f1)
    log_success "  Function $service_name built successfully ($zip_size)"
}

# Build main Lambda services
LAMBDA_SERVICES=(
    "user_service"
    "chat_service" 
    "tree_service"
    "health_check"
    "notification_service"
    "billing_service"
    "admin_service"
    "contact_service"
)

# Build operation services (special handling for subdirectories)
OPERATION_SERVICES=(
    "operation_service/deletion_processor"
)

for service in "${LAMBDA_SERVICES[@]}"; do
    build_function "$service"
done

# Build operation services with subdirectory support
for operation_service in "${OPERATION_SERVICES[@]}"; do
    # Extract service path components
    service_path_array=(${operation_service//\// })
    service_dir_name="${service_path_array[0]}"
    sub_service_name="${service_path_array[1]}"
    
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
        
        # Restore original backend source dir
        BACKEND_SOURCE_DIR="$BACKEND_SOURCE_DIR_BACKUP"
        rm -rf "$BUILD_DIR/services"
    else
        log_warning "Operation service directory not found: $operation_source_dir"
    fi
done

# Build Stripe webhook services
STRIPE_WEBHOOK_SERVICES=(
    "handle-payment-succeeded"
    "handle-payment-failed" 
    "handle-subscription-updated"
)

for webhook_service in "${STRIPE_WEBHOOK_SERVICES[@]}"; do
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
        
        # Restore original backend source dir
        BACKEND_SOURCE_DIR="$BACKEND_SOURCE_DIR_BACKUP"
        rm -rf "$BUILD_DIR/services"
    else
        log_warning "Stripe webhook service directory not found: $webhook_source_dir"
    fi
done

# ========================================
# Summary
# ========================================
log_success "Build completed successfully!"
log_info "Built artifacts:"

if [[ -d "$LAYERS_DIR" ]]; then
    log_info "  Lambda Layers:"
    for layer in "$LAYERS_DIR"/*.zip; do
        if [[ -f "$layer" ]]; then
            local layer_name=$(basename "$layer" .zip)
            local layer_size=$(du -h "$layer" | cut -f1)
            log_info "    - $layer_name ($layer_size)"
        fi
    done
fi

if [[ -d "$FUNCTIONS_DIR" ]]; then
    log_info "  Lambda Functions:"
    for function in "$FUNCTIONS_DIR"/*.zip; do
        if [[ -f "$function" ]]; then
            local function_name=$(basename "$function" .zip)
            local function_size=$(du -h "$function" | cut -f1)
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