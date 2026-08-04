import { prisma } from '@analytics/db';
import { HTTPException } from 'hono/http-exception';
import type { Identity } from './types';

export const getIdentity = async (userId: string): Promise<Identity> => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { credentials: { select: { id: true, label: true, createdAt: true } } },
    });

    if (!user) {
        throw new HTTPException(401, { message: 'Unknown user' });
    }

    return {
        id: user.id,
        email: user.email,
        passkeys: user.credentials,
    };
};
