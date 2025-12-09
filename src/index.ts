/**
 * @struktos/adapter-nestjs
 * 
 * NestJS adapter for Struktos.js framework.
 * Provides seamless integration of Struktos context propagation,
 * authentication, and logging with NestJS applications.
 * 
 * @example
 * ```typescript
 * import { Module } from '@nestjs/common';
 * import { StruktosCoreModule, Ctx, Roles, StruktosAuthGuard } from '@struktos/adapter-nestjs';
 * 
 * @Module({
 *   imports: [StruktosCoreModule.forRoot()],
 * })
 * export class AppModule {}
 * 
 * @Controller('users')
 * export class UsersController {
 *   @Get()
 *   @UseGuards(StruktosAuthGuard)
 *   @Roles('Admin')
 *   findAll(@Ctx('traceId') traceId: string) {
 *     console.log(`TraceID: ${traceId}`);
 *     return this.usersService.findAll();
 *   }
 * }
 * ```
 * 
 * @module @struktos/adapter-nestjs
 */

// ==================== Modules ====================
export {
  StruktosCoreModule,
  StruktosAuthModule,
  StruktosLoggingModule,
  type StruktosAuthModuleOptions,
  type StruktosLoggingModuleOptions,
} from './module';

// ==================== Middleware ====================
export { 
  StruktosMiddleware, 
  createStruktosMiddleware 
} from './middleware';

// ==================== Decorators ====================
export {
  // Context decorators
  Ctx,
  TraceId,
  CurrentUser,
  UserId,
  RequestTimestamp,
  IsCancelled,
  // Auth decorators
  Roles,
  RequireClaim,
  RequireClaims,
  Public,
  Auth,
  AdminOnly,
  ModeratorOrAdmin,
  type AuthOptions,
} from './decorators';

// ==================== Guards ====================
export {
  StruktosAuthGuard,
  StruktosRolesGuard,
  StruktosClaimsGuard,
  AUTH_SERVICE,
} from './guards';

// ==================== Interceptors ====================
export {
  StruktosContextInterceptor,
  StruktosResponseInterceptor,
  StruktosLoggingInterceptor,
  StruktosTimingInterceptor,
  STRUKTOS_LOGGER,
} from './interceptors';

// ==================== Types ====================
export {
  NestJSContextData,
  StruktosCoreModuleOptions,
  StruktosCoreModuleAsyncOptions,
  StruktosAuthGuardOptions,
  ClaimRequirement,
  STRUKTOS_OPTIONS,
  STRUKTOS_ROLES_KEY,
  STRUKTOS_CLAIMS_KEY,
  STRUKTOS_PUBLIC_KEY,
  type ContextValue,
} from './types';

// ==================== Version ====================
export const VERSION = '0.1.0';

// ==================== Default Export ====================
export { StruktosCoreModule as default } from './module';