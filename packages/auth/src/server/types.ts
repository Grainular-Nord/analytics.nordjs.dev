export type AuthBackendConfig = {
    /** Secret used to sign session JWTs. */
    jwtSecret: string;
    /** Base URL of the frontend — used to build the magic link. */
    clientUrl: string;
    /** Origins WebAuthn ceremonies must match (your frontend's origin(s)). */
    expectedOrigins: string[];
    /** WebAuthn relying party id — usually the frontend's bare domain. */
    rpId: string;
    /** WebAuthn relying party display name. */
    rpName: string;
    /** How long a session cookie lasts, in seconds. Defaults to 7 days. */
    sessionDurationS?: number;
    /** How long a magic link stays valid, in ms. Defaults to 15 minutes. */
    magicLinkTtlMs?: number;
    /** Whether to mark the session cookie Secure. Defaults to false. */
    secureCookie?: boolean;
};

export type SessionPayload = {
    sub: string;
    email: string;
    exp: number;
};

export const isSessionPayload = (payload: unknown): payload is SessionPayload => {
    if (typeof payload !== 'object' || payload === null) return false;
    const { sub, email } = payload as Record<string, unknown>;
    return typeof sub === 'string' && typeof email === 'string';
};

export type AuthEnv = {
    Variables: {
        session: SessionPayload;
    };
};

export type Identity = {
    id: string;
    email: string;
    passkeys: { id: string; label: string | null; createdAt: Date }[];
};
