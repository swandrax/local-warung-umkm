import { Elysia, t } from 'elysia';
import { db } from '../db';
import { products, mitraProfiles, partnerships, auditLogs, analyticsEvents } from '../db/schema';
import { eq, or, desc, sql } from 'drizzle-orm';
import { authPlugin } from '../middleware/auth';

export const adminRoutes = new Elysia({ prefix: '/admin' })
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

  // S2B.20: List all pending items awaiting moderation
  .get('/pending', async () => {
    const pendingProducts = await db.select({
      id: products.id,
      name: products.name,
      price: products.price,
      category: products.category,
      status: products.status,
      isPublic: products.isPublic,
      image: products.image,
      mitraId: products.mitraId,
      description: products.description,
      createdAt: products.createdAt,
    })
      .from(products)
      .where(or(eq(products.status, 'PENDING'), eq(products.status, 'DRAFT')))
      .limit(50);

    const pendingMitras = await db.select({
      id: mitraProfiles.id,
      businessName: mitraProfiles.businessName,
      category: mitraProfiles.category,
      city: mitraProfiles.city,
      logo: mitraProfiles.logo,
      phone: mitraProfiles.phone,
      shortDescription: mitraProfiles.shortDescription,
      status: mitraProfiles.status,
      isPublic: mitraProfiles.isPublic,
      createdAt: mitraProfiles.createdAt,
    })
      .from(mitraProfiles)
      .where(or(eq(mitraProfiles.status, 'PENDING'), eq(mitraProfiles.status, 'DRAFT')))
      .limit(50);

    const pendingPartnerships = await db.select({
      id: partnerships.id,
      title: partnerships.title,
      partnerId: partnerships.partnerId,
      shortDescription: partnerships.shortDescription,
      status: partnerships.status,
      isPublic: partnerships.isPublic,
      createdAt: partnerships.createdAt,
    })
      .from(partnerships)
      .where(or(eq(partnerships.status, 'PENDING'), eq(partnerships.status, 'DRAFT')))
      .limit(50);

    return {
      success: true,
      data: {
        products: pendingProducts,
        mitras: pendingMitras,
        partnerships: pendingPartnerships
      }
    };
  })

  // S2B.14: Admin Analytics Summary & CTR calculation
  .get('/analytics/summary', async () => {
    const eventCounts = await db.select({
      event: analyticsEvents.event,
      count: sql<number>`count(*)`
    })
      .from(analyticsEvents)
      .groupBy(analyticsEvents.event);

    const countsMap: Record<string, number> = {
      product_view: 0,
      mitra_view: 0,
      partnership_view: 0,
      search: 0,
      contact_click: 0,
      cta_click: 0,
    };

    for (const item of eventCounts) {
      if (countsMap[item.event] !== undefined) {
        countsMap[item.event] = Number(item.count);
      }
    }

    const relevantViews = countsMap.product_view + countsMap.mitra_view;
    const totalViews = relevantViews + countsMap.partnership_view;
    const ctrContact = relevantViews > 0 ? ((countsMap.contact_click / relevantViews) * 100).toFixed(2) : '0.00';
    const ctrCta = totalViews > 0 ? ((countsMap.cta_click / totalViews) * 100).toFixed(2) : '0.00';

    const recentEvents = await db.select().from(analyticsEvents).limit(20).orderBy(desc(analyticsEvents.timestamp));

    return {
      success: true,
      data: {
        events: {
          productViews: countsMap.product_view,
          mitraViews: countsMap.mitra_view,
          partnershipViews: countsMap.partnership_view,
          searches: countsMap.search,
          contactClicks: countsMap.contact_click,
          ctaClicks: countsMap.cta_click,
        },
        rates: {
          ctrContact: `${ctrContact}%`,
          ctrCta: `${ctrCta}%`,
          relevantViews,
          totalViews,
        },
        metrics: {
          productViews: countsMap.product_view,
          mitraViews: countsMap.mitra_view,
          partnershipViews: countsMap.partnership_view,
          searches: countsMap.search,
          contactClicks: countsMap.contact_click,
          ctaClicks: countsMap.cta_click,
          totalViews,
          contactCTR: `${ctrContact}%`,
          ctaCTR: `${ctrCta}%`,
        },
        recentEvents
      }
    };
  })

  // S2B.21: Audit logs view
  .get('/audit-logs', async () => {
    const logs = await db.select().from(auditLogs).limit(50).orderBy(desc(auditLogs.timestamp));
    return { success: true, data: logs };
  })

  // S2B.20: Perform Moderation Action
  .post('/moderate/:entityType/:id', async ({ user, params: { entityType, id }, body, error }: any) => {
    const { action, reason } = body;

    if (action === 'REJECT' && !reason) {
      return error(400, { success: false, error: { code: 'BAD_REQUEST', message: 'Reason is required when rejecting content' } });
    }

    let newStatus: string;
    let newIsPublic: boolean | undefined;

    switch (action) {
      case 'APPROVE':
      case 'PUBLISH':
        newStatus = 'PUBLISHED';
        newIsPublic = true;
        break;
      case 'REJECT':
        newStatus = 'REJECTED';
        newIsPublic = false;
        break;
      case 'UNPUBLISH':
        newStatus = 'UNPUBLISHED';
        newIsPublic = false;
        break;
      case 'ARCHIVE':
        newStatus = 'ARCHIVED';
        newIsPublic = false;
        break;
      default:
        return error(400, { success: false, error: { code: 'INVALID_ACTION', message: 'Invalid moderation action' } });
    }

    const updateFields = {
      status: newStatus,
      ...(newIsPublic !== undefined ? { isPublic: newIsPublic } : {}),
      moderationReason: reason || null,
      moderatedBy: user.id,
      moderatedAt: new Date(),
      updatedAt: new Date(),
    };

    let updatedResult: any = null;
    const type = entityType.toLowerCase();

    if (type === 'product' || type === 'products') {
      const [res] = await db.update(products).set(updateFields).where(eq(products.id, id)).returning();
      updatedResult = res;
    } else if (type === 'mitra' || type === 'mitras') {
      // Mitra can also be ACTIVE if approved
      const mitraStatus = (action === 'APPROVE' || action === 'PUBLISH') ? 'ACTIVE' : newStatus;
      const [res] = await db.update(mitraProfiles).set({ ...updateFields, status: mitraStatus }).where(eq(mitraProfiles.id, id)).returning();
      updatedResult = res;
    } else if (type === 'partnership' || type === 'partnerships') {
      const [res] = await db.update(partnerships).set(updateFields).where(eq(partnerships.id, id)).returning();
      updatedResult = res;
    } else {
      return error(400, { success: false, error: { code: 'INVALID_ENTITY', message: 'Unknown entity type' } });
    }

    if (!updatedResult) {
      return error(404, { success: false, error: { code: 'NOT_FOUND', message: `${entityType} item not found` } });
    }

    // Write to audit log
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.id,
      action: `MODERATE_${action}`,
      resource: entityType,
      resourceId: id,
      timestamp: new Date(),
      metadata: JSON.stringify({ action, reason, newStatus })
    });

    return { success: true, data: updatedResult, message: `Konten berhasil di-${action.toLowerCase()}` };
  }, {
    body: t.Object({
      action: t.Union([
        t.Literal('APPROVE'),
        t.Literal('REJECT'),
        t.Literal('PUBLISH'),
        t.Literal('UNPUBLISH'),
        t.Literal('ARCHIVE'),
      ]),
      reason: t.Optional(t.String()),
    })
  });
