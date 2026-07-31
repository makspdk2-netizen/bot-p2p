import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '../config/config.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private configService: ConfigService) {}

 async onModuleInit() {
  this.client = new Redis({
    host: this.configService.redisHost,
    port: this.configService.redisPort,
    tls: {},
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async getSession(userId: number): Promise<Record<string, unknown> | null> {
    const data = await this.client.get(`session:${userId}`);
    if (!data) return null;
    try {
      const parsed = JSON.parse(data);
      return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
    } catch {
      await this.client.del(`session:${userId}`);
      return null;
    }
  }

  async setSession(userId: number, data: Record<string, unknown>): Promise<void> {
    await this.client.set(`session:${userId}`, JSON.stringify(data), 'EX', 86400);
  }

  async clearSession(userId: number): Promise<void> {
    await this.client.del(`session:${userId}`);
  }
  async setBotMessageId(userId: number, messageId: number): Promise<void> {
  const session = (await this.getSession(userId)) ?? {};

  await this.setSession(userId, {
    ...session,
    botMessageId: messageId,
  });
}

async getBotMessageId(userId: number): Promise<number | null> {
  const session = await this.getSession(userId);

  if (!session?.botMessageId) {
    return null;
  }

  return Number(session.botMessageId);
}

async clearBotMessageId(userId: number): Promise<void> {
  const session = await this.getSession(userId);

  if (!session) {
    return;
  }

  delete session.botMessageId;

  await this.setSession(userId, session);
}
}
