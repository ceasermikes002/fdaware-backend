import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType | null = null;
  private enabled = false;

  async onModuleInit() {
    const enabled = process.env.REDIS_ENABLED === 'true';
    if (!enabled) return;

    const username = process.env.REDIS_USERNAME || 'default';
    const password = process.env.REDIS_PASSWORD || undefined;
    const host = process.env.REDIS_HOST || '127.0.0.1';
    const port = Number(process.env.REDIS_PORT || 6379);

    this.client = createClient({
      username,
      password,
      socket: { host, port },
    });

    this.client.on('error', () => {
      this.enabled = false;
    });

    await this.client.connect();
    this.enabled = true;
  }

  async onModuleDestroy() {
    if (this.client) await this.client.disconnect();
    this.enabled = false;
  }

  isEnabled() {
    return this.enabled && this.client !== null;
  }

  async get(key: string): Promise<string | null> {
    if (!this.isEnabled()) return null;
    return this.client!.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isEnabled()) return;
    if (ttlSeconds && ttlSeconds > 0) {
      await this.client!.set(key, value, { EX: ttlSeconds });
    } else {
      await this.client!.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isEnabled()) return;
    await this.client!.del(key);
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    if (!this.isEnabled()) return;
    const iter = this.client!.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 });
    const toDelete: string[] = [];
    for await (const key of iter) toDelete.push(key as string);
    if (toDelete.length) await this.client!.del(toDelete);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const val = await this.get(key);
    if (!val) return null;
    try {
      return JSON.parse(val) as T;
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }
}

