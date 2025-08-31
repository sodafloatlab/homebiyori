/**
 * AWS Amplify Configuration for Cognito OAuth
 * 
 * ■機能概要■
 * - Cognito User Pool設定
 * - Google OAuth認証設定  
 * - OAuth フロー設定
 * - 環境変数からの動的設定
 */

export const amplifyConfig = {
  Auth: {
    Cognito: {
      // AWS Region
      region: process.env.NEXT_PUBLIC_COGNITO_REGION || process.env.NEXT_PUBLIC_AWS_REGION || 'ap-northeast-1',
      
      // Cognito User Pool Configuration
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID || process.env.NEXT_PUBLIC_COGNITO_USER_POOL_WEB_CLIENT_ID || '',
      
      // Identity Pool (optional - for AWS resource access)
      identityPoolId: process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID || '',
      
      // Login With Configuration for Google Sign-In (Amplify v6 format)
      loginWith: {
        oauth: {
          domain: process.env.NEXT_PUBLIC_OAUTH_DOMAIN || process.env.NEXT_PUBLIC_COGNITO_DOMAIN || `prod-homebiyori-auth.auth.${process.env.NEXT_PUBLIC_COGNITO_REGION || process.env.NEXT_PUBLIC_AWS_REGION || 'ap-northeast-1'}.amazoncognito.com`,
          scopes: ['openid'], // Minimal scope - only OpenID for authentication
          redirectSignIn: [
            process.env.NEXT_PUBLIC_OAUTH_REDIRECT_SIGNIN ||
            (process.env.NODE_ENV === 'production' 
              ? 'https://homebiyori.com/auth/callback'
              : 'http://localhost:3000/auth/callback')
          ],
          redirectSignOut: [
            process.env.NEXT_PUBLIC_OAUTH_REDIRECT_SIGNOUT ||
            (process.env.NODE_ENV === 'production'
              ? 'https://homebiyori.com'
              : 'http://localhost:3000')
          ],
          responseType: 'code' as const, // Authorization Code Grant flow
        },
      },
      
      // Advanced Security Configuration
      advancedSecurityDataCollectionFlag: false, // プライバシー重視
      
      // Password Policy (not used in Google OAuth only setup)
      passwordFormat: {
        minLength: 8,
        requireLowercase: false,
        requireUppercase: false,
        requireNumbers: false,
        requireSpecialCharacters: false,
      },
    },
  },
};

// Validation function to check configuration completeness
export const validateAmplifyConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!amplifyConfig.Auth.Cognito.userPoolId) {
    errors.push('NEXT_PUBLIC_COGNITO_USER_POOL_ID is not set');
  }
  
  if (!amplifyConfig.Auth.Cognito.userPoolClientId) {
    errors.push('NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID or NEXT_PUBLIC_COGNITO_USER_POOL_WEB_CLIENT_ID is not set');
  }
  
  if (!amplifyConfig.Auth.Cognito.region) {
    errors.push('NEXT_PUBLIC_AWS_REGION is not set');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Debug helper for development
export const getAmplifyConfigDebugInfo = () => {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return {
    region: amplifyConfig.Auth.Cognito.region,
    userPoolId: amplifyConfig.Auth.Cognito.userPoolId ? '✓ Set' : '✗ Missing',
    userPoolClientId: amplifyConfig.Auth.Cognito.userPoolClientId ? '✓ Set' : '✗ Missing',
    actualUserPoolClientId: amplifyConfig.Auth.Cognito.userPoolClientId,
    identityPoolId: amplifyConfig.Auth.Cognito.identityPoolId ? '✓ Set' : '✗ Missing',
    oauthDomain: amplifyConfig.Auth.Cognito.loginWith.oauth.domain,
    redirectSignIn: amplifyConfig.Auth.Cognito.loginWith.oauth.redirectSignIn,
    redirectSignOut: amplifyConfig.Auth.Cognito.loginWith.oauth.redirectSignOut,
  };
};