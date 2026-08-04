import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { jwt } from 'hono/jwt';
import { getIdentity } from './identity.service';
import { createMagicLinkService } from './magic-link.service';
import { createPasskeyService } from './passkey.service';
import { createSessionHelpers } from './session';
import { isSessionPayload, type AuthBackendConfig, type AuthEnv } from './types';

export const createAuthBackend = (config: AuthBackendConfig) => {
    const { createSession, clearSession } = createSessionHelpers(config);
    const { requestMagicLink, verifyMagicLink } = createMagicLinkService(config);
    const {
        createRegistrationOptions,
        verifyRegistration,
        createAuthenticationOptions,
        verifyAuthentication,
        removePasskey,
    } = createPasskeyService(config);

    const jwtMiddleware = jwt({ secret: config.jwtSecret, cookie: 'authorization', alg: 'HS256' });
    const narrowSession = createMiddleware<AuthEnv>(async (ctx, next) => {
        const payload = ctx.get('jwtPayload');
        if (!isSessionPayload(payload)) {
            throw new HTTPException(401, { message: 'Invalid token' });
        }
        ctx.set('session', payload);
        await next();
    });
    const handleAuth = [jwtMiddleware, narrowSession] as const;

    const routes = new Hono<AuthEnv>()
        // -- Magic link: request logs the link to the server console --
        .post('/magic', async (ctx) => {
            const { email } = await ctx.req.json();
            await requestMagicLink(email);
            // Always ok — whether the link "arrives" depends on console access
            return ctx.json({ ok: true });
        })
        .post('/magic/verify', async (ctx) => {
            const { token } = await ctx.req.json();
            const user = await verifyMagicLink(token);
            await createSession(ctx, user);
            return ctx.json(await getIdentity(user.id));
        })

        // -- Passkeys --
        .post('/passkey/register/options', ...handleAuth, async (ctx) => {
            const session = ctx.get('session');
            return ctx.json(await createRegistrationOptions({ id: session.sub, email: session.email }));
        })
        .post('/passkey/register/verify', ...handleAuth, async (ctx) => {
            const { challengeId, response, label } = await ctx.req.json();
            await verifyRegistration(ctx.get('session').sub, challengeId, response, label);
            return ctx.json({ ok: true });
        })
        .post('/passkey/login/options', async (ctx) => {
            return ctx.json(await createAuthenticationOptions());
        })
        .post('/passkey/login/verify', async (ctx) => {
            const { challengeId, response } = await ctx.req.json();
            const user = await verifyAuthentication(challengeId, response);
            await createSession(ctx, user);
            return ctx.json(await getIdentity(user.id));
        })
        .delete('/passkey/:credentialId', ...handleAuth, async (ctx) => {
            await removePasskey(ctx.get('session').sub, ctx.req.param('credentialId'));
            return ctx.json({ ok: true });
        })

        // -- Session --
        .get('/identity', ...handleAuth, async (ctx) => {
            return ctx.json(await getIdentity(ctx.get('session').sub));
        })
        .post('/logout', async (ctx) => {
            clearSession(ctx);
            return ctx.json({ ok: true });
        });

    return { routes, handleAuth };
};
