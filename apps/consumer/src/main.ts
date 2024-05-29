import { NestFactory } from '@nestjs/core';

import { ConsumerModule } from './consumer.module';

async function bootstrap() {
  const app = await NestFactory.create(ConsumerModule);
  await app.listen(Number(process.env.PORT) || 8001);
}

bootstrap();
