import { Elysia, t } from 'elysia';
import { db } from '../db';
import { products, mitraProfiles, partnerships } from '../db/schema';
import { eq, and, desc, asc, like, or, sql, gte, lte } from 'drizzle-orm';

/**
 * Calculates store open/closed status based on JSON operating hours and timezone
 */
export function calculateMitraOpenStatus(operatingHoursRaw: any, timezone = 'Asia/Jakarta'): 'OPEN' | 'CLOSED' | 'UNKNOWN' {
  if (!operatingHoursRaw) return 'UNKNOWN';
  try {
    const hours = typeof operatingHoursRaw === 'string' ? JSON.parse(operatingHoursRaw) : operatingHoursRaw;
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      timeZone: timezone || 'Asia/Jakarta', 
      weekday: 'long', 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(now);
    
    const weekday = parts.find(p => p.type === 'weekday')?.value?.toLowerCase() || '';
    const hour = parts.find(p => p.type === 'hour')?.value || '00';
    const minute = parts.find(p => p.type === 'minute')?.value || '00';
    const currentTime = `${hour}:${minute}`;

    const todaySchedule = hours[weekday];
    if (!todaySchedule) return 'UNKNOWN';
    if (!todaySchedule.isOpen) return 'CLOSED';

    const { openTime, closeTime } = todaySchedule;
    if (!openTime || !closeTime) return 'UNKNOWN';

    if (currentTime >= openTime && currentTime <= closeTime) {
      return 'OPEN';
    }
    return 'CLOSED';
  } catch {
    return 'UNKNOWN';
  }
}

/**
 * Safe public product serializer DTO
 */
function serializeProduct(p: any, mitraMap?: Map<string, any>) {
  const mitra = mitraMap?.get(p.mitraId);
  let galleryUrls: string[] = [];
  try {
    if (p.gallery) {
      galleryUrls = Array.isArray(p.gallery) ? p.gallery : (typeof p.gallery === 'string' ? JSON.parse(p.gallery) : []);
    }
  } catch {}

  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    category: p.category,
    image: p.image,
    gallery: galleryUrls,
    availability: (p.stock && p.stock > 0) ? 'AVAILABLE' : 'OUT_OF_STOCK',
    mitraId: p.mitraId,
    mitraName: mitra?.businessName || p.mitraName || null,
    city: mitra?.city || p.city || null,
    contactLabel: mitra?.contactLabel || null,
    contactUrl: mitra?.contactUrl || null,
    createdAt: p.createdAt,
  };
}

export const publicRoutes = new Elysia({ prefix: '/public' })
  // S2B.1, S2B.2: PUBLIC PRODUCTS CATALOG WITH RICH FILTER & SEARCH
  .get('/products', async ({ query }) => {
    const page = Math.max(1, parseInt(query.page || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20')));
    const offset = (page - 1) * limit;

    const q = query.q?.trim();
    const category = query.category?.trim();
    const minPrice = query.minPrice ? parseInt(query.minPrice) : undefined;
    const maxPrice = query.maxPrice ? parseInt(query.maxPrice) : undefined;
    const availability = query.availability;
    const mitraId = query.mitraId;
    const sort = query.sort || 'newest';

    // Base conditions: public and published/active
    let conditions = [
      eq(products.isPublic, true),
      or(eq(products.status, 'PUBLISHED'), eq(products.status, 'ACTIVE'))!
    ];

    if (q) {
      conditions.push(or(
        like(products.name, `%${q}%`),
        like(products.description, `%${q}%`)
      )!);
    }

    if (category && category !== 'ALL') {
      conditions.push(eq(products.category, category));
    }

    if (minPrice !== undefined && !isNaN(minPrice)) {
      conditions.push(gte(products.price, minPrice));
    }

    if (maxPrice !== undefined && !isNaN(maxPrice)) {
      conditions.push(lte(products.price, maxPrice));
    }

    if (availability === 'AVAILABLE') {
      conditions.push(sql`${products.stock} > 0`);
    } else if (availability === 'OUT_OF_STOCK') {
      conditions.push(sql`${products.stock} <= 0`);
    }

    if (mitraId) {
      conditions.push(eq(products.mitraId, mitraId));
    }

    const whereClause = and(...conditions);

    // Sorting
    let orderClause = desc(products.createdAt);
    if (sort === 'price_asc') {
      orderClause = asc(products.price);
    } else if (sort === 'price_desc') {
      orderClause = desc(products.price);
    } else if (sort === 'popular') {
      orderClause = desc(products.createdAt);
    }

    // Single query for products
    const rawProducts = await db.select()
      .from(products)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(orderClause);

    // Fetch Mitra info efficiently in batch (anti-N+1)
    const mitraIds = [...new Set(rawProducts.map(p => p.mitraId))];
    const mitras = mitraIds.length > 0 
      ? await db.select({
          id: mitraProfiles.id,
          businessName: mitraProfiles.businessName,
          city: mitraProfiles.city,
          contactLabel: mitraProfiles.contactLabel,
          contactUrl: mitraProfiles.contactUrl
        }).from(mitraProfiles).where(sql`${mitraProfiles.id} IN ${mitraIds}`)
      : [];

    const mitraMap = new Map(mitras.map(m => [m.id, m]));
    const data = rawProducts.map(p => serializeProduct(p, mitraMap));

    // Count total for pagination
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(products)
      .where(whereClause);
    const total = countResult[0]?.count || 0;

    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  })

  // S2B.3: PUBLIC PRODUCT DETAIL & RELATED CONTENT
  .get('/products/:id', async ({ params: { id }, set }) => {
    const [product] = await db.select()
      .from(products)
      .where(and(
        eq(products.id, id),
        eq(products.isPublic, true),
        or(eq(products.status, 'PUBLISHED'), eq(products.status, 'ACTIVE'))!
      ));

    if (!product) {
      set.status = 404;
      return { success: false, error: { code: 'NOT_FOUND', message: 'Product not found or not public' } };
    }

    // Fetch Mitra profile
    const [mitra] = await db.select({
      id: mitraProfiles.id,
      businessName: mitraProfiles.businessName,
      logo: mitraProfiles.logo,
      city: mitraProfiles.city,
      address: mitraProfiles.address,
      contactLabel: mitraProfiles.contactLabel,
      contactUrl: mitraProfiles.contactUrl,
      category: mitraProfiles.category,
      operatingHours: mitraProfiles.operatingHours,
      timezone: mitraProfiles.timezone,
    }).from(mitraProfiles).where(eq(mitraProfiles.id, product.mitraId));

    const mitraMap = new Map([[mitra.id, mitra]]);
    const serialized = serializeProduct(product, mitraMap);

    // Fetch related products (same category, max 4, anti-N+1)
    let relatedProducts: any[] = [];
    if (product.category) {
      const related = await db.select()
        .from(products)
        .where(and(
          eq(products.category, product.category),
          sql`${products.id} != ${product.id}`,
          eq(products.isPublic, true),
          or(eq(products.status, 'PUBLISHED'), eq(products.status, 'ACTIVE'))!
        ))
        .limit(4)
        .orderBy(desc(products.createdAt));
      relatedProducts = related.map(p => serializeProduct(p, mitraMap));
    }

    // Fetch more from this Mitra (max 4)
    const moreFromMitraRaw = await db.select()
      .from(products)
      .where(and(
        eq(products.mitraId, product.mitraId),
        sql`${products.id} != ${product.id}`,
        eq(products.isPublic, true),
        or(eq(products.status, 'PUBLISHED'), eq(products.status, 'ACTIVE'))!
      ))
      .limit(4)
      .orderBy(desc(products.createdAt));
    const moreFromMitra = moreFromMitraRaw.map(p => serializeProduct(p, mitraMap));

    return {
      success: true,
      data: {
        ...serialized,
        mitra: mitra ? {
          ...mitra,
          operatingStatus: calculateMitraOpenStatus(mitra.operatingHours, mitra.timezone || 'Asia/Jakarta')
        } : null,
        relatedProducts,
        moreFromMitra,
      }
    };
  })

  // S2B.4, S2B.5: PUBLIC MITRA STOREFRONT & OPERATING HOURS
  .get('/mitra', async ({ query }) => {
    const page = Math.max(1, parseInt(query.page || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20')));
    const offset = (page - 1) * limit;
    const category = query.category;
    const q = query.q?.trim();

    let conditions = [
      eq(mitraProfiles.isPublic, true),
      or(eq(mitraProfiles.status, 'PUBLISHED'), eq(mitraProfiles.status, 'ACTIVE'))!
    ];

    if (category && category !== 'ALL') {
      conditions.push(eq(mitraProfiles.category, category));
    }

    if (q) {
      conditions.push(or(
        like(mitraProfiles.businessName, `%${q}%`),
        like(mitraProfiles.shortDescription, `%${q}%`),
        like(mitraProfiles.city, `%${q}%`)
      )!);
    }

    const whereClause = and(...conditions);

    const mitras = await db.select({
      id: mitraProfiles.id,
      businessName: mitraProfiles.businessName,
      shortDescription: mitraProfiles.shortDescription,
      logo: mitraProfiles.logo,
      coverImage: mitraProfiles.coverImage,
      category: mitraProfiles.category,
      city: mitraProfiles.city,
      operatingHours: mitraProfiles.operatingHours,
      timezone: mitraProfiles.timezone,
      contactLabel: mitraProfiles.contactLabel,
      contactUrl: mitraProfiles.contactUrl,
      createdAt: mitraProfiles.createdAt,
    })
      .from(mitraProfiles)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(mitraProfiles.createdAt));

    const data = mitras.map(m => ({
      ...m,
      operatingStatus: calculateMitraOpenStatus(m.operatingHours, m.timezone || 'Asia/Jakarta')
    }));

    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(mitraProfiles)
      .where(whereClause);
    const total = countResult[0]?.count || 0;

    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  })
  .get('/mitra/:id', async ({ params: { id }, set }) => {
    const [mitra] = await db.select({
      id: mitraProfiles.id,
      businessName: mitraProfiles.businessName,
      shortDescription: mitraProfiles.shortDescription,
      description: mitraProfiles.description,
      logo: mitraProfiles.logo,
      coverImage: mitraProfiles.coverImage,
      phone: mitraProfiles.phone,
      address: mitraProfiles.address,
      city: mitraProfiles.city,
      website: mitraProfiles.website,
      category: mitraProfiles.category,
      contactLabel: mitraProfiles.contactLabel,
      contactUrl: mitraProfiles.contactUrl,
      operatingHours: mitraProfiles.operatingHours,
      timezone: mitraProfiles.timezone,
      createdAt: mitraProfiles.createdAt,
    })
      .from(mitraProfiles)
      .where(and(
        eq(mitraProfiles.id, id),
        eq(mitraProfiles.isPublic, true),
        or(eq(mitraProfiles.status, 'PUBLISHED'), eq(mitraProfiles.status, 'ACTIVE'))!
      ));

    if (!mitra) {
      set.status = 404;
      return { success: false, error: { code: 'NOT_FOUND', message: 'Mitra profile not found or not public' } };
    }

    // Parse operating hours
    let parsedHours = null;
    try {
      if (mitra.operatingHours) {
        parsedHours = typeof mitra.operatingHours === 'string' ? JSON.parse(mitra.operatingHours) : mitra.operatingHours;
      }
    } catch {}

    const operatingStatus = calculateMitraOpenStatus(mitra.operatingHours, mitra.timezone || 'Asia/Jakarta');

    // Fetch this Mitra's public products (limit 12)
    const mitraProductsRaw = await db.select()
      .from(products)
      .where(and(
        eq(products.mitraId, mitra.id),
        eq(products.isPublic, true),
        or(eq(products.status, 'PUBLISHED'), eq(products.status, 'ACTIVE'))!
      ))
      .limit(12)
      .orderBy(desc(products.createdAt));

    const mitraMap = new Map([[mitra.id, mitra]]);
    const mitraProducts = mitraProductsRaw.map(p => serializeProduct(p, mitraMap));

    // Fetch this Mitra's public partnerships
    const mitraPartnerships = await db.select({
      id: partnerships.id,
      title: partnerships.title,
      shortDescription: partnerships.shortDescription,
      image: partnerships.image,
      contactLabel: partnerships.contactLabel,
      contactUrl: partnerships.contactUrl,
      createdAt: partnerships.createdAt,
    })
      .from(partnerships)
      .where(and(
        eq(partnerships.partnerId, mitra.id),
        eq(partnerships.isPublic, true),
        or(eq(partnerships.status, 'PUBLISHED'), eq(partnerships.status, 'ACCEPTED'))!
      ))
      .limit(6)
      .orderBy(desc(partnerships.createdAt));

    return {
      success: true,
      data: {
        ...mitra,
        operatingHours: parsedHours,
        operatingStatus,
        products: mitraProducts,
        partnerships: mitraPartnerships,
      }
    };
  })

  // S2B.6: PUBLIC PARTNERSHIPS SHOWCASE & DETAIL
  .get('/partnerships', async ({ query }) => {
    const page = Math.max(1, parseInt(query.page || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20')));
    const offset = (page - 1) * limit;

    const whereClause = and(
      eq(partnerships.isPublic, true),
      or(eq(partnerships.status, 'PUBLISHED'), eq(partnerships.status, 'ACCEPTED'))!
    );

    const rawPartnerships = await db.select()
      .from(partnerships)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(partnerships.createdAt));

    // Fetch partner mitra names
    const partnerIds = [...new Set(rawPartnerships.map(p => p.partnerId))];
    const partnerMitras = partnerIds.length > 0
      ? await db.select({
          id: mitraProfiles.id,
          businessName: mitraProfiles.businessName,
          logo: mitraProfiles.logo,
          city: mitraProfiles.city
        }).from(mitraProfiles).where(sql`${mitraProfiles.id} IN ${partnerIds}`)
      : [];

    const partnerMap = new Map(partnerMitras.map(m => [m.id, m]));

    const data = rawPartnerships.map(p => {
      let benefitsList: string[] = [];
      try {
        if (p.benefits) {
          benefitsList = Array.isArray(p.benefits) ? p.benefits : (typeof p.benefits === 'string' ? JSON.parse(p.benefits) : []);
        }
      } catch {}

      const partner = partnerMap.get(p.partnerId);
      return {
        id: p.id,
        title: p.title,
        shortDescription: p.shortDescription,
        image: p.image,
        benefits: benefitsList,
        contactLabel: p.contactLabel,
        contactUrl: p.contactUrl,
        partnerId: p.partnerId,
        partnerName: partner?.businessName || null,
        partnerLogo: partner?.logo || null,
        partnerCity: partner?.city || null,
        createdAt: p.createdAt,
      };
    });

    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(partnerships)
      .where(whereClause);
    const total = countResult[0]?.count || 0;

    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  })
  .get('/partnerships/:id', async ({ params: { id }, set }) => {
    const [partnership] = await db.select()
      .from(partnerships)
      .where(and(
        eq(partnerships.id, id),
        eq(partnerships.isPublic, true),
        or(eq(partnerships.status, 'PUBLISHED'), eq(partnerships.status, 'ACCEPTED'))!
      ));

    if (!partnership) {
      set.status = 404;
      return { success: false, error: { code: 'NOT_FOUND', message: 'Partnership not found or not public' } };
    }

    // Fetch partner mitra
    const [partner] = await db.select({
      id: mitraProfiles.id,
      businessName: mitraProfiles.businessName,
      logo: mitraProfiles.logo,
      shortDescription: mitraProfiles.shortDescription,
      city: mitraProfiles.city,
      category: mitraProfiles.category,
      contactLabel: mitraProfiles.contactLabel,
      contactUrl: mitraProfiles.contactUrl,
    }).from(mitraProfiles).where(eq(mitraProfiles.id, partnership.partnerId));

    let benefitsList: string[] = [];
    try {
      if (partnership.benefits) {
        benefitsList = Array.isArray(partnership.benefits) ? partnership.benefits : (typeof partnership.benefits === 'string' ? JSON.parse(partnership.benefits) : []);
      }
    } catch {}

    return {
      success: true,
      data: {
        id: partnership.id,
        title: partnership.title,
        shortDescription: partnership.shortDescription,
        description: partnership.description,
        image: partnership.image,
        benefits: benefitsList,
        contactLabel: partnership.contactLabel,
        contactUrl: partnership.contactUrl,
        partner,
        createdAt: partnership.createdAt,
      }
    };
  });
