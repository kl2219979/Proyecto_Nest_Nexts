export declare enum NodeEnv {
    Development = "development",
    Qa = "qa",
    Production = "production",
    Test = "test"
}
export declare class EnvironmentVariables {
    NODE_ENV: NodeEnv;
    PORT: number;
    DATABASE_HOST: string;
    DATABASE_PORT: number;
    DATABASE_USER: string;
    DATABASE_PASSWORD: string;
    DATABASE_NAME: string;
    DATABASE_SYNC: boolean;
    APP_PUBLIC_URL: string;
    CAPTCHA_DEV_TOKEN: string;
    JWT_SECRET: string;
}
