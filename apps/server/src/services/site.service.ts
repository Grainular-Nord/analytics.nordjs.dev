import { prisma, type SiteRole } from '@analytics/db';
import { HTTPException } from 'hono/http-exception';
import { invalidateSiteCache } from './event.service';

const normalizeOrigins = (origins: unknown): string[] => {
    if (!Array.isArray(origins)) return [];
    return [
        ...new Set(
            origins
                .filter((origin): origin is string => typeof origin === 'string')
                .map((origin) => {
                    try {
                        return new URL(origin).origin;
                    } catch {
                        return null;
                    }
                })
                .filter((origin): origin is string => origin != null),
        ),
    ];
};

// A user sees only sites they have explicitly been granted access to. No key
// or allowedOrigins are included here; those stay on the detail endpoint.
export const listSites = async (userId: string) => {
    return prisma.site.findMany({
        where: { memberships: { some: { userId } } },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, domain: true },
    });
};

export const getSite = async (id: string, userId: string, roles?: SiteRole[]) => {
    const site = await prisma.site.findFirst({
        where: {
            id,
            memberships: {
                some: { userId, ...(roles ? { role: { in: roles } } : {}) },
            },
        },
    });
    if (!site) {
        throw new HTTPException(404, { message: 'Site not found' });
    }
    return site;
};

export const createSite = async (
    userId: string,
    input: { name?: unknown; domain?: unknown; allowedOrigins?: unknown },
) => {
    const { name, domain } = input;
    if (typeof name !== 'string' || !name.trim() || typeof domain !== 'string' || !domain.trim()) {
        throw new HTTPException(400, { message: 'Name and domain are required' });
    }

    return prisma.site.create({
        data: {
            name: name.trim(),
            domain: domain.trim().toLowerCase(),
            allowedOrigins: normalizeOrigins(input.allowedOrigins),
            memberships: { create: { userId, role: 'OWNER' } },
        },
    });
};

export const updateSite = async (
    id: string,
    userId: string,
    input: { name?: unknown; domain?: unknown; allowedOrigins?: unknown },
) => {
    await getSite(id, userId, ['OWNER', 'EDITOR']);

    const site = await prisma.site.update({
        where: { id },
        data: {
            ...(typeof input.name === 'string' && input.name.trim() ? { name: input.name.trim() } : {}),
            ...(typeof input.domain === 'string' && input.domain.trim()
                ? { domain: input.domain.trim().toLowerCase() }
                : {}),
            ...(input.allowedOrigins !== undefined ? { allowedOrigins: normalizeOrigins(input.allowedOrigins) } : {}),
        },
    });

    invalidateSiteCache();
    return site;
};

export const deleteSite = async (id: string, userId: string) => {
    await getSite(id, userId, ['OWNER']);
    await prisma.site.delete({ where: { id } });
    invalidateSiteCache();
};
