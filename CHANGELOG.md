# Changelog

All notable changes to `@struktos/adapter-nestjs` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-12-09

### 🎉 Initial Release

First release of `@struktos/adapter-nestjs` - NestJS adapter for Struktos.js framework.

### Added

#### Modules
- **StruktosCoreModule** - Main integration module with context propagation
  - `forRoot()` - Synchronous configuration
  - `forRootAsync()` - Async configuration with DI
  - `forFeature()` - Feature module for specific controllers
- **StruktosAuthModule** - Authentication-focused module
- **StruktosLoggingModule** - Logging-focused module

#### Middleware
- **StruktosMiddleware** - Request context initialization
  - Automatic trace ID generation
  - Request metadata extraction
  - Cancellation token support
  - Lifecycle callbacks

#### Decorators
- **Context Decorators:**
  - `@Ctx()` - Full context or specific value injection
  - `@TraceId()` - Trace ID injection
  - `@CurrentUser()` - Current user injection
  - `@UserId()` - User ID injection
  - `@RequestTimestamp()` - Request start time
  - `@IsCancelled()` - Cancellation status check

- **Auth Decorators:**
  - `@Roles()` - Role-based authorization
  - `@RequireClaim()` - Single claim requirement
  - `@RequireClaims()` - Multiple claims (AND logic)
  - `@Public()` - Public route marker
  - `@Auth()` - Combined authorization
  - `@AdminOnly()` - Admin role shorthand
  - `@ModeratorOrAdmin()` - Moderator/Admin shorthand

#### Guards
- **StruktosAuthGuard** - Unified authentication & authorization
- **StruktosRolesGuard** - Role-only authorization
- **StruktosClaimsGuard** - Claims-only authorization

#### Interceptors
- **StruktosContextInterceptor** - Response enrichment with trace ID
- **StruktosResponseInterceptor** - Response transformation
- **StruktosLoggingInterceptor** - Request/response logging
- **StruktosTimingInterceptor** - Simple timing header

#### Types
- `NestJSContextData` - Extended context data interface
- `StruktosCoreModuleOptions` - Module configuration
- `StruktosCoreModuleAsyncOptions` - Async module configuration
- `StruktosAuthGuardOptions` - Guard configuration
- `ClaimRequirement` - Claim requirement interface

### Compatibility

- **NestJS:** 10.x, 11.x
- **Node.js:** 18.x, 20.x, 21.x
- **TypeScript:** 5.x
- **@struktos/core:** ^0.1.0
- **@struktos/auth:** ^0.1.0 (optional)
- **@struktos/logger:** ^0.1.0 (optional)

### Documentation

- Comprehensive README with examples
- TypeScript type definitions
- JSDoc comments on all public APIs
- Example application

### Package

- ES Modules and CommonJS support
- TypeScript declaration files
- Source maps for debugging
- NPM package ready

---

## Release Notes

### What's New in v0.1.0

This is the initial release of @struktos/adapter-nestjs, bringing enterprise-grade context propagation to NestJS applications.

**Key Benefits:**
- 🚀 **NestJS Native** - Follows NestJS conventions and patterns
- 🎯 **Type Safe** - Full TypeScript support with decorators
- ⚡ **Zero Config** - Works out of the box with sensible defaults
- 🔒 **Secure** - Integrated authentication and authorization
- 📦 **Complete** - Ready for production use

**Use Cases:**
- Enterprise NestJS applications
- Microservices with distributed tracing
- Applications requiring fine-grained authorization
- Systems needing request-scoped context

**Framework Integration:**
With @struktos/adapter-nestjs, Struktos.js now supports the three most popular Node.js frameworks (Express, Fastify, NestJS), proving true framework independence of the core.

---

## Links

- [NPM Package](https://www.npmjs.com/package/@struktos/adapter-nestjs)
- [GitHub Repository](https://github.com/struktos/adapter-nestjs)
- [Core Package](https://github.com/struktos/core)
- [Express Adapter](https://github.com/struktos/adapter-express)
- [Fastify Adapter](https://github.com/struktos/adapter-fastify)

---

## License

MIT © Struktos.js Team