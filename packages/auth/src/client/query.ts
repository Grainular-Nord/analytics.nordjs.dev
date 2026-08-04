export type ResponseShape<T> = { ok: true; data: T } | { ok: false; data: { status: number; message: string } };

export const authFetch = async <T>(
    apiUrl: string,
    path: `/${string}`,
    options: RequestInit = {},
): Promise<ResponseShape<T>> => {
    try {
        const response = await fetch(`${apiUrl}${path}`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            ...options,
        });

        if (!response.ok) {
            return { ok: false, data: await parseError(response) };
        }
        return { ok: true, data: (await response.json()) as T };
    } catch {
        return { ok: false, data: { status: 0, message: 'Network error' } };
    }
};

async function parseError(response: Response) {
    try {
        const body = (await response.json()) as { message?: string };
        return { status: response.status, message: body.message ?? response.statusText };
    } catch {
        return { status: response.status, message: response.statusText };
    }
}
