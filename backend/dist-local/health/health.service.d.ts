import { DataSource } from 'typeorm';
export type HealthStatus = {
    status: 'ok' | 'degraded';
    timestamp: string;
    uptime: number;
    database: 'up' | 'down';
};
export declare class HealthService {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    check(): Promise<HealthStatus>;
}
