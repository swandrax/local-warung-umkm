import { Database } from 'bun:sqlite';

const db = new Database('sqlite.db');

function ensureColumns(table: string, columns: { name: string; type: string; defaultVal?: string }[]) {
  const tableInfo = db.query(`PRAGMA table_info(${table})`).all() as any[];
  const existingColNames = new Set(tableInfo.map((col: any) => col.name));

  for (const col of columns) {
    if (!existingColNames.has(col.name)) {
      const defaultClause = col.defaultVal ? ` DEFAULT ${col.defaultVal}` : '';
      console.log(`Adding column ${col.name} to ${table}...`);
      db.run(`ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.type}${defaultClause}`);
    }
  }
}

console.log('Running SQLite database migrations...');

// 1. Ensure mitra_profiles columns
ensureColumns('mitra_profiles', [
  { name: 'short_description', type: 'TEXT' },
  { name: 'cover_image', type: 'TEXT' },
  { name: 'contact_label', type: 'TEXT' },
  { name: 'contact_url', type: 'TEXT' },
  { name: 'is_public', type: 'INTEGER', defaultVal: '0' },
  { name: 'operating_hours', type: 'TEXT' },
  { name: 'timezone', type: 'TEXT', defaultVal: "'Asia/Jakarta'" },
  { name: 'moderation_reason', type: 'TEXT' },
  { name: 'moderated_by', type: 'TEXT' },
  { name: 'moderated_at', type: 'INTEGER' }
]);

// 2. Ensure products columns
ensureColumns('products', [
  { name: 'gallery', type: 'TEXT' },
  { name: 'is_public', type: 'INTEGER', defaultVal: '1' },
  { name: 'moderation_reason', type: 'TEXT' },
  { name: 'moderated_by', type: 'TEXT' },
  { name: 'moderated_at', type: 'INTEGER' }
]);

// 3. Ensure partnerships columns
ensureColumns('partnerships', [
  { name: 'short_description', type: 'TEXT' },
  { name: 'image', type: 'TEXT' },
  { name: 'benefits', type: 'TEXT' },
  { name: 'contact_label', type: 'TEXT' },
  { name: 'contact_url', type: 'TEXT' },
  { name: 'is_public', type: 'INTEGER', defaultVal: '0' },
  { name: 'moderation_reason', type: 'TEXT' },
  { name: 'moderated_by', type: 'TEXT' },
  { name: 'moderated_at', type: 'INTEGER' }
]);

// 4. Create analytics_events table
db.run(`
  CREATE TABLE IF NOT EXISTS analytics_events (
    id TEXT PRIMARY KEY,
    event TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    session_id TEXT,
    metadata TEXT,
    timestamp INTEGER NOT NULL
  )
`);

// 5. Create Indexes
const indexes = [
  'CREATE INDEX IF NOT EXISTS product_mitra_idx ON products(mitra_id)',
  'CREATE INDEX IF NOT EXISTS product_status_idx ON products(status)',
  'CREATE INDEX IF NOT EXISTS product_category_idx ON products(category)',
  'CREATE INDEX IF NOT EXISTS product_public_idx ON products(is_public)',
  'CREATE INDEX IF NOT EXISTS product_created_at_idx ON products(created_at)',
  'CREATE INDEX IF NOT EXISTS mitra_status_idx ON mitra_profiles(status)',
  'CREATE INDEX IF NOT EXISTS mitra_public_idx ON mitra_profiles(is_public)',
  'CREATE INDEX IF NOT EXISTS mitra_category_idx ON mitra_profiles(category)',
  'CREATE INDEX IF NOT EXISTS mitra_created_at_idx ON mitra_profiles(created_at)',
  'CREATE INDEX IF NOT EXISTS partnership_status_idx ON partnerships(status)',
  'CREATE INDEX IF NOT EXISTS partnership_public_idx ON partnerships(is_public)',
  'CREATE INDEX IF NOT EXISTS partnership_created_at_idx ON partnerships(created_at)',
  'CREATE INDEX IF NOT EXISTS analytics_event_idx ON analytics_events(event)',
  'CREATE INDEX IF NOT EXISTS analytics_resource_idx ON analytics_events(resource_type, resource_id)',
  'CREATE INDEX IF NOT EXISTS analytics_timestamp_idx ON analytics_events(timestamp)'
];

for (const idxSql of indexes) {
  db.run(idxSql);
}

console.log('Database migration successfully completed!');
