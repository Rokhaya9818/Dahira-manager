import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, count, eq, gt } from "drizzle-orm";
import { memberAccounts, memberSessions, type MemberAccount } from "../drizzle/schema";
import { getDb } from "./db";

const scrypt = promisify(scryptCallback);
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

export type MemberRole = "admin" | "treasurer" | "member";

export function getMemberTokenFromCookie(cookieHeader?: string) {
  if (!cookieHeader) return undefined;
  const matched = cookieHeader.split(";").map(item => item.trim()).find(item => item.startsWith("dahira_member_session="));
  return matched ? decodeURIComponent(matched.slice("dahira_member_session=".length)) : undefined;
}

function normalizePhone(phone: string) {
  return phone.replace(/[^0-9+]/g, "");
}

export async function hashSecret(secret: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(secret, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifySecret(secret: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const derived = (await scrypt(secret, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export async function registerMemberAccount(input: { name: string; phone: string; secret: string }) {
  const db = await getDb();
  if (!db) throw new Error("La base de données est indisponible.");
  const phone = normalizePhone(input.phone);
  const [existing] = await db.select().from(memberAccounts).where(eq(memberAccounts.phone, phone)).limit(1);
  if (existing) throw new Error("Un compte existe déjà avec ce numéro.");
  const [{ total }] = await db.select({ total: count() }).from(memberAccounts);
  const isFirstAccount = Number(total) === 0;
  const role: MemberRole = isFirstAccount ? "admin" : "member";
  const status = isFirstAccount ? "approved" : "pending";
  const secretHash = await hashSecret(input.secret);
  const result = await db.insert(memberAccounts).values({
    name: input.name.trim(),
    phone,
    secretHash,
    role,
    status,
    approvedAt: isFirstAccount ? new Date() : null,
  });
  const [account] = await db.select().from(memberAccounts).where(eq(memberAccounts.id, Number(result[0].insertId))).limit(1);
  if (!account) throw new Error("Impossible de créer le compte.");
  return account;
}

export async function loginMemberAccount(phoneInput: string, secret: string) {
  const db = await getDb();
  if (!db) throw new Error("La base de données est indisponible.");
  const phone = normalizePhone(phoneInput);
  const [account] = await db.select().from(memberAccounts).where(eq(memberAccounts.phone, phone)).limit(1);
  if (!account || !(await verifySecret(secret, account.secretHash))) throw new Error("Numéro ou code secret incorrect.");
  if (account.status === "pending") throw new Error("Votre compte est en attente de validation par un administrateur.");
  if (account.status === "rejected") throw new Error("Votre demande d’inscription a été refusée.");
  const token = randomBytes(32).toString("base64url");
  await db.insert(memberSessions).values({
    accountId: account.id,
    tokenHash: await hashSecret(token),
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
  });
  return { token, account };
}

export async function getAccountForSession(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const sessions = await db.select().from(memberSessions).where(gt(memberSessions.expiresAt, new Date()));
  for (const session of sessions) {
    if (await verifySecret(token, session.tokenHash)) {
      const [account] = await db.select().from(memberAccounts).where(eq(memberAccounts.id, session.accountId)).limit(1);
      return account;
    }
  }
  return undefined;
}

export async function listPendingAccounts() {
  const db = await getDb();
  if (!db) throw new Error("La base de données est indisponible.");
  return db.select({ id: memberAccounts.id, name: memberAccounts.name, phone: memberAccounts.phone, status: memberAccounts.status, createdAt: memberAccounts.createdAt }).from(memberAccounts).where(eq(memberAccounts.status, "pending"));
}

export async function approveAccount(accountId: number) {
  const db = await getDb();
  if (!db) throw new Error("La base de données est indisponible.");
  await db.update(memberAccounts).set({ status: "approved", approvedAt: new Date() }).where(eq(memberAccounts.id, accountId));
}

export async function rejectAccount(accountId: number) {
  const db = await getDb();
  if (!db) throw new Error("La base de données est indisponible.");
  await db.update(memberAccounts).set({ status: "rejected" }).where(eq(memberAccounts.id, accountId));
}

export async function setMemberAccountRole(accountId: number, role: MemberRole) {
  const db = await getDb();
  if (!db) throw new Error("La base de données est indisponible.");
  await db.update(memberAccounts).set({ role }).where(eq(memberAccounts.id, accountId));
}

export async function requireAdmin(token: string): Promise<MemberAccount> {
  const account = await getAccountForSession(token);
  if (!account || account.role !== "admin" || account.status !== "approved") throw new Error("Accès administrateur requis.");
  return account;
}
