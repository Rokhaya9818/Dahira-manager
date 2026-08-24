import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { attendanceRecords, contributions, goudiEvents, memberAccounts, treasuryTransactions } from "../drizzle/schema";
import { isCheckInOpen } from "../shared/dahiraRules";
import { getDb } from "./db";
import { getAccountForSession, getMemberTokenFromCookie, type MemberRole } from "./memberAuth";
import { publicProcedure, router } from "./_core/trpc";

const sessionInput = z.object({ token: z.string().optional() });

async function requireMember(token: string | undefined, cookieHeader?: string) {
  const resolvedToken = token && token !== "cookie-session" ? token : getMemberTokenFromCookie(cookieHeader);
  if (!resolvedToken) throw new Error("Session membre invalide ou compte non approuvé.");
  const account = await getAccountForSession(resolvedToken);
  if (!account || account.status !== "approved") throw new Error("Session membre invalide ou compte non approuvé.");
  return account;
}

function requireTreasuryRole(role: MemberRole) { if (role !== "admin" && role !== "treasurer") throw new Error("Accès administrateur ou trésorier requis."); }
function requireAdminRole(role: MemberRole) { if (role !== "admin") throw new Error("Accès administrateur requis."); }
function todayAtMidnight() { const date = new Date(); date.setHours(0, 0, 0, 0); return date; }

export const dahiraRouter = router({
  members: publicProcedure.input(sessionInput).query(async ({ input, ctx }) => {
    await requireMember(input.token, ctx.req.headers.cookie);
    const db = await getDb(); if (!db) throw new Error("La base de données est indisponible.");
    const accounts = await db.select({ id: memberAccounts.id, name: memberAccounts.name, phone: memberAccounts.phone, role: memberAccounts.role, responsibility: memberAccounts.responsibility, active: memberAccounts.active, rotationIndex: memberAccounts.rotationIndex, status: memberAccounts.status }).from(memberAccounts).where(eq(memberAccounts.status, "approved"));
    const records = await db.select({ memberAccountId: attendanceRecords.memberAccountId }).from(attendanceRecords);
    const counts = new Map<number, number>();
    records.forEach(record => counts.set(record.memberAccountId, (counts.get(record.memberAccountId) ?? 0) + 1));
    return accounts.map(account => ({ ...account, attendanceCount: counts.get(account.id) ?? 0 }));
  }),
  dashboard: publicProcedure.input(sessionInput).query(async ({ input, ctx }) => {
    await requireMember(input.token, ctx.req.headers.cookie);
    const db = await getDb(); if (!db) throw new Error("La base de données est indisponible.");
    const [accounts, contributionRows, transactionRows, attendanceRows] = await Promise.all([
      db.select({ id: memberAccounts.id }).from(memberAccounts).where(and(eq(memberAccounts.status, "approved"), eq(memberAccounts.active, 1))),
      db.select({ expectedAmount: contributions.expectedAmount, paidAmount: contributions.paidAmount, status: contributions.status }).from(contributions),
      db.select({ kind: treasuryTransactions.kind, amount: treasuryTransactions.amount }).from(treasuryTransactions),
      db.select({ id: attendanceRecords.id }).from(attendanceRecords),
    ]);
    return {
      memberCount: accounts.length,
      received: contributionRows.reduce((sum, row) => sum + row.paidAmount, 0),
      expected: contributionRows.reduce((sum, row) => sum + row.expectedAmount, 0),
      treasury: transactionRows.reduce((sum, row) => sum + (row.kind === "income" ? row.amount : -row.amount), 0),
      attendanceCount: attendanceRows.length,
      paidCount: contributionRows.filter(row => row.status === "paid").length,
      pendingCount: contributionRows.filter(row => row.status === "pending").length,
      lateCount: contributionRows.filter(row => row.status === "late").length,
    };
  }),
  contributionList: publicProcedure.input(sessionInput).query(async ({ input, ctx }) => {
    const account = await requireMember(input.token, ctx.req.headers.cookie); const db = await getDb(); if (!db) throw new Error("La base de données est indisponible.");
    return account.role === "member" ? db.select().from(contributions).where(eq(contributions.memberAccountId, account.id)) : db.select().from(contributions).orderBy(desc(contributions.createdAt));
  }),
  recordContribution: publicProcedure.input(sessionInput.extend({ memberAccountId: z.number().int().positive(), period: z.string().min(3).max(32), expectedAmount: z.number().int().positive(), paidAmount: z.number().int().min(0), status: z.enum(["paid", "pending", "late"]) })).mutation(async ({ input, ctx }) => {
    const account = await requireMember(input.token, ctx.req.headers.cookie); requireTreasuryRole(account.role as MemberRole); const db = await getDb(); if (!db) throw new Error("La base de données est indisponible.");
    await db.insert(contributions).values({ memberAccountId: input.memberAccountId, period: input.period, expectedAmount: input.expectedAmount, paidAmount: input.paidAmount, status: input.status, paidAt: input.status === "paid" ? new Date() : null }); return { success: true } as const;
  }),
  treasuryList: publicProcedure.input(sessionInput).query(async ({ input, ctx }) => {
    const account = await requireMember(input.token, ctx.req.headers.cookie); requireTreasuryRole(account.role as MemberRole); const db = await getDb(); if (!db) throw new Error("La base de données est indisponible."); return db.select().from(treasuryTransactions).orderBy(desc(treasuryTransactions.occurredAt));
  }),
  recordTreasury: publicProcedure.input(sessionInput.extend({ kind: z.enum(["income", "expense"]), category: z.string().min(2).max(80), amount: z.number().int().positive(), description: z.string().min(2).max(255) })).mutation(async ({ input, ctx }) => {
    const account = await requireMember(input.token, ctx.req.headers.cookie); requireTreasuryRole(account.role as MemberRole); const db = await getDb(); if (!db) throw new Error("La base de données est indisponible."); await db.insert(treasuryTransactions).values({ kind: input.kind, category: input.category, amount: input.amount, description: input.description, createdByAccountId: account.id }); return { success: true } as const;
  }),
  goudi: publicProcedure.input(sessionInput).query(async ({ input, ctx }) => {
    const account = await requireMember(input.token, ctx.req.headers.cookie); const db = await getDb(); if (!db) throw new Error("La base de données est indisponible.");
    const members = await db.select({ id: memberAccounts.id, name: memberAccounts.name, phone: memberAccounts.phone, rotationIndex: memberAccounts.rotationIndex }).from(memberAccounts).where(and(eq(memberAccounts.status, "approved"), eq(memberAccounts.active, 1))).orderBy(memberAccounts.rotationIndex);
    const events = await db.select().from(goudiEvents).orderBy(desc(goudiEvents.scheduledFor)); const latest = events.find(event => event.organizerAccountId !== null); const lastIndex = members.findIndex(member => member.id === latest?.organizerAccountId); const suggestedOrganizer = members.length ? members[(lastIndex + 1 + members.length) % members.length] : undefined;
    return { role: account.role, suggestedOrganizer, events };
  }),
  saveGoudi: publicProcedure.input(sessionInput.extend({ organizerAccountId: z.number().int().positive(), contributionExpected: z.number().int().positive(), scheduledFor: z.number().int().positive(), status: z.enum(["proposed", "confirmed", "completed"]) })).mutation(async ({ input, ctx }) => {
    const account = await requireMember(input.token, ctx.req.headers.cookie); requireAdminRole(account.role as MemberRole); const db = await getDb(); if (!db) throw new Error("La base de données est indisponible."); await db.insert(goudiEvents).values({ organizerAccountId: input.organizerAccountId, contributionExpected: input.contributionExpected, scheduledFor: new Date(input.scheduledFor), status: input.status, createdByAccountId: account.id }); return { success: true } as const;
  }),
  attendance: publicProcedure.input(sessionInput.extend({ memberAccountId: z.number().int().positive().optional() })).query(async ({ input, ctx }) => {
    const account = await requireMember(input.token, ctx.req.headers.cookie); const db = await getDb(); if (!db) throw new Error("La base de données est indisponible."); const targetId = account.role === "member" ? account.id : input.memberAccountId; return targetId ? db.select().from(attendanceRecords).where(eq(attendanceRecords.memberAccountId, targetId)).orderBy(desc(attendanceRecords.eventDate)) : db.select().from(attendanceRecords).orderBy(desc(attendanceRecords.eventDate));
  }),
  checkIn: publicProcedure.input(sessionInput).mutation(async ({ input, ctx }) => {
    const account = await requireMember(input.token, ctx.req.headers.cookie); if (!isCheckInOpen(new Date())) throw new Error("Le pointage est ouvert uniquement le jeudi de 21 h à 23 h 59."); const db = await getDb(); if (!db) throw new Error("La base de données est indisponible."); const eventDate = todayAtMidnight(); const [existing] = await db.select().from(attendanceRecords).where(and(eq(attendanceRecords.memberAccountId, account.id), eq(attendanceRecords.eventDate, eventDate))).limit(1); if (existing) return { alreadyCheckedIn: true } as const; await db.insert(attendanceRecords).values({ memberAccountId: account.id, eventDate }); return { alreadyCheckedIn: false } as const;
  }),
});
