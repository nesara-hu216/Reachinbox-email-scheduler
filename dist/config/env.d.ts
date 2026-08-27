export declare const env: {
    PORT: number;
    NODE_ENV: "development" | "production" | "test";
    FRONTEND_URL: string;
    BACKEND_URL: string;
    DATABASE_URL: string;
    REDIS_URL: string;
    SESSION_SECRET: string;
    JWT_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    GOOGLE_CALLBACK_URL: string;
    SMTP_HOST: string;
    SMTP_PORT: number;
    SMTP_USER: string;
    SMTP_PASSWORD: string;
    WORKER_CONCURRENCY: number;
    MIN_SEND_DELAY_MS: number;
    MAX_EMAILS_PER_HOUR: number;
};
export declare const GOOGLE_CLIENT_ID_REGEX: RegExp;
export declare function isGoogleOauthConfigured(): boolean;
export declare function getGoogleOAuthDiagnosticInfo(): {
    configured: boolean;
    envFileLoaded: string;
    clientIdPresent: boolean;
    clientIdMasked: string;
    isValidFormat: boolean;
    clientSecretPresent: boolean;
    clientSecretLength: number;
    callbackUrl: string;
};
export declare function getDatabaseDiagnosticInfo(): {
    host: string;
    port: string;
    user: string;
    database: string;
};
