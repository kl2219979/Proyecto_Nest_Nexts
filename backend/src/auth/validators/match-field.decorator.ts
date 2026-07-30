import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * Valida que la propiedad coincida con otra del mismo objeto
 * (ej. `passwordConfirm` ≡ `password`).
 *
 * @param property - Nombre del campo a comparar.
 * @param validationOptions - Opciones de class-validator.
 * @returns Decorador de propiedad.
 */
export function MatchField(
  property: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'MatchField',
      target: object.constructor,
      propertyName: propertyName as string,
      constraints: [property],
      options: validationOptions,
      validator: {
        /**
         * Compara valores.
         *
         * @param value - Valor del campo decorado.
         * @param args - Incluye el objeto completo y constraints.
         * @returns `true` si coinciden.
         */
        validate(value: unknown, args: ValidationArguments): boolean {
          const [relatedPropertyName] = args.constraints as [string];
          const relatedValue = (args.object as Record<string, unknown>)[
            relatedPropertyName
          ];
          return value === relatedValue;
        },
        /**
         * Mensaje por defecto.
         *
         * @param args - Argumentos de validación.
         * @returns Texto de error.
         */
        defaultMessage(args: ValidationArguments): string {
          const [relatedPropertyName] = args.constraints as [string];
          return `${args.property} debe coincidir con ${relatedPropertyName}`;
        },
      },
    });
  };
}
