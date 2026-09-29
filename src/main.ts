import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppLogger } from './common/logger/logger.service';
import { TraceabilityInterceptor } from './common/interceptors/traceability.interceptor';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        bufferLogs: true,
    });

    const appLogger = app.get(AppLogger);
    app.useLogger(appLogger);
    app.useGlobalInterceptors(new TraceabilityInterceptor(appLogger));

    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    appLogger.log(`Servidor iniciado exitosamente en el puerto ${port}`);
}

bootstrap();