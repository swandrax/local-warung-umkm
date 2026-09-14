import { Elysia, t } from 'elysia';
import { db } from '../db';
import { mitraProfiles, auditLogs, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { authPlugin } from '../middleware/auth';

export const mitraRoutes = new Elysia({ prefix: '/mitra' })
  .use(authPlugin)
  .get('/', async () => {
    // Public endpoint to get all active mitras
    const mitras = await db.select().from(mitraProfiles).where(eq(mitraProfiles.status, 'ACTIVE'));
    return { success: true, data: mitras };
  })
  .get('/me', async (ctx: any) => {
    const { user, error } = ctx;
    if (!user) return error(401, { success: false, error: { code: 'UNAUTHORIZED' } });
    const [mitra] = await db.select().from(mitraProfiles).where(eq(mitraProfiles.userId, user.id));
    if (!mitra) return error(404, { success: false, error: { code: 'NOT_FOUND', message: 'Mitra profile not found' } });
    return { success: true, data: mitra };
  })
  .get('/:id', async ({ params: { id }, error }: any) => {
    // Public endpoint to get specific mitra
    const [mitra] = await db.select().from(mitraProfiles).where(eq(mitraProfiles.id, id));
    if (!mitra) return error(404, { success: false, error: { code: 'NOT_FOUND', message: 'Mitra not found' } });
    return { success: true, data: mitra };
  })
  .post('/', async (ctx: any) => {
    const { user, body, set, error } = ctx;
    // Any user can create a mitra profile to become a mitra
    if (!user) return error(401, { success: false, error: { code: 'UNAUTHORIZED' }});
    
    // Check if user already has a mitra profile
    const existing = await db.select().from(mitraProfiles).where(eq(mitraProfiles.userId, user.id));
    if (existing.length > 0) {
      return error(409, { success: false, error: { code: 'CONFLICT', message: 'You already have a Mitra profile' } });
    }

    if (body.contactUrl && !body.contactUrl.match(/^(https?|tel|mailto):/)) {
      return error(400, { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid contact URL scheme' } });
    }

    const mitraId = crypto.randomUUID();
    const newMitra = await db.insert(mitraProfiles).values({
      id: mitraId,
      userId: user.id,
      ...body,
      status: 'PENDING'
    }).returning();

    // Auto-update user role to MITRA if they were just a USER
    if (user.role === 'USER') {
      await db.update(users).set({ role: 'MITRA' }).where(eq(users.id, user.id));
    }

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.id,
      action: 'MITRA_CREATE',
      resource: 'mitra_profiles',
      resourceId: mitraId,
      timestamp: new Date(),
    });

    return { success: true, data: newMitra[0] };
  }, {
    isSignIn: true,
    async beforeHandle({ user, error }: any) {
      if (!user) return error(401, { success: false, error: { code: 'UNAUTHORIZED' }});
    },
    body: t.Object({
      businessName: t.String({ minLength: 2 }),
      description: t.Optional(t.String()),
      shortDescription: t.Optional(t.String()),
      logo: t.Optional(t.String()),
      coverImage: t.Optional(t.String()),
      phone: t.Optional(t.String()),
      email: t.Optional(t.String()),
      address: t.Optional(t.String()),
      city: t.Optional(t.String()),
      website: t.Optional(t.String()),
      category: t.Optional(t.String()),
      contactLabel: t.Optional(t.String()),
      contactUrl: t.Optional(t.String()),
      operatingHours: t.Optional(t.String()),
      timezone: t.Optional(t.String()),
      isPublic: t.Optional(t.Boolean()),
    })
  })
  .put('/:id', async (ctx: any) => {
    const { user, params: { id }, body, set, error } = ctx;
    if (!user) return error(401, { success: false, error: { code: 'UNAUTHORIZED' }});

    if (body.contactUrl && !body.contactUrl.match(/^(https?|tel|mailto):/)) {
      return error(400, { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid contact URL scheme' } });
    }
    
    const [mitra] = await db.select().from(mitraProfiles).where(eq(mitraProfiles.id, id));
    if (!mitra) return error(404, { success: false, error: { code: 'NOT_FOUND', message: 'Mitra not found' } });

    // Ownership check: Only owner or admin can update
    if (mitra.userId !== user.id && user.role !== 'ADMIN') {
      return error(403, { success: false, error: { code: 'FORBIDDEN', message: 'You do not own this profile' } });
    }

    const updateData: any = { ...body, updatedAt: new Date() };
    if (user.role !== 'ADMIN') {
      delete updateData.status;
      delete updateData.moderationReason;
      delete updateData.moderatedBy;
      delete updateData.moderatedAt;
    }

    const [updated] = await db.update(mitraProfiles)
      .set(updateData)
      .where(eq(mitraProfiles.id, id))
      .returning();

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.id,
      action: 'MITRA_UPDATE',
      resource: 'mitra_profiles',
      resourceId: id,
      timestamp: new Date(),
    });

    return { success: true, data: updated };
  }, {
    body: t.Object({
      businessName: t.Optional(t.String()),
      description: t.Optional(t.String()),
      shortDescription: t.Optional(t.String()),
      logo: t.Optional(t.String()),
      coverImage: t.Optional(t.String()),
      phone: t.Optional(t.String()),
      email: t.Optional(t.String()),
      address: t.Optional(t.String()),
      city: t.Optional(t.String()),
      website: t.Optional(t.String()),
      category: t.Optional(t.String()),
      contactLabel: t.Optional(t.String()),
      contactUrl: t.Optional(t.String()),
      operatingHours: t.Optional(t.String()),
      timezone: t.Optional(t.String()),
      isPublic: t.Optional(t.Boolean()),
      status: t.Optional(t.String()) // Note: only ADMIN can actually persist this
    })
  })
  .delete('/:id', async (ctx: any) => {
    const { user, params: { id }, error } = ctx;
    if (!user) return error(401, { success: false, error: { code: 'UNAUTHORIZED' }});
    
    const [mitra] = await db.select().from(mitraProfiles).where(eq(mitraProfiles.id, id));
    if (!mitra) return error(404, { success: false, error: { code: 'NOT_FOUND', message: 'Mitra not found' } });

    if (mitra.userId !== user.id && user.role !== 'ADMIN') {
      return error(403, { success: false, error: { code: 'FORBIDDEN', message: 'You do not own this profile' } });
    }

    await db.delete(mitraProfiles).where(eq(mitraProfiles.id, id));

    return { success: true, data: null };
  });
