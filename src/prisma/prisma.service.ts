import { Injectable, OnModuleInit, INestApplication, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();
    const dbUrl =
      nodeEnv === 'production'
        ? process.env.DATABASE_URL_PROD || process.env.DATABASE_URL
        : process.env.DATABASE_URL_DEV || process.env.DATABASE_URL;

    if (!dbUrl) {
      throw new Error('DATABASE_URL is not set. Please set it in your environment file.');
    }

    super({ datasources: { db: { url: dbUrl } } });
    console.log(`✅ Prisma configured for ${nodeEnv} environment`);
  }

  async onModuleInit() {
    await this.$connect();
    console.log('✅ Database initialized successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
