# Gemini CLI Agent Guidelines

## Code Development Standards

To ensure maintainability and clarity, especially for new contributors, the following guidelines must be adhered to when developing or modifying backend code:

1.  **Comprehensive Code Comments:** When creating or modifying backend files, ensure that comments are meticulously added to explain the logic, especially for complex sections. Comments should be clear enough for a beginner to understand the purpose and functionality of the code.

2.  **Intent Explanation for Code Changes:** For any code modification or creation, provide a clear explanation of the intent behind the changes. This includes *why* a particular approach was chosen and *what* problem it solves.

3.  **Test Code Documentation:** When creating test code, include a comprehensive list of test items at the beginning of the test file. Each test case within the code should be clearly linked to its corresponding item in this list through comments. This ensures that test coverage can be easily tracked and understood across the entire project.

## Directory Structure Standards

### Backend Code Organization

**Production Code Location:**
- `backend/` - Contains only production-ready Lambda functions and modules
- `backend/services/` - Individual Lambda function directories
- `backend/layers/` - Shared Lambda layers

**Test Code Location:**
- `tests/` - All test files are managed here
- `tests/backend/services/{service_name}/` - Tests for specific Lambda services
- `tests/integration/` - Cross-service integration tests
- `tests/fixtures/` - Test data and mock fixtures

**File Naming Conventions:**
- Production modules: Standard Python naming (e.g., `main.py`, `handler.py`, `models.py`)
- Test files: `test_{module_name}.py` (e.g., `test_health_check.py`)
- Test classes: `Test{ClassName}` (e.g., `TestHealthCheckAPI`)
- Test methods: `test_{functionality}__{scenario}` (e.g., `test_health_check__success`)

### Test File Organization Rules

1. **Mirror Production Structure:** Test directory structure should mirror the backend production structure
2. **Clear Module Mapping:** Each test file should clearly correspond to a specific production module
3. **Comprehensive Coverage:** Every production module must have corresponding tests
4. **Documentation Links:** Test files should document which production modules they test

Example structure:
```
backend/
├── services/
│   ├── health_check/
│   │   ├── main.py           # Production FastAPI app
│   │   ├── handler.py        # Production Lambda handler
│   │   └── requirements.txt  # Production dependencies
│   └── user_service/
│       ├── main.py
│       ├── handler.py
│       └── models.py

tests/
├── backend/
│   ├── services/
│   │   ├── health_check/
│   │   │   └── test_health_check.py    # Tests main.py + handler.py
│   │   └── user_service/
│   │       ├── test_user_service.py    # Tests main.py + handler.py
│   │       └── test_models.py          # Tests models.py
│   └── layers/
│       └── test_common_layer.py
├── integration/
│   └── test_api_flows.py
└── fixtures/
    └── sample_data.py
```

### Testing Standards

1. **Test Isolation:** Tests must not depend on external services in development environment
2. **Mock Strategy:** Use moto for AWS services, unittest.mock for other dependencies
3. **Performance Testing:** Include response time validation for all API endpoints
4. **Error Coverage:** Test both success and failure scenarios
5. **Documentation:** Each test file must include comprehensive test item list at the top
