import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

function getAllowedOrigins(): string[] {
  const configured = process.env.CORS_ORIGINS ?? process.env.FRONTEND_URL;
  if (configured != null && configured.trim() !== '') {
    return configured
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  }

  return ['http://localhost:5173', 'https://store-saas-five.vercel.app'];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // '0.0.0.0' es necesario en muchos PaaS (p. ej. Railway) para aceptar tráfico externo
  const port = Number.parseInt(process.env.PORT ?? '3000', 10) || 3000;
  const allowedOrigins = getAllowedOrigins();
  app.enableCors({
    origin(
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) {
      if (origin == null || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-store-id', 'Accept'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
