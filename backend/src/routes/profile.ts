import { Elysia, t } from 'elysia';
import { db } from '../db';
import { profiles, auditLogs } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authPlugin } from '../middleware/auth';

export const profileRoutes = new Elysia({ prefix: '/profile' })
  .use(authPlugin)
  .onBeforeHandle(({ user, set }: any) => {
    if (!user) {
      set.status = 401;
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } };
    }
  })
  .get('/', async ({ user, error }: any) => {
    if (!user) return error(401, { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
    if (!profile) return error(404, { success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } });
    return { success: true, data: profile };
  })
  .put('/', async ({ user, body, error }: any) => {
    if (!user) return error(401, { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
    const { name, phone, avatar, bio, address, city } = body;
    
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
    if (!profile) {
      return error(404, { success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } });
    }

    const [updated] = await db.update(profiles)
      .set({
        name: name ?? profile.name,
        phone: phone ?? profile.phone,
        avatar: avatar ?? profile.avatar,
        bio: bio ?? profile.bio,
        address: address ?? profile.address,
        city: city ?? profile.city,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, profile.id))
      .returning();

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.id,
      action: 'PROFILE_UPDATE',
      resource: 'profiles',
      resourceId: profile.id,
      timestamp: new Date(),
    });

    return { success: true, data: updated };
  }, {
    body: t.Object({
      name: t.Optional(t.String({ minLength: 2 })),
      phone: t.Optional(t.String()),
      avatar: t.Optional(t.String()),
      bio: t.Optional(t.String()),
      address: t.Optional(t.String()),
      city: t.Optional(t.String()),
    })
  });
