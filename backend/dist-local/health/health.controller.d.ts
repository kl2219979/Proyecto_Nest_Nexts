import { HealthService, HealthStatus } from './health.service';
export declare class HealthController {
    private readonly healthService;
    constructor(healthService: HealthService);
    check(): Promise<HealthStatus>;
}
