import { OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
export declare class SeatsModule implements OnModuleInit {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    onModuleInit(): Promise<void>;
}
