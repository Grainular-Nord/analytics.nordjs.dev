import { createAuthGuards, createAuthStore } from '@analytics/auth/client';
import { API_URL } from '../core/services/query';

export const authStore = createAuthStore({ apiUrl: API_URL });
export const { isLoggedIn, isNotAuthenticated } = createAuthGuards(authStore);
