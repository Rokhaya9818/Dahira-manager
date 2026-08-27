import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const memberAccounts = mysqlTable("memberAccounts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull().unique(),
  secretHash: varchar("secretHash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "treasurer", "member"]).default("member").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  approvedAt: timestamp("approvedAt"),
  responsibility: varchar("responsibility", { length: 120 }).default("Membre actif").notNull(),
  active: int("active").default(1).notNull(),
  rotationIndex: int("rotationIndex").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const memberSessions = mysqlTable("memberSessions", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  tokenHash: varchar("tokenHash", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const contributions = mysqlTable("contributions", {
  id: int("id").autoincrement().primaryKey(),
  memberAccountId: int("memberAccountId").notNull(),
  period: varchar("period", { length: 32 }).notNull(),
  expectedAmount: int("expectedAmount").notNull(),
  paidAmount: int("paidAmount").default(0).notNull(),
  status: mysqlEnum("status", ["paid", "pending", "late"]).default("pending").notNull(),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const treasuryTransactions = mysqlTable("treasuryTransactions", {
  id: int("id").autoincrement().primaryKey(),
  kind: mysqlEnum("kind", ["income", "expense"]).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  amount: int("amount").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
  createdByAccountId: int("createdByAccountId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const goudiEvents = mysqlTable("goudiEvents", {
  id: int("id").autoincrement().primaryKey(),
  scheduledFor: timestamp("scheduledFor").notNull(),
  organizerAccountId: int("organizerAccountId"),
  contributionExpected: int("contributionExpected").notNull(),
  status: mysqlEnum("status", ["proposed", "confirmed", "completed"]).default("proposed").notNull(),
  createdByAccountId: int("createdByAccountId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const attendanceRecords = mysqlTable("attendanceRecords", {
  id: int("id").autoincrement().primaryKey(),
  memberAccountId: int("memberAccountId").notNull(),
  eventDate: timestamp("eventDate").notNull(),
  checkedInAt: timestamp("checkedInAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const webPushSubscriptions = mysqlTable("webPushSubscriptions", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: varchar("p256dh", { length: 255 }).notNull(),
  auth: varchar("auth", { length: 255 }).notNull(),
  enabled: int("enabled").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const webPushSettings = mysqlTable("webPushSettings", {
  id: int("id").autoincrement().primaryKey(),
  publicKey: text("publicKey").notNull(),
  privateKey: text("privateKey").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MemberAccount = typeof memberAccounts.$inferSelect;
