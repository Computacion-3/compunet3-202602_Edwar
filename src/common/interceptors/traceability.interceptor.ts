import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
} from '@nestjs/common';
import * as crypto from 'node:crypto';
import { STATUS_CODES } from 'node:http';
import { Observable, finalize } from 'rxjs';
import { Request, Response } from 'express';
import { AppLogger } from '../logger/logger.service';

type TraceableRequest = Request & { correlationId: string };

@Injectable()
export class TraceabilityInterceptor implements NestInterceptor {
	constructor(private readonly logger: AppLogger) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const httpContext = context.switchToHttp();
		const request = httpContext.getRequest<TraceableRequest>();
		const response = httpContext.getResponse<Response>();
		const incomingId = request.headers['x-correlation-id'];
		const correlationId = Array.isArray(incomingId) ? incomingId[0] : incomingId;
		const requestId = correlationId || crypto.randomUUID();
		const startTime = Date.now();
		let traceLogged = false;

		const logTrace = () => {
			if (traceLogged) {
				return;
			}
			traceLogged = true;

			const duration = Date.now() - startTime;
			const statusCode = response.statusCode;
			const status = `${statusCode} ${STATUS_CODES[statusCode] ?? 'Unknown'}`;

			this.logger.log(
				`[TRACE] [${request.method} ${request.originalUrl}] [${status}] [Duration: ${duration}ms] [CorrelationID: ${requestId}]`,
			);
		};

		request.correlationId = requestId;
		response.setHeader('x-correlation-id', requestId);

		return next.handle().pipe(
			finalize(() => {
				if (response.writableFinished || response.destroyed) {
					logTrace();
					return;
				}

				response.once('finish', logTrace);
				response.once('close', logTrace);
			}),
		);
	}
}
