import { NestFactory } from '@nestjs/core';

import { BatchModule } from './batch.module';

async function bootstrap() {
  const app = await NestFactory.create(BatchModule);
  await app.listen(Number(process.env.PORT) || 8002);
}
bootstrap();
