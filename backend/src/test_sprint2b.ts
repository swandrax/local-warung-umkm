import { db } from './db';
import { users, mitraProfiles } from './db/schema';
import { eq } from 'drizzle-orm';

async function runTests() {
  const BASE = 'http://localhost:3000';
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  }

  console.log('--- STARTING SPRINT 2B INTEGRATION TESTS ---');

  // 1. Guest Public Endpoints
  console.log('\n--- 1. GUEST PUBLIC DISCOVERY & SEARCH ---');
  const resProducts = await fetch(`${BASE}/api/public/products`);
  const dataProducts = await resProducts.json();
  assert(resProducts.ok && dataProducts.success === true, 'GET /api/public/products returns 200');
  assert(Array.isArray(dataProducts.data), 'GET /api/public/products data is array');
  assert(dataProducts.pagination && typeof dataProducts.pagination.total === 'number', 'Pagination object present');

  if (dataProducts.data.length > 0) {
    const p1 = dataProducts.data[0];
    assert(p1.stockStatus === 'Tersedia' || p1.stockStatus === 'Habis', 'Sanitized stock status (no raw internal stock exposed)');
    assert(p1.stock === undefined, 'Raw stock count NOT exposed to guest');

    // Test product detail
    const resDetail = await fetch(`${BASE}/api/public/products/${p1.id}`);
    const dataDetail = await resDetail.json();
    assert(resDetail.ok && dataDetail.success === true, `GET /api/public/products/:id returns 200 for ${p1.name}`);
    assert(dataDetail.data.relatedProducts !== undefined, 'Related products included in detail');
    assert(dataDetail.data.moreFromMitra !== undefined, 'More from Mitra included in detail');
  }

  // Search & Filter
  const resSearch = await fetch(`${BASE}/api/public/products?q=a&page=1&limit=5&sort=price_asc`);
  const dataSearch = await resSearch.json();
  assert(resSearch.ok && dataSearch.success === true, 'GET /api/public/products with query, sort, and pagination');

  // Public Mitra
  console.log('\n--- 2. PUBLIC MITRA STOREFRONT ---');
  const resMitras = await fetch(`${BASE}/api/public/mitra`);
  const dataMitras = await resMitras.json();
  assert(resMitras.ok && dataMitras.success === true, 'GET /api/public/mitra returns 200');

  if (dataMitras.data.length > 0) {
    const m1 = dataMitras.data[0];
    const resMitraDetail = await fetch(`${BASE}/api/public/mitra/${m1.id}`);
    const dataMitraDetail = await resMitraDetail.json();
    assert(resMitraDetail.ok && dataMitraDetail.success === true, `GET /api/public/mitra/:id returns 200 for ${m1.businessName}`);
    assert(dataMitraDetail.data.operatingStatus === 'BUKA' || dataMitraDetail.data.operatingStatus === 'TUTUP', 'Operating status calculated correctly (BUKA/TUTUP)');
    assert(Array.isArray(dataMitraDetail.data.products), 'Mitra storefront products list present');
  }

  // Public Partnerships
  console.log('\n--- 3. PUBLIC PARTNERSHIPS ---');
  const resPartnerships = await fetch(`${BASE}/api/public/partnerships`);
  const dataPartnerships = await resPartnerships.json();
  assert(resPartnerships.ok && dataPartnerships.success === true, 'GET /api/public/partnerships returns 200');

  // Analytics Event
  console.log('\n--- 4. PUBLIC ANALYTICS EVENT TRACKING ---');
  const resEvent = await fetch(`${BASE}/api/analytics/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'cta_click',
      resourceType: 'product',
      resourceId: 'test-product-id',
      sessionId: 'sess-test-123'
    })
  });
  const dataEvent = await resEvent.json();
  assert(resEvent.ok && dataEvent.success === true, 'POST /api/analytics/event records event without auth');

  // 5. Auth & RBAC Tests
  console.log('\n--- 5. RBAC & MODERATION TESTS ---');
  const userEmail = `testuser_${Date.now()}@example.com`;
  const regUser = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userEmail,
      password: 'password123',
      name: 'Normal User'
    })
  });
  assert(regUser.ok, 'User registration succeeds');

  const loginUser = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userEmail,
      password: 'password123'
    })
  });
  const loginUserData = await loginUser.json();
  const userToken = loginUserData.data?.token;
  assert(!!userToken, 'User login returns JWT token');

  // User attempts to access admin endpoint -> 403
  const userAdminAttempt = await fetch(`${BASE}/api/admin/pending`, {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  assert(userAdminAttempt.status === 403, 'Normal USER denied from /api/admin/pending (403)');

  // User attempts to create product without Mitra role -> 403
  const userProdAttempt = await fetch(`${BASE}/api/products`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Illegal Product',
      price: 10000
    })
  });
  assert(userProdAttempt.status === 403, 'Normal USER denied from creating product (403)');

  // Setup Admin
  const adminEmail = `admin_${Date.now()}@example.com`;
  await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: adminEmail,
      password: 'password123',
      name: 'Platform Admin'
    })
  });
  await db.update(users).set({ role: 'ADMIN' }).where(eq(users.email, adminEmail));

  const loginAdmin = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: adminEmail,
      password: 'password123'
    })
  });
  const loginAdminData = await loginAdmin.json();
  const adminToken = loginAdminData.data?.token;
  assert(!!adminToken, 'Admin login returns JWT token');

  // Check admin pending
  const adminPending = await fetch(`${BASE}/api/admin/pending`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const adminPendingData = await adminPending.json();
  assert(adminPending.ok && adminPendingData.success === true, 'ADMIN can access /api/admin/pending');

  // Check admin analytics summary
  const adminSummary = await fetch(`${BASE}/api/admin/analytics/summary`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const adminSummaryData = await adminSummary.json();
  assert(adminSummary.ok && adminSummaryData.success === true, 'ADMIN can access /api/admin/analytics/summary');
  assert(adminSummaryData.data.rates && adminSummaryData.data.rates.ctrContact !== undefined, 'CTR Contact rate computed');

  // Check reject without reason validation
  const testReject = await fetch(`${BASE}/api/admin/moderate/products/dummy-id`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'REJECT'
    })
  });
  assert(testReject.status === 400, 'Rejecting without moderation reason returns 400 BAD_REQUEST');

  // 6. Full Lifecycle Test (Mitra Create -> Admin Moderation -> Public Discovery)
  console.log('\n--- 6. FULL MODERATION LIFECYCLE (MITRA -> ADMIN -> GUEST) ---');
  // Create a Mitra
  const mitraEmail = `mitra_${Date.now()}@example.com`;
  await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: mitraEmail,
      password: 'password123',
      name: 'Warung Mitra Jaya'
    })
  });
  await db.update(users).set({ role: 'MITRA' }).where(eq(users.email, mitraEmail));
  const [mitraUser] = await db.select().from(users).where(eq(users.email, mitraEmail));

  // Create Mitra Profile
  const mitraId = crypto.randomUUID();
  await db.insert(mitraProfiles).values({
    id: mitraId,
    userId: mitraUser.id,
    businessName: 'Warung Mitra Jaya',
    category: 'Kuliner',
    city: 'Bandung',
    status: 'ACTIVE',
    isPublic: true,
  });

  const loginMitra = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: mitraEmail,
      password: 'password123'
    })
  });
  const { data: { token: mitraToken } } = await loginMitra.json();

  // Mitra creates a product
  const productName = `Kopi Robusta Asli ${Date.now()}`;
  const createProdRes = await fetch(`${BASE}/api/products`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${mitraToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: productName,
      price: 25000,
      stock: 50,
      category: 'Kuliner',
      isPublic: true
    })
  });
  const createProdData = await createProdRes.json();
  assert(createProdRes.ok && createProdData.data.status === 'PENDING', 'New product created with PENDING status');
  const createdProductId = createProdData.data.id;

  // Guest searches for product -> MUST NOT BE VISIBLE YET
  const guestSearchBefore = await fetch(`${BASE}/api/public/products?q=${encodeURIComponent(productName)}`);
  const guestDataBefore = await guestSearchBefore.json();
  const foundBefore = guestDataBefore.data.find((p: any) => p.id === createdProductId);
  assert(!foundBefore, 'Pending product is NOT visible to public guest');

  // Admin approves and publishes the product
  const approveRes = await fetch(`${BASE}/api/admin/moderate/products/${createdProductId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'APPROVE'
    })
  });
  assert(approveRes.ok, 'Admin successfully approves product');

  // Guest searches again -> MUST BE VISIBLE NOW
  const guestSearchAfter = await fetch(`${BASE}/api/public/products?q=${encodeURIComponent(productName)}`);
  const guestDataAfter = await guestSearchAfter.json();
  const foundAfter = guestDataAfter.data.find((p: any) => p.id === createdProductId);
  assert(!!foundAfter, 'Approved product IS immediately discoverable by public guest');

  console.log(`\n================================`);
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log(`================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
