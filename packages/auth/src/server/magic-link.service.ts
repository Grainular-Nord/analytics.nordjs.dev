import { prisma } from '@analytics/db';
import { HTTPException } from 'hono/http-exception';
import type { AuthBackendConfig } from './types';

const hashToken = (token: string) => {
    return new Bun.CryptoHasher('sha256').update(token).digest('hex');
};

export const createMagicLinkService = (config: AuthBackendConfig) => {
    const ttlMs = config.magicLinkTtlMs ?? 1000 * 60 * 15;

    // Creates a magic link and logs it to the server console. This is
    // deliberate: there is no email delivery, so having access to the
    // server logs is what gates account creation.
    const requestMagicLink = async (email: string) => {
        const normalized = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
            throw new HTTPException(400, { message: 'Invalid email address' });
        }

        const token = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
        await prisma.magicLinkToken.create({
            data: {
                tokenHash: hashToken(token),
                email: normalized,
                expiresAt: new Date(Date.now() + ttlMs),
            },
        });

        const link = `${config.clientUrl}/auth/magic?token=${token}`;
        console.log(`\n🔑 Magic link for ${normalized} (valid ${Math.round(ttlMs / 60000)}m):\n   ${link}\n`);
    };

    // Redeems a magic link token. Creates the user on first use.
    const verifyMagicLink = async (token: string) => {
        const tokenHash = hashToken(token);
        const now = new Date();

        return prisma.$transaction(async (tx) => {
            // Claim the token before reading its email. The condition is part
            // of the write, so concurrent requests cannot both redeem it.
            const claimed = await tx.magicLinkToken.updateMany({
                where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
                data: { usedAt: now },
            });
            if (claimed.count !== 1) {
                throw new HTTPException(401, { message: 'Invalid or expired magic link' });
            }

            const record = await tx.magicLinkToken.findUniqueOrThrow({ where: { tokenHash } });
            return tx.user.upsert({
                where: { email: record.email },
                update: {},
                create: { email: record.email },
            });
        });
    };

    return { requestMagicLink, verifyMagicLink };
};
