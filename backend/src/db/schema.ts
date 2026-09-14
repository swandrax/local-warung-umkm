import { pgTable, text, integer, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('USER'), // ADMIN, USER, MITRA
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  phone: text('phone'),
  avatar: text('avatar'),
  bio: text('bio'),
  address: text('address'),
  city: text('city'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const mitraProfiles = pgTable('mitra_profiles', {
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
  operatingHours: jsonb('operating_hours'),
  timezone: text('timezone').default('Asia/Jakarta'),
  isPublic: boolean('is_public').notNull().default(false),
  status: text('status').notNull().default('PENDING'),
  moderationReason: text('moderation_reason'),
  moderatedBy: text('moderated_by'),
  moderatedAt: timestamp('moderated_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('mitra_status_idx').on(table.status),
  index('mitra_public_idx').on(table.isPublic),
  index('mitra_category_idx').on(table.category),
  index('mitra_created_at_idx').on(table.createdAt)
]);

export const products = pgTable('products', {
  id: text('id').primaryKey(),
  mitraId: text('mitra_id').notNull().references(() => mitraProfiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  price: integer('price').notNull(),
  stock: integer('stock').notNull().default(0),
  category: text('category'),
  image: text('image'),
  gallery: jsonb('gallery'),
  isPublic: boolean('is_public').notNull().default(true),
  status: text('status').notNull().default('PUBLISHED'),
  moderationReason: text('moderation_reason'),
  moderatedBy: text('moderated_by'),
  moderatedAt: timestamp('moderated_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('product_mitra_idx').on(table.mitraId),
  index('product_status_idx').on(table.status),
  index('product_category_idx').on(table.category),
  index('product_public_idx').on(table.isPublic),
  index('product_created_at_idx').on(table.createdAt)
]);

export const partnerships = pgTable('partnerships', {
  id: text('id').primaryKey(),
  requesterId: text('requester_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  partnerId: text('partner_id').notNull().references(() => mitraProfiles.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  shortDescription: text('short_description'),
  image: text('image'),
  benefits: jsonb('benefits'),
  contactLabel: text('contact_label'),
  contactUrl: text('contact_url'),
  isPublic: boolean('is_public').notNull().default(false),
  status: text('status').notNull().default('PENDING'),
  moderationReason: text('moderation_reason'),
  moderatedBy: text('moderated_by'),
  moderatedAt: timestamp('moderated_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('partnership_status_idx').on(table.status),
  index('partnership_public_idx').on(table.isPublic),
  index('partnership_created_at_idx').on(table.createdAt)
]);

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: text('resource_id'),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  metadata: jsonb('metadata'),
});

export const analyticsEvents = pgTable('analytics_events', {
  id: text('id').primaryKey(),
  event: text('event').notNull(),
  resourceType: text('resource_type'),
  resourceId: text('resource_id'),
  sessionId: text('session_id'),
  metadata: jsonb('metadata'),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
}, (table) => [
  index('analytics_event_idx').on(table.event),
  index('analytics_resource_idx').on(table.resourceType, table.resourceId),
  index('analytics_timestamp_idx').on(table.timestamp)
]);

// --- New Tables for AI Architecture ---

export const conversations = pgTable('conversations', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => mitraProfiles.id, { onDelete: 'cascade' }),
  userId: text('user_id'), // optional if guest
  status: text('status').notNull().default('ACTIVE'), // ACTIVE, RESOLVED, HANDOFF
  summary: text('summary'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('conversation_tenant_idx').on(table.tenantId)
]);

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // user, assistant, system, tool
  content: text('content').notNull(),
  tokensUsed: integer('tokens_used').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('message_conversation_idx').on(table.conversationId)
]);

export const agentLogs = pgTable('agent_logs', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => mitraProfiles.id, { onDelete: 'cascade' }),
  requestId: text('request_id').notNull(),
  agentType: text('agent_type').notNull(), // ROUTER, FAQ, PRODUCT, etc.
  latencyMs: integer('latency_ms').notNull(),
  status: text('status').notNull(), // SUCCESS, ERROR
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const rlhfFeedback = pgTable('rlhf_feedback', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id'),
  tenantId: text('tenant_id').notNull(),
  userMessage: text('user_message').notNull(),
  assistantMessage: text('assistant_message').notNull(),
  score: integer('score').notNull(), // +1 (helpful), -1 (unhelpful)
  category: text('category'), // FRIENDLINESS, ACCURACY, RELEVANCE, ETC.
  feedbackText: text('feedback_text'),
  userTokens: text('user_tokens'), // JSON array of tokenized user words
  userTokenCount: integer('user_token_count').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('rlhf_tenant_idx').on(table.tenantId),
  index('rlhf_score_idx').on(table.score),
  index('rlhf_created_idx').on(table.createdAt)
]);

