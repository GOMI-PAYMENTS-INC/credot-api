import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { OfficeModule } from './office.module';

async function bootstrap() {
  const app = await NestFactory.create(OfficeModule);

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  if (process.env.APP_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .addBearerAuth({ in: 'header', type: 'http' })
      .setTitle('office api')
      .setVersion('1.0.0')
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, swaggerDocument);
  }

  await app.listen(Number(process.env.PORT) || 8005);
}
bootstrap();
