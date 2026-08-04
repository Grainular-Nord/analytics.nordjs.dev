type ClientEnv = {
    VITE_APP_TITLE?: string;
};

const configuredTitle = (import.meta as { env?: ClientEnv }).env?.VITE_APP_TITLE?.trim();

if (!configuredTitle) {
    throw new Error('VITE_APP_TITLE must be set (see apps/client/.env.example)');
}

/** Public product name, configured at build/start time for the client. */
export const APP_TITLE = configuredTitle;
