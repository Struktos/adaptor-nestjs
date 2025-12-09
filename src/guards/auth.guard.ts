/**
 * @struktos/adapter-nestjs - Struktos Auth Guard
 * 
 * NestJS Guard that integrates with @struktos/auth for authentication
 * and authorization using roles and claims.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestContext } from '@struktos/core';
import {
  NestJSContextData,
  STRUKTOS_ROLES_KEY,
  STRUKTOS_CLAIMS_KEY,
  STRUKTOS_PUBLIC_KEY,
  ClaimRequirement,
} from '../types';

// Optional import types for @struktos/auth
interface AuthService {
  validateToken(token: string): Promise<any>;
}

interface User {
  id: string;
  username: string;
  email: string;
  roles?: string[];
  claims?: Array<{ type: string; value: string }>;
}

/**
 * AUTH_SERVICE injection token
 */
export const AUTH_SERVICE = 'STRUKTOS_AUTH_SERVICE';

/**
 * StruktosAuthGuard - Unified Authentication & Authorization Guard
 * 
 * This guard handles both authentication (JWT validation) and authorization
 * (role/claim checking) in a single guard, integrating seamlessly with
 * @struktos/auth module.
 * 
 * Features:
 * - JWT token validation via @struktos/auth
 * - Role-based authorization (@Roles decorator)
 * - Claims-based authorization (@RequireClaim decorator)
 * - Public route bypass (@Public decorator)
 * - Context integration (user stored in RequestContext)
 * 
 * @example
 * ```typescript
 * // Global guard registration
 * @Module({
 *   providers: [
 *     {
 *       provide: APP_GUARD,
 *       useClass: StruktosAuthGuard,
 *     },
 *   ],
 * })
 * export class AppModule {}
 * 
 * // Route-level usage
 * @Controller('users')
 * export class UsersController {
 *   @Get()
 *   @UseGuards(StruktosAuthGuard)
 *   @Roles('Admin')
 *   findAll() {
 *     return this.usersService.findAll();
 *   }
 * }
 * ```
 */
@Injectable()
export class StruktosAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional() @Inject(AUTH_SERVICE) private readonly authService?: AuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(STRUKTOS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    
    // Get user from context or request
    let user = this.getUserFromContext() || request.user;

    // If no user and auth service available, try to authenticate
    if (!user && this.authService) {
      user = await this.authenticateRequest(request);
    }

    // Check if authentication is required
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(STRUKTOS_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredClaims = this.reflector.getAllAndOverride<ClaimRequirement | ClaimRequirement[]>(
      STRUKTOS_CLAIMS_KEY,
      [context.getHandler(), context.getClass()]
    );

    // If roles or claims are required, user must be authenticated
    if ((requiredRoles && requiredRoles.length > 0) || requiredClaims) {
      if (!user) {
        throw new UnauthorizedException('Authentication required');
      }

      // Store user in context
      this.storeUserInContext(user, request);

      // Check roles
      if (requiredRoles && requiredRoles.length > 0) {
        if (!this.checkRoles(user, requiredRoles)) {
          throw new ForbiddenException(
            `Required roles: ${requiredRoles.join(', ')}`
          );
        }
      }

      // Check claims
      if (requiredClaims) {
        if (!this.checkClaims(user, requiredClaims)) {
          const claimsStr = Array.isArray(requiredClaims)
            ? requiredClaims.map(c => `${c.type}:${c.value || '*'}`).join(', ')
            : `${requiredClaims.type}:${requiredClaims.value || '*'}`;
          throw new ForbiddenException(`Required claims: ${claimsStr}`);
        }
      }
    }

    // If user exists, store in context (even without role/claim requirements)
    if (user) {
      this.storeUserInContext(user, request);
    }

    return true;
  }

  /**
   * Authenticate request using JWT token
   */
  private async authenticateRequest(request: any): Promise<User | null> {
    if (!this.authService) {
      return null;
    }

    const authHeader = request.headers?.authorization;
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    const token = parts[1];

    try {
      const user = await this.authService.validateToken(token);
      return user;
    } catch {
      return null;
    }
  }

  /**
   * Get user from Struktos context
   */
  private getUserFromContext(): User | undefined {
    const ctx = RequestContext.current<NestJSContextData>();
    return ctx?.get('user') as User | undefined;
  }

  /**
   * Store user in Struktos context and request
   */
  private storeUserInContext(user: User, request: any): void {
    const ctx = RequestContext.current<NestJSContextData>();
    if (ctx) {
      ctx.set('user', user);
      ctx.set('userId', user.id);
      ctx.set('roles', user.roles || []);
    }
    request.user = user;
  }

  /**
   * Check if user has required roles (OR logic)
   */
  private checkRoles(user: User, requiredRoles: string[]): boolean {
    if (!user.roles || user.roles.length === 0) {
      return false;
    }
    return requiredRoles.some(role => user.roles!.includes(role));
  }

  /**
   * Check if user has required claims
   */
  private checkClaims(
    user: User,
    requiredClaims: ClaimRequirement | ClaimRequirement[]
  ): boolean {
    if (!user.claims || user.claims.length === 0) {
      return false;
    }

    const claims = Array.isArray(requiredClaims) ? requiredClaims : [requiredClaims];

    // AND logic - all claims must be satisfied
    return claims.every(requirement => {
      return user.claims!.some(claim => {
        if (claim.type !== requirement.type) {
          return false;
        }
        // If value is specified, must match exactly
        if (requirement.value !== undefined) {
          return claim.value === requirement.value;
        }
        // If no value specified, just type match is enough
        return true;
      });
    });
  }
}

/**
 * StruktosRolesGuard - Role-Only Authorization Guard
 * 
 * Use this guard when you only need role-based authorization
 * and authentication is handled separately.
 * 
 * @example
 * ```typescript
 * @Get('admin')
 * @UseGuards(StruktosRolesGuard)
 * @Roles('Admin')
 * adminRoute() {
 *   return 'Admin only';
 * }
 * ```
 */
@Injectable()
export class StruktosRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(STRUKTOS_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const user = this.getUser(context);
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (!user.roles || !requiredRoles.some(role => user.roles!.includes(role))) {
      throw new ForbiddenException(`Required roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }

  private getUser(context: ExecutionContext): User | undefined {
    // Try context first
    const ctx = RequestContext.current<NestJSContextData>();
    if (ctx?.get('user')) {
      return ctx.get('user') as User;
    }

    // Fall back to request
    const request = context.switchToHttp().getRequest();
    return request.user;
  }
}

/**
 * StruktosClaimsGuard - Claims-Only Authorization Guard
 * 
 * Use this guard when you only need claims-based authorization
 * and authentication is handled separately.
 * 
 * @example
 * ```typescript
 * @Post('documents')
 * @UseGuards(StruktosClaimsGuard)
 * @RequireClaim('permission', 'write:documents')
 * createDocument() {
 *   return 'Document created';
 * }
 * ```
 */
@Injectable()
export class StruktosClaimsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredClaims = this.reflector.getAllAndOverride<ClaimRequirement | ClaimRequirement[]>(
      STRUKTOS_CLAIMS_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredClaims) {
      return true;
    }

    const user = this.getUser(context);
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const claims = Array.isArray(requiredClaims) ? requiredClaims : [requiredClaims];

    for (const requirement of claims) {
      const hasClaim = user.claims?.some(claim => {
        if (claim.type !== requirement.type) return false;
        if (requirement.value !== undefined) {
          return claim.value === requirement.value;
        }
        return true;
      });

      if (!hasClaim) {
        throw new ForbiddenException(
          `Required claim: ${requirement.type}${requirement.value ? `:${requirement.value}` : ''}`
        );
      }
    }

    return true;
  }

  private getUser(context: ExecutionContext): User | undefined {
    const ctx = RequestContext.current<NestJSContextData>();
    if (ctx?.get('user')) {
      return ctx.get('user') as User;
    }

    const request = context.switchToHttp().getRequest();
    return request.user;
  }
}