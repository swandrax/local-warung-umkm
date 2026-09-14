import { astraClient, astraDb } from './db/astra';

async function main() {
  console.log('--- DataStax Astra DB Vector & Document Integration Test ---');

  // 1. Check database information
  const admin = astraClient.admin();
  const dbs = await admin.listDatabases();
  const targetDb = dbs.find(d => d.id === '020010fe-ac61-4473-b006-acfb91621aa6') || dbs[0];

  console.log(`[Astra] Connected Database ID: ${targetDb.id}`);
  console.log(`[Astra] Database Name: ${targetDb.name}`);
  console.log(`[Astra] Region: us-east-2`);
  console.log(`[Astra] Keyspace: default_keyspace`);
  console.log(`[Astra] Status: ${targetDb.status}`);

  // 2. List or verify collection
  const collections = await astraDb.listCollections();
  console.log('[Astra] Collections in DB:', collections.map(c => c.name));

  const coll = astraDb.collection('warung_vectors');

  // 3. Clean up previous test document
  const docId = 'sample-warung-kopi-01';
  await coll.deleteOne({ _id: docId }).catch(() => {});

  // 4. Insert sample document with 1536-dimensional embedding vector
  const sampleVector = new Array(1536).fill(0.01);
  sampleVector[0] = 0.85; // distinct vector feature

  const insertRes = await coll.insertOne({
    _id: docId,
    name: 'Warung Kopi Madura Berkah',
    category: 'Warung Kopi & Makanan Ringan',
    city: 'Jakarta Barat',
    address: 'Jl. Panjang No. 45, Kebon Jeruk',
    specialties: ['Kopi Tubruk', 'Indomie Telur Kornet', 'Es Teh Manis Jumbo'],
    $vector: sampleVector,
    updatedAt: new Date(),
  });

  console.log(`[Astra] Inserted document successfully (ID: ${insertRes.insertedId})`);

  // 5. Query document by ID
  const found = await coll.findOne({ _id: docId });
  console.log('[Astra] Query findOne result:');
  console.log(`  - Nama Warung: ${found?.name}`);
  console.log(`  - Kategori: ${found?.category}`);
  console.log(`  - Kota: ${found?.city}`);
  console.log(`  - Menu Unggulan: ${found?.specialties?.join(', ')}`);

  // 6. Perform Vector Similarity Search
  const queryVector = new Array(1536).fill(0.01);
  queryVector[0] = 0.82; // close similarity

  const similarDocs = await coll.find(
    {},
    {
      sort: { $vector: queryVector },
      limit: 3,
      includeSimilarity: true,
    }
  ).toArray();

  console.log('[Astra] Vector Similarity Search Results (Top matches):');
  for (const match of similarDocs) {
    console.log(`  - ${match.name} | Similarity Score: ${(match as any).$similarity?.toFixed(4)}`);
  }

  console.log('--- Astra DB Test Completed Successfully! ---');
}

main().catch(console.error);
