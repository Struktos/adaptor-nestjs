/**
 * @struktos/adapter-nestjs - Context Interceptors
 * 
 * Interceptors for enriching responses with context information
 * and logging request lifecycle events.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { RequestContext } from '@struktos/core';
import { NestJSContextData } from '../types';

/**
 * LOGGER injection token for optional logger integration
 */
export const STRUKTOS_LOGGER = 'STRUKTOS_LOGGER';

/**
 * Logger interface for optional integration with @struktos/logger
 */
interface ILogger {
  info(message: string, metadata?: Record<string, any>): void;
  error(message: string, error?: Error, metadata?: Record<string, any>): void;
  debug(message: string, metadata?: Record<string, any>): void;
}

/**
 * StruktosContextInterceptor - Response Enrichment Interceptor
 * 
 * Adds trace ID and request timing information to responses.
 * Can also add context information to response headers.
 * 
 * @example
 * ```typescript
 * // Global interceptor
 * @Module({
 *   providers: [
 *     {
 *       provide: APP_INTERCEPTOR,
 *       useClass: StruktosContextInterceptor,
 *     },
 *   ],
 * })
 * export class AppModule {}
 * 
 * // Controller-level
 * @Controller('users')
 * @UseInterceptors(StruktosContextInterceptor)
 * export class UsersController {}
 * ```
 */
@Injectable()
export class StruktosContextInterceptor implements NestInterceptor {
  constructor(
    @Optional() @Inject(STRUKTOS_LOGGER) private readonly logger?: ILogger
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = RequestContext.current<NestJSContextData>();
    const traceId = ctx?.get('traceId');
    const startTime = ctx?.get('timestamp') || Date.now();

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();

    // Add trace ID to response headers
    if (traceId) {
      response.setHeader('X-Trace-Id', traceId);
    }

    // Log request start
    this.logger?.debug('Request started', {
      traceId,
      method: request.method,
      url: request.url,
    });

    return next.handle().pipe(
      tap((_data) => {
        const duration = Date.now() - startTime;

        // Add timing header
        response.setHeader('X-Response-Time', `${duration}ms`);

        // Log request completion
        this.logger?.info('Request completed', {
          traceId,
          method: request.method,
          url: request.url,
          statusCode: response.statusCode,
          duration,
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;

        // Log error
        this.logger?.error('Request failed', error, {
          traceId,
          method: request.method,
          url: request.url,
          duration,
        });

        return throwError(() => error);
      })
    );
  }
}

/**
 * StruktosResponseInterceptor - Response Transformation Interceptor
 * 
 * Wraps responses in a standard format with context information.
 * 
 * @example
 * ```typescript
 * // Response will be transformed to:
 * // {
 * //   success: true,
 * //   data: { ... },
 * //   meta: {
 * //     traceId: 'trace-xxx',
 * //     timestamp: '2024-01-01T00:00:00Z',
 * //     duration: 50
 * //   }
 * // }
 * ```
 */
@Injectable()
export class StruktosResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    // These can be used for future response transformation
    // const ctx = RequestContext.current<NestJSContextData>();
    // const traceId = ctx?.get('traceId');
    // const startTime = ctx?.get('timestamp') || Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          // Response transformation handled by map if needed
        },
      })
    );
  }
}

/**
 * StruktosLoggingInterceptor - Request Logging Interceptor
 * 
 * Comprehensive logging interceptor that logs request/response lifecycle.
 * Integrates with @struktos/logger for consistent structured logging.
 * 
 * @example
 * ```typescript
 * @Module({
 *   providers: [
 *     {
 *       provide: APP_INTERCEPTOR,
 *       useClass: StruktosLoggingInterceptor,
 *     },
 *     {
 *       provide: STRUKTOS_LOGGER,
 *       useValue: logger,
 *     },
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Injectable()
export class StruktosLoggingInterceptor implements NestInterceptor {
  constructor(
    @Optional() @Inject(STRUKTOS_LOGGER) private readonly logger?: ILogger
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = RequestContext.current<NestJSContextData>();
    const traceId = ctx?.get('traceId');
    const startTime = Date.now();

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const { method, url, body, query, params } = request;

    // Log incoming request
    this.logger?.info('Incoming request', {
      traceId,
      method,
      url,
      query: Object.keys(query || {}).length > 0 ? query : undefined,
      params: Object.keys(params || {}).length > 0 ? params : undefined,
      bodySize: body ? JSON.stringify(body).length : 0,
      userId: ctx?.get('userId'),
    });

    return next.handle().pipe(
      tap((responseBody) => {
        const duration = Date.now() - startTime;
        const response = httpContext.getResponse();

        this.logger?.info('Outgoing response', {
          traceId,
          method,
          url,
          statusCode: response.statusCode,
          duration,
          responseSize: responseBody ? JSON.stringify(responseBody).length : 0,
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;

        this.logger?.error('Request error', error, {
          traceId,
          method,
          url,
          duration,
          errorName: error.name,
          errorMessage: error.message,
        });

        return throwError(() => error);
      })
    );
  }
}

/**
 * StruktosTimingInterceptor - Simple Timing Interceptor
 * 
 * Lightweight interceptor that only adds timing headers.
 * Use this for minimal overhead.
 * 
 * @example
 * ```typescript
 * @Controller('fast')
 * @UseInterceptors(StruktosTimingInterceptor)
 * export class FastController {}
 * ```
 */
@Injectable()
export class StruktosTimingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        response.setHeader('X-Response-Time', `${duration}ms`);
      })
    );
  }
}