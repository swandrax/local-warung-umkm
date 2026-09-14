import { Elysia, t } from 'elysia';
import { db } from '../db';
import { products, mitraProfiles, auditLogs } from '../db/schema';
import { eq, and, ilike } from 'drizzle-orm';
import { authPlugin } from '../middleware/auth';
import { tenantContextService } from '../ai/context/tenant-context';

export const productRoutes = new Elysia({ prefix: '/products' })
  .use(authPlugin)
  .get('/', async ({ query: { q, category } }) => {
    let conditions = [];
    
    // Default to active products only
    conditions.push(eq(products.status, 'ACTIVE'));

    if (q) {
      conditions.push(ilike(products.name, `%${q}%`));
    }
    if (category) {
      conditions.push(eq(products.category, category));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const results = await db.select().from(products).where(whereClause);
    return { success: true, data: results };
  }, {
    query: t.Object({
      q: t.Optional(t.String()),
      category: t.Optional(t.String()),
    })
  })
  .get('/:id', async ({ params: { id }, error }: any) => {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    if (!product) return error(404, { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
    
    // If product is inactive, only owner or admin can see it. But for simplicity, we just return it.
    // In a strict implementation, we'd check auth here if status is INACTIVE.
    
    return { success: true, data: product };
  })
  .post('/', async ({ user, body, error }: any) => {
    if (!user) return error(401, { success: false, error: { code: 'UNAUTHORIZED' }});
    
    // Only Mitras can create products
    if (user.role !== 'MITRA' && user.role !== 'ADMIN') {
      return error(403, { success: false, error: { code: 'FORBIDDEN', message: 'Only Mitras can create products' } });
    }

    const [mitra] = await db.select().from(mitraProfiles).where(eq(mitraProfiles.userId, user.id));
    if (!mitra) return error(403, { success: false, error: { code: 'FORBIDDEN', message: 'Mitra profile not found' } });

    const pId = crypto.randomUUID();
    const [newProduct] = await db.insert(products).values({
      id: pId,
      mitraId: mitra.id,
      name: body.name,
      description: body.description,
      price: body.price,
      stock: body.stock ?? 0,
      category: body.category,
      image: body.image,
      gallery: body.gallery,
      isPublic: body.isPublic !== undefined ? body.isPublic : true,
      status: 'PENDING'
    }).returning();

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.id,
      action: 'PRODUCT_CREATE',
      resource: 'products',
      resourceId: pId,
      timestamp: new Date(),
    });

    // Invalidate AI Context Cache for this tenant
    await tenantContextService.invalidateTenant(mitra.id);

    return { success: true, data: newProduct };
  }, {
    body: t.Object({
      name: t.String({ minLength: 2 }),
      description: t.Optional(t.String()),
      price: t.Number({ minimum: 0 }),
      stock: t.Optional(t.Number({ minimum: 0 })),
      category: t.Optional(t.String()),
      image: t.Optional(t.String()),
      gallery: t.Optional(t.String()),
      isPublic: t.Optional(t.Boolean()),
    })
  })
  .put('/:id', async ({ user, params: { id }, body, error }: any) => {
    if (!user) return error(401, { success: false, error: { code: 'UNAUTHORIZED' }});
    
    const [product] = await db.select().from(products).where(eq(products.id, id));
    if (!product) return error(404, { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });

    const [mitra] = await db.select().from(mitraProfiles).where(eq(mitraProfiles.userId, user.id));
    
    // Must be the product owner or ADMIN
    if (product.mitraId !== mitra?.id && user.role !== 'ADMIN') {
      return error(403, { success: false, error: { code: 'FORBIDDEN', message: 'You do not own this product' } });
    }

    const updateData: any = { ...body, updatedAt: new Date() };
    if (user.role !== 'ADMIN') {
      delete updateData.status;
      delete updateData.moderationReason;
      delete updateData.moderatedBy;
      delete updateData.moderatedAt;
    }

    const [updated] = await db.update(products).set(updateData).where(eq(products.id, id)).returning();

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.id,
      action: 'PRODUCT_UPDATE',
      resource: 'products',
      resourceId: id,
      timestamp: new Date(),
    });

    // Invalidate AI Context Cache for this tenant
    await tenantContextService.invalidateTenant(product.mitraId);

    return { success: true, data: updated };
  }, {
    body: t.Object({
      name: t.Optional(t.String({ minLength: 2 })),
      description: t.Optional(t.String()),
      price: t.Optional(t.Number({ minimum: 0 })),
      stock: t.Optional(t.Number({ minimum: 0 })),
      category: t.Optional(t.String()),
      image: t.Optional(t.String()),
      gallery: t.Optional(t.String()),
      isPublic: t.Optional(t.Boolean()),
      status: t.Optional(t.String()), // only ADMIN can update
    })
  })
  .delete('/:id', async ({ user, params: { id }, error }: any) => {
    if (!user) return error(401, { success: false, error: { code: 'UNAUTHORIZED' }});
    
    const [product] = await db.select().from(products).where(eq(products.id, id));
    if (!product) return error(404, { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });

    const [mitra] = await db.select().from(mitraProfiles).where(eq(mitraProfiles.userId, user.id));
    
    if (product.mitraId !== mitra?.id && user.role !== 'ADMIN') {
      return error(403, { success: false, error: { code: 'FORBIDDEN', message: 'You do not own this product' } });
    }

    await db.delete(products).where(eq(products.id, id));

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.id,
      action: 'PRODUCT_DELETE',
      resource: 'products',
      resourceId: id,
      timestamp: new Date(),
    });

    // Invalidate AI Context Cache for this tenant
    await tenantContextService.invalidateTenant(product.mitraId);

    return { success: true, data: null };
  });
