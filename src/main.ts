import './env';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.setGlobalPrefix('api');
    const allowedOrigins = [
        'http://localhost:3000',
        'https://fdaware-frontend.vercel.app/',
        process.env.FRONTEND_URL
    ].filter(Boolean);

    app.enableCors({
        origin: (origin, callback) => {
            // Allow non-browser clients (no Origin header) like Postman
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) return callback(null, true);
            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept'],
    });
    const port = parseInt(process.env.PORT ?? '10000', 10);
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 Backend is running on http://localhost:${port}`);
}
bootstrap();
