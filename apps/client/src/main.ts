import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { ClientModule } from './client.module';

async function bootstrap() {
  const app = await NestFactory.create(ClientModule);

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  if (process.env.APP_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .addBearerAuth({ in: 'header', type: 'http' })
      .setTitle('front api')
      .setVersion('1.0.0')
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, swaggerDocument);
  }

  await app.listen(Number(process.env.PORT) || 8000);
}
bootstrap();
