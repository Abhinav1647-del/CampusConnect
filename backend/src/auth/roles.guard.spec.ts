import { describe, it, expect, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './guards/roles.guard.js';

function createMockContext(userRole: string | null, handlerRoles: string[]) {
  const reflector = {
    getAllAndOverride: vi.fn().mockReturnValue(handlerRoles),
  };
  const context = {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user: userRole ? { role: userRole } : null }),
    }),
  } as unknown as ExecutionContext;
  return { reflector, context };
}

describe('RolesGuard', () => {
  it('should allow access when no roles are required', () => {
    const { reflector, context } = createMockContext('STUDENT', []);
    const guard = new RolesGuard(reflector as unknown as Reflector);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user has the required role', () => {
    const { reflector, context } = createMockContext('APP_ADMIN', ['APP_ADMIN']);
    const guard = new RolesGuard(reflector as unknown as Reflector);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException when user lacks required role', () => {
    const { reflector, context } = createMockContext('STUDENT', ['APP_ADMIN']);
    const guard = new RolesGuard(reflector as unknown as Reflector);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when no user is present', () => {
    const { reflector, context } = createMockContext(null, ['APP_ADMIN']);
    const guard = new RolesGuard(reflector as unknown as Reflector);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
