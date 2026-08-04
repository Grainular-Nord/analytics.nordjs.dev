import { derived, grain } from '@grainular/grains';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { authFetch, type ResponseShape } from './query';

export type Identity = {
    id: string;
    email: string;
    passkeys: { id: string; label: string | null; createdAt: string }[];
};

export type AuthStoreConfig = {
    /** Base URL of the auth API — same origin the rest of your app calls. */
    apiUrl: string;
};

export type AuthStore = ReturnType<typeof createAuthStore>;

export const createAuthStore = (config: AuthStoreConfig) => {
    const identity = grain<Identity | null>(null);
    const isAuthenticated = derived(identity, (user) => user != null);

    const call = <T>(path: `/${string}`, options?: RequestInit) => authFetch<T>(config.apiUrl, path, options);

    const fetchIdentity = async () => {
        const response = await call<Identity>('/auth/identity');
        if (response.ok) identity.set(response.data);
    };

    const requestMagicLink = async (email: string) => {
        return call<{ ok: true }>('/auth/magic', { method: 'POST', body: JSON.stringify({ email }) });
    };

    const verifyMagicLink = async (token: string) => {
        const response = await call<Identity>('/auth/magic/verify', {
            method: 'POST',
            body: JSON.stringify({ token }),
        });

        if (response.ok) identity.set(response.data);
        return response;
    };

    const signinWithPasskey = async (): Promise<ResponseShape<Identity>> => {
        const optionsResponse = await call<{
            options: Parameters<typeof startAuthentication>[0]['optionsJSON'];
            challengeId: string;
        }>('/auth/passkey/login/options', { method: 'POST' });
        if (!optionsResponse.ok) return optionsResponse;

        let assertion;
        try {
            assertion = await startAuthentication({ optionsJSON: optionsResponse.data.options });
        } catch {
            return { ok: false, data: { status: 0, message: 'Passkey prompt was cancelled' } };
        }

        const response = await call<Identity>('/auth/passkey/login/verify', {
            method: 'POST',
            body: JSON.stringify({ challengeId: optionsResponse.data.challengeId, response: assertion }),
        });

        if (response.ok) identity.set(response.data);
        return response;
    };

    const registerPasskey = async (label?: string) => {
        const optionsResponse = await call<{
            options: Parameters<typeof startRegistration>[0]['optionsJSON'];
            challengeId: string;
        }>('/auth/passkey/register/options', { method: 'POST' });
        if (!optionsResponse.ok) return optionsResponse;

        let attestation;
        try {
            attestation = await startRegistration({ optionsJSON: optionsResponse.data.options });
        } catch {
            return { ok: false as const, data: { status: 0, message: 'Passkey prompt was cancelled' } };
        }

        const response = await call<{ ok: true }>('/auth/passkey/register/verify', {
            method: 'POST',
            body: JSON.stringify({
                challengeId: optionsResponse.data.challengeId,
                response: attestation,
                label,
            }),
        });

        if (response.ok) await fetchIdentity();
        return response;
    };

    const removePasskey = async (credentialId: string) => {
        const response = await call<{ ok: true }>(`/auth/passkey/${encodeURIComponent(credentialId)}`, {
            method: 'DELETE',
        });

        if (response.ok) await fetchIdentity();
        return response;
    };

    const logout = async () => {
        await call<{ ok: boolean }>('/auth/logout', { method: 'POST' });
        identity.set(null);
    };

    return {
        state: { identity, isAuthenticated },
        actions: {
            fetchIdentity,
            requestMagicLink,
            verifyMagicLink,
            signinWithPasskey,
            registerPasskey,
            removePasskey,
            logout,
        },
    };
};
