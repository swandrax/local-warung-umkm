import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // crypto.randomUUID()
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('USER'), // ADMIN, USER, MITRA
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  phone: text('phone'),
  avatar: text('avatar'),
  bio: text('bio'),
  address: text('address'),
  city: text('city'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const mitraProfiles = sqliteTable('mitra_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  businessName: text('business_name').notNull(),
  description: text('description'),
  shortDescription: text('short_description'),
  logo: text('logo'),
  coverImage: text('cover_image'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  city: text('city'),
  website: text('website'),
  category: text('category'),
  contactLabel: text('contact_label'),
  contactUrl: text('contact_url'),
  operatingHours: text('operating_hours'), // JSON string: { monday: { isOpen: boolean, openTime: "08:00", closeTime: "17:00" }, ... }
  timezone: text('timezone').default('Asia/Jakarta'),
  isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
  status: text('status').notNull().default('PENDING'), // DRAFT, PENDING, PUBLISHED, UNPUBLISHED, ARCHIVED
  moderationReason: text('moderation_reason'),
  moderatedBy: text('moderated_by'),
  moderatedAt: integer('moderated_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('mitra_status_idx').on(table.status),
  index('mitra_public_idx').on(table.isPublic),
  index('mitra_category_idx').on(table.category),
  index('mitra_created_at_idx').on(table.createdAt)
]);

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  mitraId: text('mitra_id').notNull().references(() => mitraProfiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  price: integer('price').notNull(),
  stock: integer('stock').notNull().default(0),
  category: text('category'),
  image: text('image'),
  gallery: text('gallery'), // JSON array of image URLs
  isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(true),
  status: text('status').notNull().default('PUBLISHED'), // DRAFT, PENDING, PUBLISHED, UNPUBLISHED, ARCHIVED
  moderationReason: text('moderation_reason'),
  moderatedBy: text('moderated_by'),
  moderatedAt: integer('moderated_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('product_mitra_idx').on(table.mitraId),
  index('product_status_idx').on(table.status),
  index('product_category_idx').on(table.category),
  index('product_public_idx').on(table.isPublic),
  index('product_created_at_idx').on(table.createdAt)
]);

export const partnerships = sqliteTable('partnerships', {
  id: text('id').primaryKey(),
  requesterId: text('requester_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  partnerId: text('partner_id').notNull().references(() => mitraProfiles.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  shortDescription: text('short_description'),
  image: text('image'),
  benefits: text('benefits'), // JSON array of strings
  contactLabel: text('contact_label'),
  contactUrl: text('contact_url'),
  isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
  status: text('status').notNull().default('PENDING'), // DRAFT, PENDING, PUBLISHED, UNPUBLISHED, ARCHIVED
  moderationReason: text('moderation_reason'),
  moderatedBy: text('moderated_by'),
  moderatedAt: integer('moderated_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('partnership_status_idx').on(table.status),
  index('partnership_public_idx').on(table.isPublic),
  index('partnership_created_at_idx').on(table.createdAt)
]);

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: text('resource_id'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  metadata: text('metadata'), // JSON stringified
});

export const analyticsEvents = sqliteTable('analytics_events', {
  id: text('id').primaryKey(),
  event: text('event').notNull(), // product_view, mitra_view, partnership_view, search, contact_click, cta_click
  resourceType: text('resource_type'), // PRODUCT, MITRA, PARTNERSHIP, GENERAL
  resourceId: text('resource_id'),
  sessionId: text('session_id'),
  metadata: text('metadata'), // JSON stringified
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('analytics_event_idx').on(table.event),
  index('analytics_resource_idx').on(table.resourceType, table.resourceId),
  index('analytics_timestamp_idx').on(table.timestamp)
]);
