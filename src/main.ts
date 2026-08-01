import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:3000', 'https://siteee.wisp.uno'],
  });

  await app.listen(3001);

  console.log('P2P Exchange Bot is running');
  console.log('Admin API: http://localhost:3001');
}

bootstrap().catch((err) => {
  console.error('Failed to start bot:', err);
  process.exit(1);
});
