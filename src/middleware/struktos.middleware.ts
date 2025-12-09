/**
 * @struktos/adapter-nestjs - Struktos Middleware
 * 
 * NestJS middleware that initializes Struktos context for each request.
 * Integrates with @struktos/core for context propagation.
 */

import { Injectable, NestMiddleware, Inject, Optional } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContext } from '@struktos/core';
import { 
  StruktosCoreModuleOptions, 
  NestJSContextData, 
  STRUKTOS_OPTIONS 
} from '../types';

/**
 * Generate a unique trace ID using crypto
 */
function generateDefaultTraceId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 11);
  return `trace-${timestamp}-${randomPart}`;
}

/**
 * StruktosMiddleware - Request Context Initialization
 * 
 * This middleware creates a new Struktos context for each incoming request
 * and ensures context propagation through all async operations.
 * 
 * Features:
 * - Automatic trace ID generation
 * - Request metadata extraction
 * - Optional user extraction
 * - Cancellation token support
 * - Lifecycle callbacks
 * 
 * @example
 * ```typescript
 * // In AppModule
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer.apply(StruktosMiddleware).forRoutes('*');
 *   }
 * }
 * ```
 */
@Injectable()
export class StruktosMiddleware implements NestMiddleware {
  private readonly options: Required<Omit<StruktosCoreModuleOptions, 'isGlobal'>>;

  constructor(
    @Optional() @Inject(STRUKTOS_OPTIONS) 
    options?: StruktosCoreModuleOptions
  ) {
    this.options = {
      generateTraceId: options?.generateTraceId ?? generateDefaultTraceId,
      enableCancellation: options?.enableCancellation ?? true,
      extractUser: options?.extractUser ?? (() => undefined),
      onContextCreated: options?.onContextCreated ?? (() => {}),
      onContextDestroyed: options?.onContextDestroyed ?? (() => {}),
    };
  }

  /**
   * Middleware handler - wraps request in Struktos context
   */
  use(req: Request, res: Response, next: NextFunction): void {
    const traceId = this.options.generateTraceId();
    const user = this.options.extractUser(req);

    // Build initial context data
    const contextData: NestJSContextData = {
      traceId,
      requestId: (req as any).id ?? traceId,
      timestamp: Date.now(),
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip || (req.connection?.remoteAddress),
      userAgent: req.get('user-agent'),
      user,
      userId: user?.id,
    };

    // Run the request within Struktos context
    RequestContext.run(contextData, () => {
      const context = RequestContext.current<NestJSContextData>();
      
      if (context) {
        // Invoke context created callback
        this.options.onContextCreated(contextData, req);

        // Set up cancellation on client disconnect
        if (this.options.enableCancellation) {
          const onClose = () => {
            context.cancel();
          };

          req.on('close', onClose);
          req.on('aborted', onClose);

          // Clean up listener on response finish
          res.on('finish', () => {
            req.removeListener('close', onClose);
            req.removeListener('aborted', onClose);
          });
        }

        // Clean up on response finish
        res.on('finish', () => {
          this.options.onContextDestroyed(contextData, req);
        });

        // Attach context to request for compatibility
        (req as any).struktosContext = context;
        (req as any).traceId = traceId;
      }

      next();
    });
  }
}

/**
 * Factory function to create middleware with custom options
 */
export function createStruktosMiddleware(options?: StruktosCoreModuleOptions): typeof StruktosMiddleware {
  @Injectable()
  class ConfiguredStruktosMiddleware extends StruktosMiddleware {
    constructor() {
      super(options);
    }
  }
  return ConfiguredStruktosMiddleware;
}