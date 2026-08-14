import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const express = app.getHttpAdapter().getInstance();

express.set(
  'json replacer',
  (_key: string, value: unknown) =>
    typeof value === 'bigint' ? value.toString() : value,
);

 app.enableCors({
  origin: [
    'http://localhost:3000',
    'http://151.243.173.85:3000',
    'https://epic-p2p.online',
  ],
});

await app.listen(3001);

console.log('Admin API: http://151.243.173.85:3001');
}

bootstrap().catch((err) => {
  console.error('Failed to start bot:', err);
  process.exit(1);
});
