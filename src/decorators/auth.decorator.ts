/**
 * @struktos/adapter-nestjs - Auth Decorators
 * 
 * Custom decorators for role-based and claims-based authorization.
 */

import { SetMetadata, applyDecorators } from '@nestjs/common';
import { 
  STRUKTOS_ROLES_KEY, 
  STRUKTOS_CLAIMS_KEY, 
  STRUKTOS_PUBLIC_KEY,
  ClaimRequirement 
} from '../types';

/**
 * @Roles() - Role-Based Authorization Decorator
 * 
 * Marks a route or controller as requiring specific roles.
 * User needs at least one of the specified roles (OR logic).
 * 
 * @param roles - Required roles
 * 
 * @example
 * ```typescript
 * // Single role
 * @Get('admin')
 * @Roles('Admin')
 * adminOnly() {
 *   return 'Admin content';
 * }
 * 
 * // Multiple roles (OR logic)
 * @Get('moderator')
 * @Roles('Admin', 'Moderator')
 * moderatorContent() {
 *   return 'Moderator content';
 * }
 * 
 * // Controller level
 * @Controller('admin')
 * @Roles('Admin')
 * export class AdminController {
 *   // All routes require Admin role
 * }
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata(STRUKTOS_ROLES_KEY, roles);

/**
 * @RequireClaim() - Claims-Based Authorization Decorator
 * 
 * Marks a route or controller as requiring specific claims.
 * 
 * @param type - Claim type
 * @param value - Optional claim value (if not provided, only type is checked)
 * 
 * @example
 * ```typescript
 * // Require specific claim type and value
 * @Post('documents')
 * @RequireClaim('permission', 'write:documents')
 * createDocument() {
 *   return 'Document created';
 * }
 * 
 * // Require only claim type
 * @Get('beta')
 * @RequireClaim('feature', 'beta-access')
 * betaFeatures() {
 *   return 'Beta features';
 * }
 * 
 * // Multiple claims (use multiple decorators)
 * @Get('special')
 * @RequireClaim('permission', 'read:special')
 * @RequireClaim('department', 'engineering')
 * specialContent() {
 *   return 'Special content';
 * }
 * ```
 */
export const RequireClaim = (type: string, value?: string) => {
  const claim: ClaimRequirement = { type, value };
  return SetMetadata(STRUKTOS_CLAIMS_KEY, claim);
};

/**
 * @RequireClaims() - Multiple Claims Authorization Decorator
 * 
 * Marks a route as requiring multiple claims (AND logic).
 * 
 * @param claims - Array of claim requirements
 * 
 * @example
 * ```typescript
 * @Get('restricted')
 * @RequireClaims([
 *   { type: 'permission', value: 'read:restricted' },
 *   { type: 'clearance', value: 'level-3' }
 * ])
 * restrictedContent() {
 *   return 'Restricted content';
 * }
 * ```
 */
export const RequireClaims = (claims: ClaimRequirement[]) => {
  return SetMetadata(STRUKTOS_CLAIMS_KEY, claims);
};

/**
 * @Public() - Public Route Decorator
 * 
 * Marks a route as public (bypasses authentication).
 * Use this when you have a global auth guard but want specific routes to be public.
 * 
 * @example
 * ```typescript
 * @Controller('auth')
 * export class AuthController {
 *   @Public()
 *   @Post('login')
 *   login() {
 *     return 'Login endpoint';
 *   }
 * 
 *   @Public()
 *   @Post('register')
 *   register() {
 *     return 'Register endpoint';
 *   }
 * }
 * ```
 */
export const Public = () => SetMetadata(STRUKTOS_PUBLIC_KEY, true);

/**
 * @Auth() - Combined Authentication Decorator
 * 
 * Combines @Roles and/or @RequireClaim into a single decorator.
 * Useful for applying multiple authorization rules at once.
 * 
 * @param options - Authorization options
 * 
 * @example
 * ```typescript
 * @Get('admin-content')
 * @Auth({ roles: ['Admin'], claim: { type: 'permission', value: 'admin:read' } })
 * adminContent() {
 *   return 'Admin content';
 * }
 * ```
 */
export interface AuthOptions {
  /** Required roles (OR logic) */
  roles?: string[];
  /** Required claim */
  claim?: ClaimRequirement;
  /** Multiple required claims (AND logic) */
  claims?: ClaimRequirement[];
}

export const Auth = (options: AuthOptions) => {
  const decorators: MethodDecorator[] = [];

  if (options.roles && options.roles.length > 0) {
    decorators.push(Roles(...options.roles));
  }

  if (options.claim) {
    decorators.push(RequireClaim(options.claim.type, options.claim.value));
  }

  if (options.claims && options.claims.length > 0) {
    decorators.push(RequireClaims(options.claims));
  }

  return applyDecorators(...decorators);
};

/**
 * @AdminOnly() - Admin Role Shorthand
 * 
 * Shorthand for @Roles('Admin')
 * 
 * @example
 * ```typescript
 * @Get('admin')
 * @AdminOnly()
 * adminEndpoint() {
 *   return 'Admin only';
 * }
 * ```
 */
export const AdminOnly = () => Roles('Admin');

/**
 * @ModeratorOrAdmin() - Moderator or Admin Role Shorthand
 * 
 * Shorthand for @Roles('Admin', 'Moderator')
 */
export const ModeratorOrAdmin = () => Roles('Admin', 'Moderator');