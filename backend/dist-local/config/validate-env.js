"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnv = validateEnv;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const env_validation_1 = require("./env.validation");
function validateEnv(config) {
    const validated = (0, class_transformer_1.plainToInstance)(env_validation_1.EnvironmentVariables, config, {
        enableImplicitConversion: true,
    });
    const errors = (0, class_validator_1.validateSync)(validated, {
        skipMissingProperties: false,
    });
    if (errors.length > 0) {
        throw new Error(`Invalid environment configuration: ${errors
            .map((error) => Object.values(error.constraints ?? {}).join(', '))
            .join('; ')}`);
    }
    return validated;
}
//# sourceMappingURL=validate-env.js.map