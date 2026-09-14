import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export const authPlugin = new Elysia({ name: 'authPlugin' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'local-warung-super-secret-key-1234',
    })
  )
  .derive({ as: 'global' }, async ({ jwt, cookie: { auth }, headers, set }) => {
    const errorHelper = (statusCode: number, data: any) => {
      set.status = statusCode;
      return data;
    };

    // Determine token from cookie or Authorization header
    let token = auth?.value;
    if (!token) {
      const authHeader = typeof (headers as any)?.get === 'function' 
        ? (headers as any).get('authorization') 
        : (headers as any)?.authorization || (headers as any)?.Authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return { user: null, error: errorHelper };
    }

    const payload = await jwt.verify(token as string);
    if (!payload || !payload.id) {
      return { user: null, error: errorHelper };
    }

    const [user] = await db.select().from(users).where(eq(users.id, payload.id as string));
    if (!user) {
      return { user: null, error: errorHelper };
    }

    return {
      error: errorHelper,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  })
  .macro(({ onBeforeHandle }) => ({
    isAuthenticated(value: boolean) {
      if (!value) return;
      onBeforeHandle(({ user, set }: any) => {
        if (!user) {
          set.status = 401;
          return { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized access' } };
        }
      });
    },
    requireRole(roles: string[]) {
      onBeforeHandle(({ user, set }: any) => {
        if (!user) {
          set.status = 401;
          return { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized access' } };
        }
        if (!roles.includes(user.role)) {
          set.status = 403;
          return { success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to perform this action' } };
        }
      });
    },
  }));
