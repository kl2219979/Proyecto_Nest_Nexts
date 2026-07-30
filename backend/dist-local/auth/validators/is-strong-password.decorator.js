"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsStrongPassword = IsStrongPassword;
const class_validator_1 = require("class-validator");
function IsStrongPassword(validationOptions) {
    return (object, propertyName) => {
        (0, class_validator_1.registerDecorator)({
            name: 'IsStrongPassword',
            target: object.constructor,
            propertyName: propertyName,
            options: {
                message: 'La contraseña debe incluir mayúscula, minúscula, número y carácter especial (RN-023)',
                ...validationOptions,
            },
            validator: {
                validate(value) {
                    if (typeof value !== 'string') {
                        return false;
                    }
                    const hasUpper = /[A-Z]/.test(value);
                    const hasLower = /[a-z]/.test(value);
                    const hasDigit = /\d/.test(value);
                    const hasSpecial = /[^A-Za-z0-9]/.test(value);
                    return hasUpper && hasLower && hasDigit && hasSpecial;
                },
            },
        });
    };
}
//# sourceMappingURL=is-strong-password.decorator.js.map