import { db } from './index';
import { users, profiles, mitraProfiles, products, partnerships } from './schema';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('--- Seeding Neon PostgreSQL Database with UMKM Data ---');

  // 1. Create Demo User
  const demoUserId = 'user_demo_mitra_01';
  const existingUser = await db.select().from(users).where(eq(users.id, demoUserId));
  if (existingUser.length === 0) {
    const passwordHash = await Bun.password.hash('password123');
    await db.insert(users).values({
      id: demoUserId,
      email: 'mitra@warung.local',
      passwordHash,
      role: 'MITRA',
    });
    await db.insert(profiles).values({
      id: 'profile_demo_01',
      userId: demoUserId,
      name: 'Pak Haji Rohmat',
      phone: '081234567890',
      address: 'Jl. Kemanggisan No. 20',
      city: 'Jakarta Barat',
    });
  }

  // 2. Create Mitra 1: Warung Kopi Madura
  const mitra1Id = 'mitra_kopi_madura_01';
  const existingMitra1 = await db.select().from(mitraProfiles).where(eq(mitraProfiles.id, mitra1Id));
  if (existingMitra1.length === 0) {
    await db.insert(mitraProfiles).values({
      id: mitra1Id,
      userId: demoUserId,
      businessName: 'Warung Kopi & Roti Madura Berkah',
      shortDescription: 'Warung kopi santai 24 jam dengan aneka roti bakar dan kopi seduh nusantara.',
      description: 'Menyajikan sajian kopi tubruk pilihan dari lereng Gunung Ijen dan Gunung Puntang, dipadukan dengan roti bakar selai srikaya buatan rumahan.',
      category: 'Kuliner',
      city: 'Jakarta Barat',
      address: 'Jl. Panjang Arteri No. 12, Kebon Jeruk',
      phone: '081298765432',
      contactLabel: 'Pesan via WhatsApp',
      contactUrl: 'https://wa.me/6281298765432',
      isPublic: true,
      status: 'PUBLISHED',
      operatingHours: {
        monday: { openTime: '00:00', closeTime: '23:59', isOpen: true },
        tuesday: { openTime: '00:00', closeTime: '23:59', isOpen: true },
        wednesday: { openTime: '00:00', closeTime: '23:59', isOpen: true },
        thursday: { openTime: '00:00', closeTime: '23:59', isOpen: true },
        friday: { openTime: '00:00', closeTime: '23:59', isOpen: true },
        saturday: { openTime: '00:00', closeTime: '23:59', isOpen: true },
        sunday: { openTime: '00:00', closeTime: '23:59', isOpen: true },
      },
      coverImage: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
      logo: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=200&q=80',
    });
  }

  // 3. Create Mitra 2: Toko Sembako Bu Sri
  const mitra2Id = 'mitra_sembako_busri_02';
  const existingMitra2 = await db.select().from(mitraProfiles).where(eq(mitraProfiles.id, mitra2Id));
  if (existingMitra2.length === 0) {
    await db.insert(mitraProfiles).values({
      id: mitra2Id,
      userId: demoUserId,
      businessName: 'Toko Kelontong & Sembako Bu Sri',
      shortDescription: 'Grosir dan eceran sembako berkualitas, beras pandan wangi, minyak goreng, dan telur segar.',
      category: 'Sembako',
      city: 'Bandung',
      address: 'Jl. Cihampelas No. 88',
      phone: '081322334455',
      contactLabel: 'Hubungi Toko',
      contactUrl: 'https://wa.me/6281322334455',
      isPublic: true,
      status: 'PUBLISHED',
      operatingHours: {
        default: { openTime: '07:00', closeTime: '21:00', isOpen: true },
      },
      coverImage: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=800&q=80',
    });
  }

  // 4. Create Products
  const sampleProducts = [
    {
      id: 'prod_kopi_susu_aren',
      mitraId: mitra1Id,
      name: 'Kopi Susu Gula Aren Spesial',
      description: 'Espresso robusta Jawa dipadu susu segar pasteurisasi dan gula aren murni organik.',
      price: 18000,
      stock: 45,
      category: 'Kuliner',
      image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80',
      isPublic: true,
      status: 'PUBLISHED',
    },
    {
      id: 'prod_roti_bakar_srikaya',
      mitraId: mitra1Id,
      name: 'Roti Bakar Selai Srikaya Pandan',
      description: 'Roti gandum bakar dengan selai srikaya aroma pandan asli resep keluarga tempo dulu.',
      price: 16000,
      stock: 30,
      category: 'Kuliner',
      image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80',
      isPublic: true,
      status: 'PUBLISHED',
    },
    {
      id: 'prod_kopi_tubruk_ijen',
      mitraId: mitra1Id,
      name: 'Biji Kopi Tubruk Robusta Ijen 250g',
      description: 'Roasted coffee bean single origin Gunung Ijen dengan aroma cokelat karamel tebal.',
      price: 42000,
      stock: 25,
      category: 'Kuliner',
      image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
      isPublic: true,
      status: 'PUBLISHED',
    },
    {
      id: 'prod_beras_pandan_wangi',
      mitraId: mitra2Id,
      name: 'Beras Pandan Wangi Premium 5 Kg',
      description: 'Beras pulen alami tanpa pemutih dan tanpa pewangi sintetis langsung dari petani Cianjur.',
      price: 78000,
      stock: 50,
      category: 'Sembako',
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
      isPublic: true,
      status: 'PUBLISHED',
    },
    {
      id: 'prod_minyak_goreng_2l',
      mitraId: mitra2Id,
      name: 'Minyak Goreng Kelapa Sawit Pouch 2L',
      description: 'Minyak goreng jernih berkualitas ganda penyaringan untuk gorengan renyah.',
      price: 34000,
      stock: 60,
      category: 'Sembako',
      image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80',
      isPublic: true,
      status: 'PUBLISHED',
    },
    {
      id: 'prod_telur_ayam_1kg',
      mitraId: mitra2Id,
      name: 'Telur Ayam Negeri Segar Pilihan 1 Kg',
      description: 'Telur ayam negeri fresh setiap hari langsung dari peternakan binaan lokal.',
      price: 28000,
      stock: 40,
      category: 'Sembako',
      image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=600&q=80',
      isPublic: true,
      status: 'PUBLISHED',
    },
  ];

  for (const prod of sampleProducts) {
    const exists = await db.select().from(products).where(eq(products.id, prod.id));
    if (exists.length === 0) {
      await db.insert(products).values(prod);
      console.log(`+ Product created: ${prod.name}`);
    }
  }

  // 5. Create Partnerships
  const part1Id = 'part_kemitraan_kopi_01';
  const existingPart = await db.select().from(partnerships).where(eq(partnerships.id, part1Id));
  if (existingPart.length === 0) {
    await db.insert(partnerships).values({
      id: part1Id,
      requesterId: demoUserId,
      partnerId: mitra1Id,
      title: 'Program Konsinyasi Biji Kopi untuk Kedai & Warkop',
      shortDescription: 'Peluang pasokan biji kopi lokal dengan sistem konsinyasi bagi pengusaha warkop baru.',
      description: 'Bermitra dengan Warung Kopi Madura Berkah untuk pasokan biji kopi roasted berkala dengan margin bagi hasil kompetitif.',
      image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=800&q=80',
      contactLabel: 'Daftar Mitra Konsinyasi',
      contactUrl: 'https://wa.me/6281298765432',
      isPublic: true,
      status: 'PUBLISHED',
    });
  }

  console.log('--- Seeding Completed Successfully! ---');
}

seed().catch(console.error).then(() => process.exit(0));
