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
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'ap-northeast-1',
      
      // Cognito User Pool Configuration
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_WEB_CLIENT_ID || '',
      
      // Identity Pool (optional - for AWS resource access)
      identityPoolId: process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID || '',
      
      // OAuth Configuration for Google Sign-In
      oauth: {
        domain: `homebiyori-prod-auth.auth.${process.env.NEXT_PUBLIC_AWS_REGION || 'ap-northeast-1'}.amazoncognito.com`,
        scope: ['openid'], // Minimal scope - only OpenID for authentication
        redirectSignIn: 
          process.env.NODE_ENV === 'production' 
            ? 'https://homebiyori.com/auth/callback'
            : 'http://localhost:3000/auth/callback',
        redirectSignOut: 
          process.env.NODE_ENV === 'production'
            ? 'https://homebiyori.com'
            : 'http://localhost:3000',
        responseType: 'code', // Authorization Code Grant flow
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
    errors.push('NEXT_PUBLIC_COGNITO_USER_POOL_WEB_CLIENT_ID is not set');
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
    identityPoolId: amplifyConfig.Auth.Cognito.identityPoolId ? '✓ Set' : '✗ Missing',
    oauthDomain: amplifyConfig.Auth.Cognito.oauth.domain,
    redirectSignIn: amplifyConfig.Auth.Cognito.oauth.redirectSignIn,
    redirectSignOut: amplifyConfig.Auth.Cognito.oauth.redirectSignOut,
  };
};