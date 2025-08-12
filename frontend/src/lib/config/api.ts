export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
  TIMEOUT: 30000,
  ENDPOINTS: {
    HEALTH_CHECK: '/api/health',
    USER_PROFILE: '/api/user/profile',
    CHAT: '/api/chat',
    TREE: '/api/tree',
    BILLING: '/api/billing',
  }
};