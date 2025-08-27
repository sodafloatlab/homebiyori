# Homebiyori Backend Build Guide

This directory contains scripts to build and package Lambda functions and layers for Terraform deployment.

## Overview

The build process:
1. Copies source code from `backend/` to `infrastructure/environments/prod/backend/src/`
2. Installs dependencies from `requirements.txt` files
3. Creates ZIP files for Lambda deployment

## Directory Structure

```
infrastructure/environments/prod/backend/
├── src/
│   ├── layers/           # Lambda Layer ZIP files
│   │   └── common.zip
│   └── functions/        # Lambda Function ZIP files
│       ├── user_service.zip
│       ├── chat_service.zip
│       ├── tree_service.zip
│       ├── health_check.zip
│       ├── notification_service.zip
│       ├── billing_service.zip
│       ├── admin_service.zip
│       ├── contact_service.zip
│       ├── handle-payment-succeeded.zip
│       ├── handle-payment-failed.zip
│       └── handle-subscription-updated.zip
├── build/                # Build scripts directory
│   ├── build.sh          # Linux/macOS build script
│   ├── build.bat         # Windows build script
│   └── BUILD_README.md   # This file
```

## Prerequisites

- Python 3.12 installed
- pip package manager
- zip utility (Linux/macOS) or PowerShell (Windows)

## Build Commands

### Linux/macOS/Git Bash
```bash
cd build
./build.sh
```

### Windows Command Prompt
```cmd
cd build
build.bat
```

### Windows PowerShell
```powershell
cd build
.\build.bat
```

## Expected Source Structure

The build script expects the following source structure in the backend directory:

```
backend/
├── services/
│   ├── user_service/
│   │   ├── main.py
│   │   ├── handler.py
│   │   └── requirements.txt (optional)
│   ├── chat_service/
│   ├── tree_service/
│   ├── health_check/
│   ├── notification_service/
│   ├── billing_service/
│   ├── admin_service/
│   ├── contact_service/
│   └── webhook_service/
│       └── stripe/
│           ├── handlers/
│           │   ├── handle-payment-succeeded/
│           │   ├── handle-payment-failed/
│           │   └── handle-subscription-updated/
│           └── common/         # Shared webhook utilities
└── layers/
    └── common/
        ├── requirements.txt
        └── *.py (optional)
```

## Build Process Details

### Lambda Layers
1. **Common Layer**: Installs dependencies from `backend/layers/common/requirements.txt`
2. Creates `src/layers/common.zip` with all dependencies in `python/` directory structure

### Lambda Functions
1. **Main Services**: Copies each service directory and installs service-specific dependencies
2. **Stripe Webhooks**: Combines handler-specific code with common webhook utilities
3. Creates individual ZIP files in `src/functions/`

## Troubleshooting

### Common Issues

1. **Dependencies not installing**: Make sure pip is in PATH and you have internet access
2. **ZIP creation fails**: Ensure you have zip utility (Linux/macOS) or PowerShell (Windows)
3. **Source directory not found**: Verify the backend source structure matches expectations

### Debug Mode
Add `set -x` (Linux/macOS) or `echo on` (Windows) at the top of the build script for verbose output.

## Integration with Terraform

After running the build script, you can deploy with Terraform:

```bash
terraform init
terraform plan
terraform apply
```

The Terraform configuration automatically references the ZIP files created by the build script using `filebase64sha256()` for source code hash calculation.

## Clean Build

To ensure a clean build:

1. Delete the `src/` directory
2. Run the build script from the `build/` directory
3. All artifacts will be recreated fresh

## Performance Notes

- Layer builds are slower due to dependency installation
- Function builds are faster as they mainly copy source files
- Build time scales with the number of dependencies in requirements.txt files

## Security Notes

- The build script does not include secrets or credentials in ZIP files
- requirements.txt files are removed from function packages after dependency installation
- All temporary build directories are cleaned up automatically