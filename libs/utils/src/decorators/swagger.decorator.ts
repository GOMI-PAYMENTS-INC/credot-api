import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiOperationOptions,
  ApiProperty,
  ApiBody,
} from '@nestjs/swagger';

export const CustomApiOperation = (options: ApiOperationOptions) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const operationId = options?.operationId || propertyKey;
    ApiOperation({ ...options, operationId })(target, propertyKey, descriptor);
  };
};

export function EnumType(enumType: any, enumName: string) {
  return applyDecorators(ApiProperty({ enum: enumType, enumName }));
}

export const ApiFile =
  (fileName = 'file'): MethodDecorator =>
  (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          [fileName]: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    })(target, propertyKey, descriptor);
  };
