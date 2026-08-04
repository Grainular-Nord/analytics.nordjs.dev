import type { Context } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';
import { sign } from 'hono/jwt';
import type { AuthBackendConfig, SessionPayload } from './types';

export const createSessionHelpers = (config: AuthBackendConfig) => {
    const sessionDurationS = config.sessionDurationS ?? 60 * 60 * 24 * 7;

    const createSession = async (ctx: Context, user: { id: string; email: string }) => {
        const payload: SessionPayload = {
            sub: user.id,
            email: user.email,
            exp: Math.floor(Date.now() / 1000) + sessionDurationS,
        };

        const token = await sign(payload, config.jwtSecret, 'HS256');
        setCookie(ctx, 'authorization', token, {
            httpOnly: true,
            secure: config.secureCookie ?? false,
            sameSite: 'Lax',
            path: '/',
            maxAge: sessionDurationS,
        });
    };

    const clearSession = (ctx: Context) => {
        deleteCookie(ctx, 'authorization', { path: '/' });
    };

    return { createSession, clearSession };
};
