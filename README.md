# @struktos/adapter-nestjs

> NestJS adapter for Struktos.js - Enterprise-grade context propagation, authentication, and logging for NestJS applications

[![npm version](https://img.shields.io/npm/v/@struktos/adapter-nestjs.svg)](https://www.npmjs.com/package/@struktos/adapter-nestjs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🎯 What is this?

`@struktos/adapter-nestjs` brings the power of Struktos.js to NestJS applications, providing seamless integration with NestJS's dependency injection, decorators, and module system.

**Key Features:**

- ✅ **Context Propagation** - Automatic context propagation via `StruktosCoreModule`
- ✅ **Custom Decorators** - `@Ctx()`, `@TraceId()`, `@CurrentUser()` for easy context access
- ✅ **Auth Guards** - `StruktosAuthGuard` integrates with `@struktos/auth`
- ✅ **Role-Based Auth** - `@Roles()` decorator for role-based authorization
- ✅ **Claims-Based Auth** - `@RequireClaim()` for fine-grained permissions
- ✅ **Interceptors** - Request logging and response enrichment
- ✅ **Full TypeScript** - Complete type safety with NestJS

## 📦 Installation

```bash
npm install @struktos/adapter-nestjs @struktos/core @nestjs/common @nestjs/core reflect-metadata

# Optional - for authentication
npm install @struktos/auth

# Optional - for structured logging
npm install @struktos/logger
```

## 🚀 Quick Start

### 1. Import Module

```typescript
import { Module } from '@nestjs/common';
import { StruktosCoreModule } from '@struktos/adapter-nestjs';

@Module({
  imports: [
    StruktosCoreModule.forRoot({
      generateTraceId: () => `trace-${Date.now()}`,
      enableCancellation: true,
    }),
  ],
})
export class AppModule {}
```

### 2. Use Context in Controllers

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { 
  Ctx, 
  TraceId, 
  CurrentUser, 
  Roles, 
  StruktosAuthGuard 
} from '@struktos/adapter-nestjs';

@Controller('users')
export class UsersController {
  @Get()
  findAll(@TraceId() traceId: string) {
    console.log(`TraceID: ${traceId}`);
    return this.usersService.findAll();
  }

  @Get('profile')
  @UseGuards(StruktosAuthGuard)
  getProfile(@CurrentUser() user: User) {
    return user;
  }

  @Get('admin')
  @UseGuards(StruktosAuthGuard)
  @Roles('Admin')
  adminOnly() {
    return { message: 'Admin content' };
  }
}
```

## 📖 API Reference

### Modules

#### `StruktosCoreModule`

Main module that provides context propagation and all Struktos features.

```typescript
// Synchronous configuration
StruktosCoreModule.forRoot({
  generateTraceId: () => uuid.v4(),
  enableCancellation: true,
  extractUser: (req) => req.user,
  onContextCreated: (ctx, req) => console.log('Context created'),
  onContextDestroyed: (ctx, req) => console.log('Context destroyed'),
  isGlobal: true, // default
});

// Async configuration
StruktosCoreModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    generateTraceId: () => config.get('TRACE_PREFIX') + uuid.v4(),
  }),
  inject: [ConfigService],
});
```

#### `StruktosAuthModule`

Authentication-only module for when you don't need full context propagation.

```typescript
StruktosAuthModule.forRoot({
  authService: myAuthService,
  useGlobalGuard: true,
});
```

#### `StruktosLoggingModule`

Logging-only module with interceptors.

```typescript
StruktosLoggingModule.forRoot({
  logger: myLogger,
  useGlobalInterceptor: true,
});
```

### Decorators

#### Context Decorators

```typescript
// Get full context
@Get()
handler(@Ctx() ctx: RequestContext<NestJSContextData>) {
  console.log(ctx.get('traceId'));
}

// Get specific context value
@Get()
handler(@Ctx('userId') userId: string) {
  console.log(userId);
}

// Shorthand decorators
@Get()
handler(
  @TraceId() traceId: string,
  @UserId() userId: string,
  @CurrentUser() user: User,
  @CurrentUser('email') email: string,
  @RequestTimestamp() timestamp: number,
  @IsCancelled() isCancelled: () => boolean,
) {}
```

#### Auth Decorators

```typescript
// Role-based authorization
@Roles('Admin')
@Roles('Admin', 'Moderator')  // OR logic

// Claims-based authorization
@RequireClaim('permission', 'write:documents')
@RequireClaim('feature', 'beta-access')

// Multiple claims (AND logic)
@RequireClaims([
  { type: 'permission', value: 'read' },
  { type: 'department', value: 'engineering' }
])

// Mark route as public
@Public()

// Combined decorator
@Auth({
  roles: ['Admin'],
  claim: { type: 'permission', value: 'admin:write' }
})

// Shorthand
@AdminOnly()
@ModeratorOrAdmin()
```

### Guards

```typescript
// Unified auth + authorization guard
@UseGuards(StruktosAuthGuard)
@Roles('Admin')
handler() {}

// Role-only guard (assumes user already authenticated)
@UseGuards(StruktosRolesGuard)
@Roles('Admin')
handler() {}

// Claims-only guard
@UseGuards(StruktosClaimsGuard)
@RequireClaim('permission', 'write')
handler() {}
```

### Interceptors

```typescript
// Add trace ID and timing to responses
@UseInterceptors(StruktosContextInterceptor)

// Request/response logging
@UseInterceptors(StruktosLoggingInterceptor)

// Simple timing header only
@UseInterceptors(StruktosTimingInterceptor)

// Global registration
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: StruktosContextInterceptor,
    },
  ],
})
```

## 🔐 Authentication Integration

### With @struktos/auth

```typescript
import { AuthService, InMemoryAuthStore } from '@struktos/auth';
import { 
  StruktosCoreModule, 
  StruktosAuthModule,
  AUTH_SERVICE 
} from '@struktos/adapter-nestjs';

const authStore = new InMemoryAuthStore();
const authService = new AuthService(authStore, {
  jwtSecret: 'your-secret',
});

@Module({
  imports: [
    StruktosCoreModule.forRoot(),
    StruktosAuthModule.forRoot({
      authService,
      useGlobalGuard: true, // Apply to all routes
    }),
  ],
})
export class AppModule {}
```

### Public Routes with Global Guard

```typescript
@Controller('auth')
export class AuthController {
  @Public()  // Bypasses global auth guard
  @Post('login')
  login() {}

  @Public()
  @Post('register')
  register() {}
}
```

## 📊 Context Access Anywhere

Context is automatically available in services, repositories, and any async operation:

```typescript
import { Injectable } from '@nestjs/common';
import { RequestContext } from '@struktos/core';
import { NestJSContextData } from '@struktos/adapter-nestjs';

@Injectable()
export class UsersService {
  async findAll() {
    const ctx = RequestContext.current<NestJSContextData>();
    const traceId = ctx?.get('traceId');
    const userId = ctx?.get('userId');
    
    console.log(`[${traceId}] User ${userId} fetching all users`);
    
    return this.userRepository.find();
  }
}
```

## 🧪 Testing

```typescript
import { Test } from '@nestjs/testing';
import { StruktosCoreModule, AUTH_SERVICE } from '@struktos/adapter-nestjs';

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [StruktosCoreModule.forRoot()],
      controllers: [UsersController],
      providers: [
        UsersService,
        {
          provide: AUTH_SERVICE,
          useValue: {
            validateToken: jest.fn().mockResolvedValue({
              id: 'test-user',
              username: 'test',
              roles: ['Admin'],
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should return users', async () => {
    const result = await controller.findAll();
    expect(result).toBeDefined();
  });
});
```

## 🏗️ Architecture

```
HTTP Request
    ↓
[StruktosMiddleware] - Initialize RequestContext
    ↓
[StruktosAuthGuard] - Authenticate & Authorize
    ↓
[StruktosContextInterceptor] - Pre-processing
    ↓
[Controller] - @Ctx(), @TraceId(), @CurrentUser()
    ↓
[Service] - RequestContext.current()
    ↓
[Repository] - RequestContext.current()
    ↓
[Response] - X-Trace-Id, X-Response-Time headers
```

## 🤝 Related Packages

- **[@struktos/core](https://www.npmjs.com/package/@struktos/core)** - Core context propagation
- **[@struktos/auth](https://www.npmjs.com/package/@struktos/auth)** - Authentication & authorization
- **[@struktos/logger](https://www.npmjs.com/package/@struktos/logger)** - Structured logging
- **[@struktos/adapter-express](https://www.npmjs.com/package/@struktos/adapter-express)** - Express adapter
- **[@struktos/adapter-fastify](https://www.npmjs.com/package/@struktos/adapter-fastify)** - Fastify adapter

## 📄 License

MIT © Struktos.js Team

## 🔗 Links

- [GitHub Repository](https://github.com/struktosjs/adapter-nestjs)
- [Issue Tracker](https://github.com/struktosjs/adapter-nestjs/issues)
- [NPM Package](https://www.npmjs.com/package/@struktos/adapter-nestjs)

---

**Built with ❤️ for enterprise NestJS development**