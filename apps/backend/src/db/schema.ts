import { pgTable, pgEnum, uuid, text, timestamp, index, jsonb , doublePrecision} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['customer', 'seller', 'admin']);
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended', 'banned']);

export type Role = (typeof roleEnum.enumValues)[number];
export type UserStatus = (typeof userStatusEnum.enumValues)[number];

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    phoneNormalized: text('phone_normalized').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: roleEnum('role').notNull().default('customer'),
    status: userStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('users_status_role_idx').on(t.status, t.role)],
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('refresh_tokens_user_idx').on(t.userId)],
);

export const adminAuditLogs = pgTable(
  'admin_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminId: uuid('admin_id').notNull().references(() => users.id),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: uuid('target_id').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('audit_target_idx').on(t.targetType, t.targetId)],
);

export const approvalStatusEnum = pgEnum('approval_status', ['pending', 'approved', 'rejected']);

export const sellerProfiles = pgTable(
  'seller_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().unique().references(() => users.id),
    shopName: text('shop_name').notNull(),
    description: text('description'),
    approvalStatus: approvalStatusEnum('approval_status').notNull().default('pending'),
    rejectionReason: text('rejection_reason'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index('seller_profiles_status_idx').on(t.approvalStatus)],
);

export const reservedPhoneIdentities = pgTable('reserved_phone_identities', {
  id: uuid('id').primaryKey().defaultRandom(),
  phoneNormalized: text('phone_normalized').notNull().unique(),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});