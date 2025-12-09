/**
 * @struktos/adapter-nestjs - Struktos Core Module
 * 
 * Main NestJS module that provides Struktos context propagation,
 * authentication guards, and logging interceptors.
 */

import {
  Module,
  DynamicModule,
  Global,
  MiddlewareConsumer,
  NestModule,
  Provider,
} from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { StruktosMiddleware } from '../middleware/struktos.middleware';
import { 
  StruktosAuthGuard, 
  StruktosRolesGuard, 
  StruktosClaimsGuard,
  AUTH_SERVICE 
} from '../guards/auth.guard';
import { 
  StruktosContextInterceptor,
  StruktosLoggingInterceptor,
  STRUKTOS_LOGGER 
} from '../interceptors/context.interceptor';
import { 
  StruktosCoreModuleOptions, 
  StruktosCoreModuleAsyncOptions,
  STRUKTOS_OPTIONS 
} from '../types';

/**
 * StruktosCoreModule - Main Integration Module
 * 
 * Provides complete Struktos.js integration with NestJS including:
 * - Context propagation middleware
 * - Authentication & authorization guards
 * - Logging interceptors
 * 
 * @example
 * ```typescript
 * // Basic usage (global module)
 * @Module({
 *   imports: [StruktosCoreModule.forRoot()],
 * })
 * export class AppModule {}
 * 
 * // With options
 * @Module({
 *   imports: [
 *     StruktosCoreModule.forRoot({
 *       generateTraceId: () => uuid.v4(),
 *       enableCancellation: true,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * 
 * // Async configuration
 * @Module({
 *   imports: [
 *     StruktosCoreModule.forRootAsync({
 *       imports: [ConfigModule],
 *       useFactory: (config: ConfigService) => ({
 *         generateTraceId: () => config.get('TRACE_ID_PREFIX') + uuid.v4(),
 *       }),
 *       inject: [ConfigService],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({})
export class StruktosCoreModule implements NestModule {
  /**
   * Configure middleware for all routes
   */
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(StruktosMiddleware).forRoutes('*');
  }

  /**
   * Register module with synchronous options
   */
  static forRoot(options: StruktosCoreModuleOptions = {}): DynamicModule {
    const isGlobal = options.isGlobal !== false;

    const providers: Provider[] = [
      {
        provide: STRUKTOS_OPTIONS,
        useValue: options,
      },
      StruktosMiddleware,
      StruktosAuthGuard,
      StruktosRolesGuard,
      StruktosClaimsGuard,
      StruktosContextInterceptor,
      StruktosLoggingInterceptor,
      Reflector,
    ];

    return {
      module: StruktosCoreModule,
      global: isGlobal,
      providers,
      exports: [
        STRUKTOS_OPTIONS,
        StruktosMiddleware,
        StruktosAuthGuard,
        StruktosRolesGuard,
        StruktosClaimsGuard,
        StruktosContextInterceptor,
        StruktosLoggingInterceptor,
      ],
    };
  }

  /**
   * Register module with asynchronous options
   */
  static forRootAsync(options: StruktosCoreModuleAsyncOptions): DynamicModule {
    const isGlobal = options.isGlobal !== false;

    const asyncProviders: Provider[] = [];

    if (options.useFactory) {
      asyncProviders.push({
        provide: STRUKTOS_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      });
    }

    const providers: Provider[] = [
      ...asyncProviders,
      StruktosMiddleware,
      StruktosAuthGuard,
      StruktosRolesGuard,
      StruktosClaimsGuard,
      StruktosContextInterceptor,
      StruktosLoggingInterceptor,
      Reflector,
    ];

    return {
      module: StruktosCoreModule,
      global: isGlobal,
      imports: options.imports || [],
      providers,
      exports: [
        STRUKTOS_OPTIONS,
        StruktosMiddleware,
        StruktosAuthGuard,
        StruktosRolesGuard,
        StruktosClaimsGuard,
        StruktosContextInterceptor,
        StruktosLoggingInterceptor,
      ],
    };
  }

  /**
   * Create a feature module for specific feature isolation
   */
  static forFeature(): DynamicModule {
    return {
      module: StruktosCoreModule,
      providers: [
        StruktosAuthGuard,
        StruktosRolesGuard,
        StruktosClaimsGuard,
      ],
      exports: [
        StruktosAuthGuard,
        StruktosRolesGuard,
        StruktosClaimsGuard,
      ],
    };
  }
}

/**
 * StruktosAuthModule - Authentication-Only Module
 * 
 * Use this when you only need authentication features without
 * the full context propagation system.
 * 
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     StruktosAuthModule.forRoot({
 *       authService: myAuthService,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
export interface StruktosAuthModuleOptions {
  /**
   * AuthService instance from @struktos/auth
   */
  authService?: any;

  /**
   * Whether to register as global guard
   * @default false
   */
  useGlobalGuard?: boolean;

  /**
   * Whether module is global
   * @default true
   */
  isGlobal?: boolean;
}

@Global()
@Module({})
export class StruktosAuthModule {
  /**
   * Register auth module with options
   */
  static forRoot(options: StruktosAuthModuleOptions = {}): DynamicModule {
    const isGlobal = options.isGlobal !== false;

    const providers: Provider[] = [
      Reflector,
      StruktosAuthGuard,
      StruktosRolesGuard,
      StruktosClaimsGuard,
    ];

    // Provide auth service if given
    if (options.authService) {
      providers.push({
        provide: AUTH_SERVICE,
        useValue: options.authService,
      });
    }

    // Register as global guard if requested
    if (options.useGlobalGuard) {
      providers.push({
        provide: APP_GUARD,
        useClass: StruktosAuthGuard,
      });
    }

    return {
      module: StruktosAuthModule,
      global: isGlobal,
      providers,
      exports: [
        StruktosAuthGuard,
        StruktosRolesGuard,
        StruktosClaimsGuard,
        AUTH_SERVICE,
      ].filter(Boolean),
    };
  }

  /**
   * Register auth module asynchronously
   */
  static forRootAsync(options: {
    imports?: any[];
    useFactory: (...args: any[]) => Promise<StruktosAuthModuleOptions> | StruktosAuthModuleOptions;
    inject?: any[];
    isGlobal?: boolean;
  }): DynamicModule {
    const isGlobal = options.isGlobal !== false;

    return {
      module: StruktosAuthModule,
      global: isGlobal,
      imports: options.imports || [],
      providers: [
        Reflector,
        StruktosAuthGuard,
        StruktosRolesGuard,
        StruktosClaimsGuard,
        {
          provide: 'STRUKTOS_AUTH_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: AUTH_SERVICE,
          useFactory: (opts: StruktosAuthModuleOptions) => opts.authService,
          inject: ['STRUKTOS_AUTH_OPTIONS'],
        },
      ],
      exports: [
        StruktosAuthGuard,
        StruktosRolesGuard,
        StruktosClaimsGuard,
        AUTH_SERVICE,
      ],
    };
  }
}

/**
 * StruktosLoggingModule - Logging-Only Module
 * 
 * Use this when you only need logging features.
 * 
 * @example
 * ```typescript
 * @Module({
 *   imports: [
 *     StruktosLoggingModule.forRoot({
 *       logger: myLogger,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
export interface StruktosLoggingModuleOptions {
  /**
   * Logger instance from @struktos/logger
   */
  logger?: any;

  /**
   * Use logging interceptor globally
   * @default true
   */
  useGlobalInterceptor?: boolean;

  /**
   * Whether module is global
   * @default true
   */
  isGlobal?: boolean;
}

@Global()
@Module({})
export class StruktosLoggingModule {
  static forRoot(options: StruktosLoggingModuleOptions = {}): DynamicModule {
    const isGlobal = options.isGlobal !== false;
    const useGlobalInterceptor = options.useGlobalInterceptor !== false;

    const providers: Provider[] = [
      StruktosContextInterceptor,
      StruktosLoggingInterceptor,
    ];

    if (options.logger) {
      providers.push({
        provide: STRUKTOS_LOGGER,
        useValue: options.logger,
      });
    }

    if (useGlobalInterceptor) {
      providers.push({
        provide: APP_INTERCEPTOR,
        useClass: StruktosContextInterceptor,
      });
    }

    return {
      module: StruktosLoggingModule,
      global: isGlobal,
      providers,
      exports: [
        StruktosContextInterceptor,
        StruktosLoggingInterceptor,
        STRUKTOS_LOGGER,
      ].filter(Boolean),
    };
  }
}