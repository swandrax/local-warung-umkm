import { Elysia, t } from 'elysia';
import { db } from '../db';
import { partnerships, auditLogs, mitraProfiles } from '../db/schema';
import { eq, or } from 'drizzle-orm';
import { authPlugin } from '../middleware/auth';

export const partnershipRoutes = new Elysia({ prefix: '/partnerships' })
  .use(authPlugin)
  .onBeforeHandle(({ user, set }: any) => {
    if (!user) {
      set.status = 401;
      return { success: false, error: { code: 'UNAUTHORIZED' } };
    }
  })
  .get('/', async ({ user, error }: any) => {
    if (!user) return error(401, { success: false, error: { code: 'UNAUTHORIZED' }});
    
    // Users see partnerships they requested.
    // Mitras see partnerships they requested + partnerships requested to them.
    // Admins see all.
    let userPartnerships;
    
    if (user.role === 'ADMIN') {
      userPartnerships = await db.select().from(partnerships);
    } else {
      // Find mitra profiles owned by the user
      const userMitras = await db.select().from(mitraProfiles).where(eq(mitraProfiles.userId, user.id));
      const mitraIds = userMitras.map(m => m.id);

      if (mitraIds.length > 0) {
        // User is a mitra, they can see requests they made or requests to their mitras
        userPartnerships = await db.select().from(partnerships).where(
          or(
            eq(partnerships.requesterId, user.id),
            // this is a bit simplified, ideally we'd use inArray but for sqlite and a single mitra per user it's fine
            eq(partnerships.partnerId, mitraIds[0]) 
          )
        );
      } else {
        // Regular user
        userPartnerships = await db.select().from(partnerships).where(eq(partnerships.requesterId, user.id));
      }
    }

    return { success: true, data: userPartnerships };
  })
  .post('/', async (ctx: any) => {
    const { user, body, error } = ctx;
    if (!user) return error(401, { success: false, error: { code: 'UNAUTHORIZED' }});
    
    // Check if target partnerId exists
    const [partner] = await db.select().from(mitraProfiles).where(eq(mitraProfiles.id, body.partnerId));
    if (!partner) return error(404, { success: false, error: { code: 'NOT_FOUND', message: 'Partner Mitra not found' } });

    const pId = crypto.randomUUID();
    const [newPartnership] = await db.insert(partnerships).values({
      id: pId,
      requesterId: user.id,
      partnerId: body.partnerId,
      title: body.title,
      description: body.description,
      status: 'PENDING'
    }).returning();

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.id,
      action: 'PARTNERSHIP_CREATE',
      resource: 'partnerships',
      resourceId: pId,
      timestamp: new Date(),
    });

    return { success: true, data: newPartnership };
  }, {
    body: t.Object({
      partnerId: t.String(),
      title: t.String(),
      description: t.Optional(t.String()),
    })
  })
  .post('/:id/accept', async (ctx: any) => {
    const { user, params: { id }, error } = ctx;
    if (!user) return error(401, { success: false, error: { code: 'UNAUTHORIZED' }});
    
    const [partnership] = await db.select().from(partnerships).where(eq(partnerships.id, id));
    if (!partnership) return error(404, { success: false, error: { code: 'NOT_FOUND', message: 'Partnership not found' } });

    const [mitra] = await db.select().from(mitraProfiles).where(eq(mitraProfiles.id, partnership.partnerId));
    
    // Only the target Mitra can accept
    if (mitra?.userId !== user.id && user.role !== 'ADMIN') {
      return error(403, { success: false, error: { code: 'FORBIDDEN', message: 'You are not authorized to accept this partnership' } });
    }

    if (partnership.status !== 'PENDING') {
      return error(422, { success: false, error: { code: 'UNPROCESSABLE_ENTITY', message: 'Partnership is not pending' } });
    }

    const [updated] = await db.update(partnerships).set({ status: 'ACCEPTED', updatedAt: new Date() }).where(eq(partnerships.id, id)).returning();

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.id,
      action: 'PARTNERSHIP_ACCEPT',
      resource: 'partnerships',
      resourceId: id,
      timestamp: new Date(),
    });

    return { success: true, data: updated };
  })
  .post('/:id/reject', async (ctx: any) => {
    const { user, params: { id }, error } = ctx;
    if (!user) return error(401, { success: false, error: { code: 'UNAUTHORIZED' }});
    
    const [partnership] = await db.select().from(partnerships).where(eq(partnerships.id, id));
    if (!partnership) return error(404, { success: false, error: { code: 'NOT_FOUND', message: 'Partnership not found' } });

    const [mitra] = await db.select().from(mitraProfiles).where(eq(mitraProfiles.id, partnership.partnerId));
    
    if (mitra?.userId !== user.id && user.role !== 'ADMIN') {
      return error(403, { success: false, error: { code: 'FORBIDDEN', message: 'You are not authorized to reject this partnership' } });
    }

    if (partnership.status !== 'PENDING') {
      return error(422, { success: false, error: { code: 'UNPROCESSABLE_ENTITY', message: 'Partnership is not pending' } });
    }

    const [updated] = await db.update(partnerships).set({ status: 'REJECTED', updatedAt: new Date() }).where(eq(partnerships.id, id)).returning();

    return { success: true, data: updated };
  })
  .post('/:id/cancel', async (ctx: any) => {
    const { user, params: { id }, error } = ctx;
    if (!user) return error(401, { success: false, error: { code: 'UNAUTHORIZED' }});
    
    const [partnership] = await db.select().from(partnerships).where(eq(partnerships.id, id));
    if (!partnership) return error(404, { success: false, error: { code: 'NOT_FOUND', message: 'Partnership not found' } });

    // Only requester can cancel
    if (partnership.requesterId !== user.id && user.role !== 'ADMIN') {
      return error(403, { success: false, error: { code: 'FORBIDDEN', message: 'You are not authorized to cancel this partnership' } });
    }

    if (partnership.status !== 'PENDING') {
      return error(422, { success: false, error: { code: 'UNPROCESSABLE_ENTITY', message: 'Only pending partnerships can be cancelled' } });
    }

    const [updated] = await db.update(partnerships).set({ status: 'CANCELLED', updatedAt: new Date() }).where(eq(partnerships.id, id)).returning();

    return { success: true, data: updated };
  })
  .put('/:id', async (ctx: any) => {
    const { user, params: { id }, body, set } = ctx;
    try {
      if (body.contactUrl && !body.contactUrl.match(/^(https?|tel|mailto):/)) {
        set.status = 400;
        return { success: false, error: { message: 'Invalid contact URL scheme' } };
      }

      const [existing] = await db.select().from(partnerships).where(eq(partnerships.id, id));
      if (!existing) {
        set.status = 404;
        return { success: false, error: { message: 'Partnership not found' } };
      }

      const userMitras = await db.select().from(mitraProfiles).where(eq(mitraProfiles.userId, user.id));
      const userMitraIds = new Set(userMitras.map(m => m.id));
      const isOwner = existing.requesterId === user.id || userMitraIds.has(existing.partnerId) || user.role === 'ADMIN';
      if (!isOwner) {
        set.status = 403;
        return { success: false, error: { code: 'FORBIDDEN', message: 'You do not have permission to update this partnership' } };
      }
      
      const [updated] = await db.update(partnerships).set({
        title: body.title !== undefined ? body.title : existing.title,
        description: body.description !== undefined ? body.description : existing.description,
        shortDescription: body.shortDescription !== undefined ? body.shortDescription : existing.shortDescription,
        contactLabel: body.contactLabel !== undefined ? body.contactLabel : existing.contactLabel,
        contactUrl: body.contactUrl !== undefined ? body.contactUrl : existing.contactUrl,
        image: body.image !== undefined ? body.image : existing.image,
        isPublic: body.isPublic !== undefined ? body.isPublic : existing.isPublic,
        status: user.role === 'ADMIN' && body.status !== undefined ? body.status : existing.status,
        updatedAt: new Date(),
      }).where(eq(partnerships.id, id)).returning();

      return { success: true, data: updated };
    } catch (e: any) {
      set.status = 400;
      return { success: false, error: { message: e.message } };
    }
  });
