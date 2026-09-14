import { Elysia, t } from 'elysia';
import { db } from '../db';
import { users, profiles, auditLogs } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authPlugin } from '../middleware/auth';

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(authPlugin)
  .post('/register', async ({ body, error }: any) => {
    const { email, password, name } = body;
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) {
      return error(409, { success: false, error: { code: 'CONFLICT', message: 'Email already exists' } });
    }

    const passwordHash = await Bun.password.hash(password);
    const userId = crypto.randomUUID();

    await db.insert(users).values({
      id: userId,
      email,
      passwordHash,
      role: 'USER',
    });

    await db.insert(profiles).values({
      id: crypto.randomUUID(),
      userId,
      name,
    });

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId,
      action: 'REGISTER',
      resource: 'users',
      resourceId: userId,
      timestamp: new Date(),
    });

    return { success: true, data: { id: userId, email } };
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 6 }),
      name: t.String({ minLength: 2 })
    })
  })
  .post('/login', async ({ body, jwt, cookie: { auth }, error }: any) => {
    const { email, password } = body;
    const [user] = await db.select().from(users).where(eq(users.email, email));
    
    if (!user) {
      return error(401, { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
    }

    const isValid = await Bun.password.verify(password, user.passwordHash);
    if (!isValid) {
      return error(401, { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
    }

    const token = await jwt.sign({ id: user.id });
    auth.set({
      value: token,
      httpOnly: true,
      maxAge: 7 * 86400,
      path: '/',
    });

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.id,
      action: 'LOGIN',
      resource: 'users',
      resourceId: user.id,
      timestamp: new Date(),
    });

    return { success: true, data: { token, user: { id: user.id, email: user.email, role: user.role } } };
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String()
    })
  })
  .post('/logout', async ({ cookie: { auth } }) => {
    auth.remove();
    return { success: true, data: { message: 'Logged out' } };
  })
  .get('/me', async ({ user, error }: any) => {
    if (!user) return error(401, { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
    return { success: true, data: { user, profile } };
  }, {
    isSignIn: true,
    async beforeHandle({ user, error }: any) {
      if (!user) return error(401, { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized access' } });
    }
  });
