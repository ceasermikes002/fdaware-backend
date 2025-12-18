import './env';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { raw, json, urlencoded } from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.setGlobalPrefix('api');
  const allowedOrigins = [
    'http://localhost:3000',
    'https://fdaware-frontend.vercel.app',
    process.env.FRONTEND_URL?.trim(),
  ].filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Origin',
      'Accept',
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.use('/api/billing/webhook', raw({ type: '*/*' }));
  app.use((req, res, next) => {
    if (req.originalUrl === '/api/billing/webhook') return next();
    return json()(req, res, next);
  });
  app.use((req, res, next) => {
    if (req.originalUrl === '/api/billing/webhook') return next();
    return urlencoded({ extended: true })(req, res, next);
  });

  // Swagger setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('FDAware API')
    .setDescription('API documentation for FDAware backend')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  const port = Number(process.env.PORT) || 8080;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend is running on http://localhost:${port}`);
  console.log('📚 Swagger docs available at http://localhost:' + port + '/api/docs');
}
bootstrap();
