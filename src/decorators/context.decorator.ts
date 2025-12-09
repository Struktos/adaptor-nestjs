/**
 * @struktos/adapter-nestjs - Context Decorators
 * 
 * Custom decorators for accessing Struktos context in NestJS controllers.
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestContext } from '@struktos/core';
import { NestJSContextData } from '../types';

/**
 * @Ctx() - Context Parameter Decorator
 * 
 * Injects Struktos context or specific context values into controller methods.
 * 
 * @example
 * ```typescript
 * // Get entire context
 * @Get()
 * handler(@Ctx() ctx: RequestContext<NestJSContextData>) {
 *   console.log(ctx.get('traceId'));
 * }
 * 
 * // Get specific value
 * @Get()
 * handler(@Ctx('traceId') traceId: string) {
 *   console.log(traceId);
 * }
 * 
 * // Get user ID
 * @Get()
 * handler(@Ctx('userId') userId: string) {
 *   console.log(userId);
 * }
 * ```
 */
export const Ctx = createParamDecorator(
  <K extends keyof NestJSContextData>(
    data: K | undefined,
    _executionContext: ExecutionContext
  ): RequestContext<NestJSContextData> | NestJSContextData[K] | undefined => {
    const context = RequestContext.current<NestJSContextData>();
    
    if (!context) {
      return undefined;
    }

    // If a specific key is requested, return that value
    if (data) {
      return context.get(data);
    }

    // Otherwise, return the entire context
    return context;
  }
);

/**
 * @TraceId() - Trace ID Parameter Decorator
 * 
 * Shorthand for @Ctx('traceId')
 * 
 * @example
 * ```typescript
 * @Get()
 * handler(@TraceId() traceId: string) {
 *   console.log(`Processing request: ${traceId}`);
 * }
 * ```
 */
export const TraceId = createParamDecorator(
  (_data: unknown, _executionCtx: ExecutionContext): string | undefined => {
    const context = RequestContext.current<NestJSContextData>();
    return context?.get('traceId');
  }
);

/**
 * @CurrentUser() - Current User Parameter Decorator
 * 
 * Injects the current authenticated user from context.
 * 
 * @example
 * ```typescript
 * @Get('profile')
 * @UseGuards(StruktosAuthGuard)
 * getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 * 
 * // Get specific user property
 * @Get('profile')
 * @UseGuards(StruktosAuthGuard)
 * getProfile(@CurrentUser('id') userId: string) {
 *   return { userId };
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, _ctx: ExecutionContext): any => {
    const context = RequestContext.current<NestJSContextData>();
    const user = context?.get('user');

    if (!user) {
      return undefined;
    }

    // If a specific property is requested
    if (data) {
      return user[data];
    }

    return user;
  }
);

/**
 * @UserId() - User ID Parameter Decorator
 * 
 * Shorthand for getting the current user's ID
 * 
 * @example
 * ```typescript
 * @Get('my-items')
 * @UseGuards(StruktosAuthGuard)
 * getMyItems(@UserId() userId: string) {
 *   return this.itemsService.findByUser(userId);
 * }
 * ```
 */
export const UserId = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext): string | undefined => {
    const context = RequestContext.current<NestJSContextData>();
    return context?.get('userId');
  }
);

/**
 * @RequestTimestamp() - Request Timestamp Parameter Decorator
 * 
 * Gets the timestamp when the request started
 * 
 * @example
 * ```typescript
 * @Get()
 * handler(@RequestTimestamp() startTime: number) {
 *   const duration = Date.now() - startTime;
 *   console.log(`Request took ${duration}ms`);
 * }
 * ```
 */
export const RequestTimestamp = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext): number | undefined => {
    const context = RequestContext.current<NestJSContextData>();
    return context?.get('timestamp');
  }
);

/**
 * @IsCancelled() - Cancellation Status Parameter Decorator
 * 
 * Checks if the current request context has been cancelled
 * 
 * @example
 * ```typescript
 * @Get('long-task')
 * async longTask(@IsCancelled() cancelled: () => boolean) {
 *   while (!cancelled()) {
 *     await this.processChunk();
 *   }
 * }
 * ```
 */
export const IsCancelled = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext): (() => boolean) => {
    const context = RequestContext.current<NestJSContextData>();
    return () => context?.isCancelled() ?? false;
  }
);