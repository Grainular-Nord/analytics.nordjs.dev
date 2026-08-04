import { resource } from '@grainular/resource';
import type { Grain } from '@grainular/grains';

type QueryParams = Record<string, undefined | string | string[]>;
type QueryOptions = RequestInit & { params?: QueryParams };
type ResponseShape<T> = { ok: true; data: T } | { ok: false; data: { status: number; message: string } };
type Handler<T, R> = (value: ResponseShape<T>) => R;

export const API_URL =
    (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? 'http://localhost:3000';

export const query = async <T, R>(path: `/${string}`, options: QueryOptions, handler: Handler<T, R>): Promise<R> => {
    const url = new URL(`${API_URL}${path}`);
    const { params, ...requestInit } = options;
    assignURLSearchParams(url, params);

    let result: ResponseShape<T>;
    try {
        const response = await fetch(url, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            ...requestInit,
        });

        result = !response.ok
            ? { ok: false, data: await parseError(response) }
            : { ok: true, data: (await response.json()) as T };
    } catch {
        result = { ok: false, data: { status: 0, message: 'Network error' } };
    }

    return handler(result);
};

async function parseError(response: Response) {
    try {
        const body = (await response.json()) as { message?: string };
        return { status: response.status, message: body.message ?? response.statusText };
    } catch {
        return { status: response.status, message: response.statusText };
    }
}

function assignURLSearchParams(url: URL, params: QueryParams = {}) {
    for (const [key, value] of Object.entries(params)) {
        for (const param of [value].flat()) {
            if (param) url.searchParams.append(key, param);
        }
    }
}

// Passes through the discriminated union — for imperative call sites
export const as = <T>(value: ResponseShape<T>): ResponseShape<T> => value;

// Unwraps to T, throws on error — for resource fetchers
export const unwrap = <T>(value: ResponseShape<T>): T => {
    if (!value.ok) throw new Error(`${value.data.status}: ${value.data.message}`);
    return value.data;
};

// A GET wrapped as a @grainular/resource: state/pending/error/data as
// grains, auto-refetch (aborting any in-flight request) whenever a dep
// grain changes. `options` may be a getter so params can read from the
// same dep grains that trigger the refetch.
export const queryResource = <T>(
    path: `/${string}`,
    options: QueryOptions | (() => QueryOptions) = {},
    deps: Grain<unknown>[] = [],
) => {
    return resource<T>(({ abortSignal }) => {
        const resolved = typeof options === 'function' ? options() : options;
        return query(path, { ...resolved, signal: abortSignal }, unwrap<T>);
    }, deps);
};
