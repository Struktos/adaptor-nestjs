/**
 * @struktos/adapter-nestjs - Type Definitions
 * 
 * Type definitions for NestJS adapter integration
 */

import { ModuleMetadata } from '@nestjs/common';
import { StruktosContextData } from '@struktos/core';

/**
 * Extended context data for NestJS applications
 */
export interface NestJSContextData extends StruktosContextData {
  /** Unique trace ID for request tracking */
  traceId: string;
  /** HTTP request ID */
  requestId?: string;
  /** Timestamp when request started */
  timestamp: number;
  /** HTTP method */
  method?: string;
  /** Request URL path */
  url?: string;
  /** Client IP address */
  ip?: string;
  /** User agent string */
  userAgent?: string;
  /** Authenticated user object */
  user?: Record<string, any>;
  /** User ID if authenticated */
  userId?: string;
  /** User's roles */
  roles?: string[];
  /** Custom metadata */
  [key: string]: any;
}

/**
 * Options for Struktos Core Module
 */
export interface StruktosCoreModuleOptions {
  /**
   * Custom function to generate trace IDs
   * @default UUID v4
   */
  generateTraceId?: () => string;

  /**
   * Enable automatic cancellation on client disconnect
   * @default true
   */
  enableCancellation?: boolean;

  /**
   * Custom function to extract user from request
   */
  extractUser?: (request: any) => Record<string, any> | undefined;

  /**
   * Callback when context is created
   */
  onContextCreated?: (context: NestJSContextData, request: any) => void;

  /**
   * Callback when context is destroyed
   */
  onContextDestroyed?: (context: NestJSContextData, request: any) => void;

  /**
   * Whether this module is global
   * @default true
   */
  isGlobal?: boolean;
}

/**
 * Async module options for dynamic configuration
 */
export interface StruktosCoreModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  /**
   * Whether this module is global
   * @default true
   */
  isGlobal?: boolean;

  /**
   * Factory function to provide options
   */
  useFactory?: (...args: any[]) => Promise<StruktosCoreModuleOptions> | StruktosCoreModuleOptions;

  /**
   * Dependencies to inject into useFactory
   */
  inject?: any[];
}

/**
 * Options for Struktos Auth Guard
 */
export interface StruktosAuthGuardOptions {
  /**
   * Required roles (OR logic - user needs at least one)
   */
  roles?: string[];

  /**
   * Required claim type
   */
  claimType?: string;

  /**
   * Required claim value (optional - if not provided, only type is checked)
   */
  claimValue?: string;

  /**
   * Custom unauthorized message
   */
  unauthorizedMessage?: string;

  /**
   * Custom forbidden message
   */
  forbiddenMessage?: string;
}

/**
 * Metadata key constants
 */
export const STRUKTOS_OPTIONS = 'STRUKTOS_OPTIONS';
export const STRUKTOS_ROLES_KEY = 'struktos:roles';
export const STRUKTOS_CLAIMS_KEY = 'struktos:claims';
export const STRUKTOS_PUBLIC_KEY = 'struktos:public';

/**
 * Claim requirement interface
 */
export interface ClaimRequirement {
  type: string;
  value?: string;
}

/**
 * Context accessor result type
 */
export type ContextValue<T> = T | undefined;