"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchField = MatchField;
const class_validator_1 = require("class-validator");
function MatchField(property, validationOptions) {
    return (object, propertyName) => {
        (0, class_validator_1.registerDecorator)({
            name: 'MatchField',
            target: object.constructor,
            propertyName: propertyName,
            constraints: [property],
            options: validationOptions,
            validator: {
                validate(value, args) {
                    const [relatedPropertyName] = args.constraints;
                    const relatedValue = args.object[relatedPropertyName];
                    return value === relatedValue;
                },
                defaultMessage(args) {
                    const [relatedPropertyName] = args.constraints;
                    return `${args.property} debe coincidir con ${relatedPropertyName}`;
                },
            },
        });
    };
}
//# sourceMappingURL=match-field.decorator.js.map