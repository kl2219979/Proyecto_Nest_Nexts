import { ConfigService } from '@nestjs/config';
export declare class CaptchaService {
    private readonly configService;
    constructor(configService: ConfigService);
    verify(token: string): void;
}
