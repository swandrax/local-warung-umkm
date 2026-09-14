import { Elysia, t } from 'elysia';
import { db } from '../db';
import { analyticsEvents } from '../db/schema';
import { eq, sql, desc, gte } from 'drizzle-orm';
import { authPlugin } from '../middleware/auth';

const ALLOWED_EVENTS = new Set([
  'product_view',
  'mitra_view',
  'partnership_view',
  'search',
  'contact_click',
  'cta_click'
]);

export const analyticsRoutes = new Elysia({ prefix: '/analytics' })
  .use(authPlugin)
  
  // Public event logging (lightweight, non-blocking)
  .post('/event', async ({ body, set }: any) => {
    const { event, resourceType, resourceId, sessionId, metadata } = body;

    if (!ALLOWED_EVENTS.has(event)) {
      set.status = 400;
      return { success: false, error: { code: 'INVALID_EVENT', message: 'Unknown analytics event' } };
    }

    const eventId = crypto.randomUUID();
    await db.insert(analyticsEvents).values({
      id: eventId,
      event,
      resourceType: resourceType || null,
      resourceId: resourceId || null,
      sessionId: sessionId || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      timestamp: new Date(),
    });

    return { success: true, data: { logged: true } };
  }, {
    body: t.Object({
      event: t.String(),
      resourceType: t.Optional(t.String()),
      resourceId: t.Optional(t.String()),
      sessionId: t.Optional(t.String()),
      metadata: t.Optional(t.Any()),
    })
  })

  // Admin analytics summary & conversion metrics
  .get('/summary', async ({ user, error }: any) => {
    if (!user) {
      return error(401, { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
    }
    if (user.role !== 'ADMIN') {
      return error(403, { success: false, error: { code: 'FORBIDDEN', message: 'Admin role required' } });
    }

    // Counts per event
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

    const totalViews = countsMap.product_view + countsMap.mitra_view + countsMap.partnership_view;
    const contactCTR = totalViews > 0 ? ((countsMap.contact_click / totalViews) * 100).toFixed(2) : '0.00';
    const ctaCTR = totalViews > 0 ? ((countsMap.cta_click / totalViews) * 100).toFixed(2) : '0.00';

    // Recent 20 events
    const recentEvents = await db.select({
      id: analyticsEvents.id,
      event: analyticsEvents.event,
      resourceType: analyticsEvents.resourceType,
      resourceId: analyticsEvents.resourceId,
      sessionId: analyticsEvents.sessionId,
      timestamp: analyticsEvents.timestamp,
    })
      .from(analyticsEvents)
      .limit(20)
      .orderBy(desc(analyticsEvents.timestamp));

    return {
      success: true,
      data: {
        metrics: {
          productViews: countsMap.product_view,
          mitraViews: countsMap.mitra_view,
          partnershipViews: countsMap.partnership_view,
          searches: countsMap.search,
          contactClicks: countsMap.contact_click,
          ctaClicks: countsMap.cta_click,
          totalViews,
          contactCTR: `${contactCTR}%`,
          ctaCTR: `${ctaCTR}%`,
        },
        recentEvents
      }
    };
  });
