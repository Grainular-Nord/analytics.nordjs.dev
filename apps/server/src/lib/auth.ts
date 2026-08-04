import { createAuthBackend } from '@analytics/auth/server';

const requiredEnv = (name: string) => {
    const value = Bun.env[name]?.trim();
    if (!value) throw new Error(`${name} must be configured`);
    return value;
};

const jwtSecret = requiredEnv('JWT_SECRET');
if (jwtSecret.length < 32 || jwtSecret.startsWith('replace-')) {
    throw new Error('JWT_SECRET must be a unique secret of at least 32 characters');
}

export const auth = createAuthBackend({
    jwtSecret,
    clientUrl: requiredEnv('CLIENT_URL'),
    expectedOrigins: requiredEnv('CLIENT_ORIGINS')
        .split(',')
        .map((origin) => origin.trim()),
    rpId: requiredEnv('RP_ID'),
    rpName: requiredEnv('RP_NAME'),
    secureCookie: Bun.env.NODE_ENV === 'production',
});

export const { routes: authRoutes, handleAuth } = auth;
