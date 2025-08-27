@echo off
REM ========================================
REM Homebiyori Backend Build Script (Windows)
REM ========================================
REM This script packages Python Lambda functions and layers for Terraform deployment
REM - Copies source code from backend/ to infrastructure/environments/prod/backend/src/
REM - Installs dependencies from requirements.txt
REM - Creates ZIP files for Lambda deployment
REM ========================================

setlocal enabledelayedexpansion

REM Color output (limited support in Windows cmd)
set "INFO_PREFIX=[INFO]"
set "SUCCESS_PREFIX=[SUCCESS]"
set "WARNING_PREFIX=[WARNING]"
set "ERROR_PREFIX=[ERROR]"

REM ========================================
REM Configuration
REM ========================================
set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%.."
set "PROJECT_ROOT=%BACKEND_DIR%..\..\..\..\..\"
set "BACKEND_SOURCE_DIR=%PROJECT_ROOT%backend"
set "INFRASTRUCTURE_DIR=%BACKEND_DIR%"
set "BUILD_DIR=%SCRIPT_DIR%temp"
set "LAYERS_DIR=%INFRASTRUCTURE_DIR%\src\layers"
set "FUNCTIONS_DIR=%INFRASTRUCTURE_DIR%\src\functions"

echo %INFO_PREFIX% Build configuration:
echo %INFO_PREFIX%   Project Root: %PROJECT_ROOT%
echo %INFO_PREFIX%   Backend Source: %BACKEND_SOURCE_DIR%
echo %INFO_PREFIX%   Infrastructure Dir: %INFRASTRUCTURE_DIR%
echo %INFO_PREFIX%   Build Dir: %BUILD_DIR%
echo %INFO_PREFIX%   Layers Output: %LAYERS_DIR%
echo %INFO_PREFIX%   Functions Output: %FUNCTIONS_DIR%

REM ========================================
REM Validation
REM ========================================
if not exist "%BACKEND_SOURCE_DIR%" (
    echo %ERROR_PREFIX% Backend source directory not found: %BACKEND_SOURCE_DIR%
    exit /b 1
)

if not exist "%BACKEND_SOURCE_DIR%\services" (
    echo %ERROR_PREFIX% Backend services directory not found: %BACKEND_SOURCE_DIR%\services
    exit /b 1
)

if not exist "%BACKEND_SOURCE_DIR%\layers" (
    echo %ERROR_PREFIX% Backend layers directory not found: %BACKEND_SOURCE_DIR%\layers
    exit /b 1
)

REM ========================================
REM Setup
REM ========================================
echo %INFO_PREFIX% Setting up build environment...

REM Clean and create directories
if exist "%BUILD_DIR%" rmdir /s /q "%BUILD_DIR%"
if exist "%LAYERS_DIR%" rmdir /s /q "%LAYERS_DIR%"
if exist "%FUNCTIONS_DIR%" rmdir /s /q "%FUNCTIONS_DIR%"

mkdir "%BUILD_DIR%"
mkdir "%LAYERS_DIR%"
mkdir "%FUNCTIONS_DIR%"

REM ========================================
REM Build Lambda Layers
REM ========================================
echo %INFO_PREFIX% Building Lambda Layers...

REM Build common layer
set "layer_name=common"
set "layer_source_dir=%BACKEND_SOURCE_DIR%\layers\%layer_name%"
set "layer_build_dir=%BUILD_DIR%\layer_%layer_name%"
set "layer_output_zip=%LAYERS_DIR%\%layer_name%.zip"

echo %INFO_PREFIX% Processing layer: %layer_name%

if not exist "%layer_source_dir%" (
    echo %WARNING_PREFIX% Layer source directory not found: %layer_source_dir%
    goto :skip_layer
)

REM Create layer build directory
mkdir "%layer_build_dir%\python"

REM Install dependencies if requirements.txt exists
if exist "%layer_source_dir%\requirements.txt" (
    echo %INFO_PREFIX%   Installing dependencies for %layer_name%...
    pip install -r "%layer_source_dir%\requirements.txt" -t "%layer_build_dir%\python" --quiet
    if errorlevel 1 (
        echo %ERROR_PREFIX% Failed to install dependencies for %layer_name%
        exit /b 1
    )
)

REM Copy any Python files from layer source
if exist "%layer_source_dir%\*.py" (
    echo %INFO_PREFIX%   Copying Python files for %layer_name%...
    copy "%layer_source_dir%\*.py" "%layer_build_dir%\python\" >nul
)

REM Create ZIP file using PowerShell
echo %INFO_PREFIX%   Creating ZIP file for %layer_name%...
powershell -command "Compress-Archive -Path '%layer_build_dir%\*' -DestinationPath '%layer_output_zip%' -Force"

echo %SUCCESS_PREFIX%   Layer %layer_name% built successfully

:skip_layer

REM ========================================
REM Build Lambda Functions
REM ========================================
echo %INFO_PREFIX% Building Lambda Functions...

REM Function to build a Lambda function
call :build_function "user_service"
call :build_function "chat_service"
call :build_function "tree_service"
call :build_function "health_check"
call :build_function "notification_service"
call :build_function "billing_service"
call :build_function "admin_service"
call :build_function "contact_service"

REM Build Stripe webhook services
call :build_webhook_function "handle-payment-succeeded"
call :build_webhook_function "handle-payment-failed"
call :build_webhook_function "handle-subscription-updated"

goto :cleanup

REM ========================================
REM Function to build Lambda function
REM ========================================
:build_function
set "service_name=%~1"
set "service_source_dir=%BACKEND_SOURCE_DIR%\services\%service_name%"
set "function_build_dir=%BUILD_DIR%\function_%service_name%"
set "function_output_zip=%FUNCTIONS_DIR%\%service_name%.zip"

echo %INFO_PREFIX% Processing function: %service_name%

if not exist "%service_source_dir%" (
    echo %WARNING_PREFIX% Service source directory not found: %service_source_dir%
    goto :eof
)

REM Create function build directory
mkdir "%function_build_dir%"

REM Copy function source code
echo %INFO_PREFIX%   Copying source code for %service_name%...
xcopy "%service_source_dir%\*" "%function_build_dir%\" /E /I /Q

REM Install function-specific dependencies if requirements.txt exists
if exist "%function_build_dir%\requirements.txt" (
    echo %INFO_PREFIX%   Installing dependencies for %service_name%...
    pip install -r "%function_build_dir%\requirements.txt" -t "%function_build_dir%" --quiet
    if errorlevel 1 (
        echo %ERROR_PREFIX% Failed to install dependencies for %service_name%
        goto :eof
    )
    
    REM Remove requirements.txt from the package
    del "%function_build_dir%\requirements.txt"
)

REM Create ZIP file using PowerShell
echo %INFO_PREFIX%   Creating ZIP file for %service_name%...
powershell -command "Compress-Archive -Path '%function_build_dir%\*' -DestinationPath '%function_output_zip%' -Force"

echo %SUCCESS_PREFIX%   Function %service_name% built successfully
goto :eof

REM ========================================
REM Function to build Stripe webhook function
REM ========================================
:build_webhook_function
set "webhook_service=%~1"
set "webhook_source_dir=%BACKEND_SOURCE_DIR%\services\webhook_service\stripe\handlers\%webhook_service%"
set "function_build_dir=%BUILD_DIR%\function_%webhook_service%"
set "function_output_zip=%FUNCTIONS_DIR%\%webhook_service%.zip"

echo %INFO_PREFIX% Processing webhook function: %webhook_service%

if not exist "%webhook_source_dir%" (
    echo %WARNING_PREFIX% Webhook service directory not found: %webhook_source_dir%
    goto :eof
)

REM Create function build directory
mkdir "%function_build_dir%"

REM Copy webhook handler source code
echo %INFO_PREFIX%   Copying webhook source code for %webhook_service%...
xcopy "%webhook_source_dir%\*" "%function_build_dir%\" /E /I /Q

REM Copy common webhook files if they exist
set "common_webhook_dir=%BACKEND_SOURCE_DIR%\services\webhook_service\stripe\common"
if exist "%common_webhook_dir%" (
    echo %INFO_PREFIX%   Copying common webhook files for %webhook_service%...
    xcopy "%common_webhook_dir%\*" "%function_build_dir%\" /E /Y /Q
)

REM Install dependencies if requirements.txt exists
if exist "%function_build_dir%\requirements.txt" (
    echo %INFO_PREFIX%   Installing dependencies for %webhook_service%...
    pip install -r "%function_build_dir%\requirements.txt" -t "%function_build_dir%" --quiet
    if errorlevel 1 (
        echo %ERROR_PREFIX% Failed to install dependencies for %webhook_service%
        goto :eof
    )
    
    REM Remove requirements.txt from the package
    del "%function_build_dir%\requirements.txt"
)

REM Create ZIP file using PowerShell
echo %INFO_PREFIX%   Creating ZIP file for %webhook_service%...
powershell -command "Compress-Archive -Path '%function_build_dir%\*' -DestinationPath '%function_output_zip%' -Force"

echo %SUCCESS_PREFIX%   Webhook function %webhook_service% built successfully
goto :eof

REM ========================================
REM Summary and Cleanup
REM ========================================
:cleanup
echo %SUCCESS_PREFIX% Build completed successfully!
echo %INFO_PREFIX% Built artifacts:

echo %INFO_PREFIX%   Lambda Layers:
if exist "%LAYERS_DIR%\*.zip" (
    for %%f in ("%LAYERS_DIR%\*.zip") do (
        echo %INFO_PREFIX%     - %%~nf
    )
)

echo %INFO_PREFIX%   Lambda Functions:
if exist "%FUNCTIONS_DIR%\*.zip" (
    for %%f in ("%FUNCTIONS_DIR%\*.zip") do (
        echo %INFO_PREFIX%     - %%~nf
    )
)

echo %INFO_PREFIX% Cleaning up build directory...
if exist "%BUILD_DIR%" rmdir /s /q "%BUILD_DIR%"

echo %SUCCESS_PREFIX% All done! Ready for Terraform deployment.
pause