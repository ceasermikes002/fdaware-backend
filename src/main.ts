import './env';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });
  const port = parseInt(process.env.PORT ?? '10000', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend is running on http://localhost:${port}`);
}
bootstrap();
