import { Elysia, t } from 'elysia';
import { db } from '../db';
import { users, auditLogs } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authPlugin } from '../middleware/auth';

export const userRoutes = new Elysia({ prefix: '/users' })
  .use(authPlugin)
  .onBeforeHandle(({ user, set }: any) => {
    if (!user) {
      set.status = 401;
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } };
    }
    if (user.role !== 'ADMIN') {
      set.status = 403;
      return { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } };
    }
  })
  .get('/', async () => {
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    }).from(users);
    return { success: true, data: allUsers };
  })
  .get('/:id', async ({ params: { id }, error }: any) => {
    const [user] = await db.select({
      id: users.id,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    }).from(users).where(eq(users.id, id));
    
    if (!user) return error(404, { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    return { success: true, data: user };
  })
  .put('/:id/role', async ({ params: { id }, body: { role }, user, error }: any) => {
    if (!user) return error(401, { success: false, error: { code: 'UNAUTHORIZED' }});
    const [updated] = await db.update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        role: users.role,
      });

    if (!updated) return error(404, { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.id,
      action: 'ROLE_CHANGE',
      resource: 'users',
      resourceId: updated.id,
      timestamp: new Date(),
      metadata: JSON.stringify({ newRole: role })
    });

    return { success: true, data: updated };
  }, {
    body: t.Object({
      role: t.Union([t.Literal('ADMIN'), t.Literal('USER'), t.Literal('MITRA')])
    })
  });
