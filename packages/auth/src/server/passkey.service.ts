import { prisma } from '@analytics/db';
import {
    generateAuthenticationOptions,
    generateRegistrationOptions,
    verifyAuthenticationResponse,
    verifyRegistrationResponse,
    type AuthenticationResponseJSON,
    type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { HTTPException } from 'hono/http-exception';
import type { AuthBackendConfig } from './types';

export const createPasskeyService = (config: AuthBackendConfig) => {
    const { rpId, rpName, expectedOrigins } = config;

    // Pending WebAuthn challenges, keyed by a random id handed to the
    // client. In-memory is fine: the server is a single instance and
    // challenges are short-lived by design.
    const CHALLENGE_TTL_MS = 1000 * 60 * 5;
    const challenges = new Map<string, { challenge: string; userId?: string; expiresAt: number }>();

    const storeChallenge = (challenge: string, userId?: string) => {
        for (const [id, entry] of challenges) {
            if (entry.expiresAt < Date.now()) challenges.delete(id);
        }

        const id = crypto.randomUUID();
        challenges.set(id, { challenge, userId, expiresAt: Date.now() + CHALLENGE_TTL_MS });
        return id;
    };

    const consumeChallenge = (id: string) => {
        const entry = challenges.get(id);
        challenges.delete(id);
        if (!entry || entry.expiresAt < Date.now()) {
            throw new HTTPException(401, { message: 'Challenge expired, try again' });
        }
        return entry;
    };

    const createRegistrationOptions = async (user: { id: string; email: string }) => {
        const existing = await prisma.credential.findMany({ where: { userId: user.id } });

        const options = await generateRegistrationOptions({
            rpID: rpId,
            rpName,
            userName: user.email,
            attestationType: 'none',
            excludeCredentials: existing.map((credential) => ({ id: credential.id })),
            authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
        });

        return { options, challengeId: storeChallenge(options.challenge, user.id) };
    };

    const verifyRegistration = async (
        userId: string,
        challengeId: string,
        response: RegistrationResponseJSON,
        label?: string,
    ) => {
        const { challenge, userId: challengeUserId } = consumeChallenge(challengeId);
        if (challengeUserId !== userId) {
            throw new HTTPException(401, { message: 'Challenge does not belong to this user' });
        }

        const { verified, registrationInfo } = await verifyRegistrationResponse({
            response,
            expectedChallenge: challenge,
            expectedOrigin: expectedOrigins,
            expectedRPID: rpId,
        });

        if (!verified || !registrationInfo) {
            throw new HTTPException(401, { message: 'Passkey registration could not be verified' });
        }

        const { credential } = registrationInfo;
        await prisma.credential.create({
            data: {
                id: credential.id,
                userId,
                publicKey: Buffer.from(credential.publicKey),
                counter: BigInt(credential.counter),
                transports: credential.transports ?? [],
                label: label?.slice(0, 64) || null,
            },
        });
    };

    const createAuthenticationOptions = async () => {
        // Empty allowCredentials → discoverable credential flow, the
        // browser offers whatever passkeys it has for this rpID.
        const options = await generateAuthenticationOptions({
            rpID: rpId,
            userVerification: 'preferred',
            allowCredentials: [],
        });

        return { options, challengeId: storeChallenge(options.challenge) };
    };

    const verifyAuthentication = async (challengeId: string, response: AuthenticationResponseJSON) => {
        const { challenge } = consumeChallenge(challengeId);

        const credential = await prisma.credential.findUnique({
            where: { id: response.id },
            include: { user: true },
        });
        if (!credential) {
            throw new HTTPException(401, { message: 'Unknown passkey' });
        }

        const { verified, authenticationInfo } = await verifyAuthenticationResponse({
            response,
            expectedChallenge: challenge,
            expectedOrigin: expectedOrigins,
            expectedRPID: rpId,
            credential: {
                id: credential.id,
                publicKey: new Uint8Array(credential.publicKey),
                counter: Number(credential.counter),
                transports: credential.transports as never,
            },
        });

        if (!verified) {
            throw new HTTPException(401, { message: 'Passkey could not be verified' });
        }

        await prisma.credential.update({
            where: { id: credential.id },
            data: { counter: BigInt(authenticationInfo.newCounter) },
        });

        return credential.user;
    };

    const removePasskey = async (userId: string, credentialId: string) => {
        await prisma.credential.deleteMany({ where: { id: credentialId, userId } });
    };

    return {
        createRegistrationOptions,
        verifyRegistration,
        createAuthenticationOptions,
        verifyAuthentication,
        removePasskey,
    };
};
