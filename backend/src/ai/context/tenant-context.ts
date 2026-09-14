import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { mitraProfiles, products } from '../../db/schema';
import { cache } from '../../infrastructure/cache/valkey';
import type { TenantBusinessContext } from '../providers';

export class TenantContextService {
  /**
   * Retrieves tenant context from Valkey cache.
   * If cache miss, queries PostgreSQL, populates cache, and returns data.
   */
  async getOrFetchTenantContext(tenantId: string): Promise<TenantBusinessContext | null> {
    // 1. Cache-first strategy
    const cached = await cache.getTenantContext<TenantBusinessContext>(tenantId);
    if (cached) {
      return cached;
    }

    // 2. Cache miss: Fetch from PostgreSQL
    try {
      const mitraList = await db
        .select()
        .from(mitraProfiles)
        .where(eq(mitraProfiles.id, tenantId))
        .limit(1);

      if (mitraList.length === 0) {
        return null;
      }

      const mitra = mitraList[0];

      // Fetch published products for this tenant
      const productList = await db
        .select({
          id: products.id,
          name: products.name,
          price: products.price,
          stock: products.stock,
          description: products.description,
        })
        .from(products)
        .where(eq(products.mitraId, tenantId))
        .limit(50);

      const contextData: TenantBusinessContext = {
        businessName: mitra.businessName,
        description: mitra.description || undefined,
        address: mitra.address || undefined,
        phone: mitra.phone || undefined,
        category: mitra.category || undefined,
        operatingHours: mitra.operatingHours,
        availableProducts: productList.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          stock: p.stock,
          description: p.description || undefined,
        })),
      };

      // 3. Populate Valkey cache (TTL 600s = 10 minutes)
      await cache.setTenantContext(tenantId, contextData, 600);

      return contextData;
    } catch (err: any) {
      console.error(`[TenantContextService] Error fetching tenant ${tenantId}:`, err?.message || err);
      return null;
    }
  }

  /**
   * Invalidates tenant context cache whenever products or profile details are modified.
   */
  async invalidateTenant(tenantId: string): Promise<void> {
    await cache.invalidateTenant(tenantId);
    console.log(`[TenantContextService] Cache invalidated for tenant: ${tenantId}`);
  }
}

export const tenantContextService = new TenantContextService();
