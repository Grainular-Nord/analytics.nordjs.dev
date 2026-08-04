declare module 'bun' {
    interface Env {
        DATABASE_URL: string;
        JWT_SECRET: string;
        CLIENT_ORIGINS: string;
        CLIENT_URL: string;
        RP_ID: string;
        RP_NAME: string;
        RETENTION_DAYS?: string;
        PORT?: string;
    }
}
