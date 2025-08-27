# Cognito Authentication Modules

This directory contains separated Cognito User Pool modules optimized for different authentication patterns and security requirements.

## Architecture Overview

```
modules/cognito/
├── user/           # End user authentication (Google OAuth only)
├── admin/          # Administrator authentication (Email/Password only)
└── README.md       # This file
```

## Module Separation Rationale

The original unified Cognito module has been split into specialized modules to:

1. **Simplify Configuration**: Each module handles a single authentication pattern
2. **Enhance Security**: Different security policies for users vs admins
3. **Privacy Optimization**: Minimal data collection for end users
4. **Maintenance**: Easier to maintain and update specific authentication flows

## User Module (`user/`)

### Purpose
Handles end-user authentication for the Homebiyori application using Google OAuth exclusively.

### Key Features
- **Google OAuth Only**: No direct email/password authentication
- **Zero Email Storage**: Email addresses not stored in Cognito
- **Maximum Privacy**: Only `openid` scope, no personal information collection
- **Simplified UX**: One-click Google sign-in
- **No MFA**: Optimized for user convenience

### OAuth Configuration
```hcl
allowed_oauth_scopes = ["openid"]  # Minimal scope for authentication only
supported_identity_providers = ["Google"]  # No COGNITO provider
authorize_scopes = "openid"  # No email scope requested from Google
attribute_mapping = {}  # No attribute mapping - absolute privacy
alias_attributes = []  # No email-based login
schema = {}  # No user attributes stored
```

### Use Case
- End users accessing the parenting support application
- Quick, frictionless authentication
- Privacy-focused minimal data collection

## Admin Module (`admin/`)

### Purpose
Handles administrator authentication with enhanced security for system administration.

### Key Features
- **Email/Password Only**: No social login for security
- **Strict Password Policy**: 12+ chars, mixed case, numbers, symbols
- **Optional MFA**: Configurable multi-factor authentication
- **Admin-Only Creation**: Users cannot self-register

### Security Configuration
```hcl
password_policy {
  minimum_length    = 12
  require_lowercase = true
  require_numbers   = true
  require_symbols   = true
  require_uppercase = true
}
```

### Use Case
- System administrators
- Support staff with elevated privileges
- Backend system management

## Usage Examples

### User Pool Implementation
```hcl
module "cognito_users" {
  source = "../../../modules/cognito/user"
  
  project_name         = "homebiyori"
  environment          = "prod"
  callback_urls        = ["https://homebiyori.com/auth/callback"]
  logout_urls          = ["https://homebiyori.com"]
  enable_google_oauth  = true
  google_client_id     = data.aws_ssm_parameter.google_client_id.value
  google_client_secret = data.aws_ssm_parameter.google_client_secret.value
}
```

### Admin Pool Implementation
```hcl
module "cognito_admins" {
  source = "../../../modules/cognito/admin"
  
  project_name  = "homebiyori"
  environment   = "prod"
  callback_urls = ["https://admin.homebiyori.com/auth/callback"]
  logout_urls   = ["https://admin.homebiyori.com"]
  enable_mfa    = true  # Enhanced security
}
```

## Security Considerations

### User Module Security
- **OAuth Scopes**: Minimal `openid` only - no email, profile, or personal data
- **Token Validity**: Standard web application timeouts (60 min access, 30 day refresh)
- **Identity Mapping**: No attribute mapping - zero personal data stored

### Admin Module Security
- **Password Policy**: Enterprise-grade 12+ character requirements
- **Token Validity**: Shorter timeouts (30 min access, 1 day refresh)
- **MFA Support**: Optional but recommended for production
- **User Creation**: Admin-only, prevents unauthorized registrations

## Migration from Unified Module

The previous unified module with `pool_type` parameter has been replaced. Update your module calls:

### Before (Unified)
```hcl
module "cognito_users" {
  source = "../../../modules/cognito"
  pool_type = "users"
  # ... other config
}
```

### After (Separated)
```hcl
module "cognito_users" {
  source = "../../../modules/cognito/user"
  # ... other config (no pool_type needed)
}
```

## Privacy Compliance

### User Module Privacy Features
- **Zero Personal Data Storage**: No personal information stored in Cognito
- **No Email Storage**: Email addresses not requested or stored
- **No Profile Mapping**: Name, picture, nickname, email intentionally omitted
- **OpenID Only**: Only authentication tokens, no user information access

### GDPR/Privacy Considerations
- Minimal data processing principle followed
- No unnecessary personal data collection
- User consent managed through Google OAuth flow
- Clear separation between authentication and profile data