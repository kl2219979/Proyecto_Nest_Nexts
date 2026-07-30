import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * Política de contraseña RN-022 / RN-023:
 * - Mínimo 10 caracteres (también validado con `@MinLength(10)`)
 * - Al menos una mayúscula, una minúscula, un número y un carácter especial
 *
 * @param validationOptions - Opciones de class-validator.
 * @returns Decorador de propiedad.
 */
export function IsStrongPassword(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'IsStrongPassword',
      target: object.constructor,
      propertyName: propertyName as string,
      options: {
        message:
          'La contraseña debe incluir mayúscula, minúscula, número y carácter especial (RN-023)',
        ...validationOptions,
      },
      validator: {
        /**
         * @param value - Contraseña en texto plano.
         * @returns `true` si cumple la política.
         */
        validate(value: unknown): boolean {
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
