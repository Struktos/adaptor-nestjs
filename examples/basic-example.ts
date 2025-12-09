/**
 * Basic Example - NestJS with Struktos
 * 
 * Demonstrates basic integration of Struktos with NestJS,
 * including context propagation, authentication, and logging.
 * 
 * Run: npx ts-node -P examples/tsconfig.json examples/basic-example.ts
 */

import 'reflect-metadata';
import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Module, 
  Injectable,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { RequestContext } from '@struktos/core';

// Import from our adapter (use '../dist' for local development, '@struktos/adapter-nestjs' after npm install)
import {
  StruktosCoreModule,
  Ctx,
  TraceId,
  CurrentUser,
  UserId,
  Roles,
  RequireClaim,
  Public,
  StruktosAuthGuard,
  StruktosRolesGuard,
  StruktosContextInterceptor,
  NestJSContextData,
  AUTH_SERVICE,
} from "../src/index";

// ==================== Types ====================

interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  claims: Array<{ type: string; value: string }>;
}

interface CreateUserDto {
  name: string;
  email: string;
}

interface UserEntity {
  id: string;
  name: string;
  email: string;
}

// ==================== Mock Auth Service ====================

/**
 * Mock AuthService for demonstration
 * In production, use @struktos/auth
 */
@Injectable()
class MockAuthService {
  private users = new Map<string, User>([
    ['admin-token', {
      id: 'user-1',
      username: 'admin',
      email: 'admin@example.com',
      roles: ['Admin', 'User'],
      claims: [
        { type: 'permission', value: 'write:documents' },
        { type: 'department', value: 'engineering' },
      ],
    }],
    ['user-token', {
      id: 'user-2',
      username: 'johndoe',
      email: 'john@example.com',
      roles: ['User'],
      claims: [
        { type: 'permission', value: 'read:documents' },
      ],
    }],
  ]);

  async validateToken(token: string): Promise<User | null> {
    return this.users.get(token) || null;
  }
}

// ==================== Service Layer ====================

@Injectable()
class UsersService {
  private users: UserEntity[] = [
    { id: '1', name: 'Alice', email: 'alice@example.com' },
    { id: '2', name: 'Bob', email: 'bob@example.com' },
    { id: '3', name: 'Charlie', email: 'charlie@example.com' },
  ];

  async findAll(): Promise<UserEntity[]> {
    // Context is automatically available anywhere
    const ctx = RequestContext.current<NestJSContextData>();
    console.log(`[UsersService] TraceID: ${ctx?.get('traceId')}`);
    console.log(`[UsersService] UserID: ${ctx?.get('userId')}`);
    
    return this.users;
  }

  async findById(id: string): Promise<UserEntity | undefined> {
    const ctx = RequestContext.current<NestJSContextData>();
    console.log(`[UsersService] Finding user ${id}, TraceID: ${ctx?.get('traceId')}`);
    
    return this.users.find(u => u.id === id);
  }

  async create(data: CreateUserDto): Promise<UserEntity> {
    const ctx = RequestContext.current<NestJSContextData>();
    console.log(`[UsersService] Creating user, TraceID: ${ctx?.get('traceId')}`);
    
    const newUser: UserEntity = {
      id: String(this.users.length + 1),
      ...data,
    };
    this.users.push(newUser);
    return newUser;
  }
}

// ==================== Controllers ====================

/**
 * Public Controller - No authentication required
 */
@Controller()
class AppController {
  @Public()
  @Get()
  getHello(): { message: string; timestamp: Date } {
    return { message: 'Hello from Struktos + NestJS!', timestamp: new Date() };
  }

  @Public()
  @Get('health')
  healthCheck(@TraceId() traceId: string): { status: string; traceId: string; timestamp: Date } {
    return { 
      status: 'ok', 
      traceId,
      timestamp: new Date(),
    };
  }
}

/**
 * Users Controller - Mixed authentication
 */
@Controller('users')
@UseInterceptors(StruktosContextInterceptor)
class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Public endpoint - anyone can list users
   */
  @Public()
  @Get()
  async findAll(
    @Ctx() ctx: RequestContext<NestJSContextData> | undefined
  ): Promise<UserEntity[]> {
    console.log(`[Controller] Full context:`, ctx?.getAll());
    return this.usersService.findAll();
  }

  /**
   * Protected endpoint - requires authentication
   */
  @UseGuards(StruktosAuthGuard)
  @Get('profile')
  getProfile(
    @CurrentUser() user: User,
    @TraceId() traceId: string
  ): { user: User; traceId: string; message: string } {
    return {
      user,
      traceId,
      message: 'This is your profile',
    };
  }

  /**
   * Admin only endpoint
   */
  @Roles('Admin')
  @UseGuards(StruktosAuthGuard)
  @Get('admin')
  adminOnly(
    @UserId() userId: string
  ): { message: string; userId: string } {
    return {
      message: 'Welcome, Admin!',
      userId,
    };
  }

  /**
   * Claims-based authorization
   */
  @RequireClaim('permission', 'write:documents')
  @UseGuards(StruktosAuthGuard)
  @Post()
  async create(
    @Body() body: CreateUserDto,
    @CurrentUser('username') username: string,
    @TraceId() traceId: string
  ): Promise<{ message: string; user: UserEntity; traceId: string }> {
    const user = await this.usersService.create(body);
    return {
      message: `User created by ${username}`,
      user,
      traceId,
    };
  }
}

/**
 * Admin Controller - All routes require Admin role
 */
@Roles('Admin')
@UseGuards(StruktosAuthGuard, StruktosRolesGuard)
@Controller('admin')
class AdminController {
  @Get('dashboard')
  getDashboard(
    @CurrentUser() user: User
  ): { message: string; adminUser: string; stats: object } {
    return {
      message: 'Admin Dashboard',
      adminUser: user.username,
      stats: {
        totalUsers: 100,
        activeUsers: 45,
        newSignups: 12,
      },
    };
  }

  @RequireClaim('department', 'engineering')
  @Get('settings')
  getSettings(
    @TraceId() traceId: string
  ): { message: string; traceId: string; settings: object } {
    return {
      message: 'Admin Settings',
      traceId,
      settings: {
        maintenanceMode: false,
        debugEnabled: true,
      },
    };
  }
}

// ==================== App Module ====================

@Module({
  imports: [
    StruktosCoreModule.forRoot({
      generateTraceId: () => `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      enableCancellation: true,
      onContextCreated: (ctx, req) => {
        console.log(`\n[Context] Created - TraceID: ${ctx.traceId}, URL: ${req.url}`);
      },
      onContextDestroyed: (ctx, req) => {
        console.log(`[Context] Destroyed - TraceID: ${ctx.traceId}`);
      },
    }),
  ],
  controllers: [AppController, UsersController, AdminController],
  providers: [
    UsersService,
    MockAuthService,
    {
      provide: AUTH_SERVICE,
      useClass: MockAuthService,
    },
  ],
})
class AppModule {}

// ==================== Bootstrap ====================

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  
  const port = 3000;
  await app.listen(port);
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  @struktos/adapter-nestjs - Basic Example');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Server running at http://localhost:${port}`);
  console.log('');
  console.log('  Available endpoints:');
  console.log('');
  console.log('  Public:');
  console.log('    GET  /              - Hello endpoint');
  console.log('    GET  /health        - Health check with traceId');
  console.log('    GET  /users         - List all users');
  console.log('');
  console.log('  Protected (use Bearer token):');
  console.log('    GET  /users/profile - Get current user profile');
  console.log('    POST /users         - Create user (requires write:documents claim)');
  console.log('');
  console.log('  Admin only:');
  console.log('    GET  /users/admin     - Admin endpoint');
  console.log('    GET  /admin/dashboard - Admin dashboard');
  console.log('    GET  /admin/settings  - Admin settings (requires engineering dept)');
  console.log('');
  console.log('  Test tokens:');
  console.log('    admin-token - Full admin access');
  console.log('    user-token  - Regular user access');
  console.log('');
  console.log('  Example requests:');
  console.log('    curl http://localhost:3000/health');
  console.log('    curl -H "Authorization: Bearer admin-token" http://localhost:3000/users/profile');
  console.log('    curl -H "Authorization: Bearer admin-token" http://localhost:3000/admin/dashboard');
  console.log('═══════════════════════════════════════════════════════════\n');
}

bootstrap().catch(console.error);