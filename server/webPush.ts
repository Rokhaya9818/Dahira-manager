import webpush from "web-push";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { webPushSettings, webPushSubscriptions } from "../drizzle/schema";
import { getDb } from "./db";
import { getAccountForSession, getMemberTokenFromCookie } from "./memberAuth";
import { publicProcedure, router } from "./_core/trpc";

const sessionInput = z.object({ token: z.string().optional() });

async function currentAccount(token: string | undefined, cookieHeader?: string) {
  const resolvedToken = token && token !== "cookie-session" ? token : getMemberTokenFromCookie(cookieHeader);
  if (!resolvedToken) throw new Error("Session membre invalide.");
  const account = await getAccountForSession(resolvedToken);
  if (!account || account.status !== "approved") throw new Error("Session membre invalide.");
  return account;
}

async function getVapidDetails() {
  const db = await getDb();
  if (!db) throw new Error("La base de données est indisponible.");
  const [existing] = await db.select().from(webPushSettings).limit(1);
  if (existing) return existing;
  const keys = webpush.generateVAPIDKeys();
  const result = await db.insert(webPushSettings).values({ publicKey: keys.publicKey, privateKey: keys.privateKey });
  const [created] = await db.select().from(webPushSettings).where(eq(webPushSettings.id, Number(result[0].insertId))).limit(1);
  if (!created) throw new Error("Impossible de créer les clés de notification.");
  return created;
}

export const webPushRouter = router({
  publicKey: publicProcedure.query(async () => ({ publicKey: (await getVapidDetails()).publicKey })),
  subscribe: publicProcedure.input(sessionInput.extend({ endpoint: z.string().url(), p256dh: z.string().min(1), auth: z.string().min(1) })).mutation(async ({ input, ctx }) => {
    const account = await currentAccount(input.token, ctx.req.headers.cookie);
    const db = await getDb(); if (!db) throw new Error("La base de données est indisponible.");
    await db.insert(webPushSubscriptions).values({ accountId: account.id, endpoint: input.endpoint, p256dh: input.p256dh, auth: input.auth, enabled: 1 });
    return { success: true } as const;
  }),
  notifyMembers: publicProcedure.input(sessionInput.extend({ title: z.string().min(1).max(90), body: z.string().min(1).max(180), url: z.string().max(160).optional() })).mutation(async ({ input, ctx }) => {
    const account = await currentAccount(input.token, ctx.req.headers.cookie);
    if (account.role !== "admin") throw new Error("Accès administrateur requis.");
    const db = await getDb(); if (!db) throw new Error("La base de données est indisponible.");
    const keys = await getVapidDetails();
    webpush.setVapidDetails("mailto:admin@dahira-manager.local", keys.publicKey, keys.privateKey);
    const subscriptions = await db.select().from(webPushSubscriptions).where(eq(webPushSubscriptions.enabled, 1));
    const payload = JSON.stringify({ title: input.title, body: input.body, url: input.url ?? "/" });
    const outcomes = await Promise.allSettled(subscriptions.map(subscription => webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload)));
    return { sent: outcomes.filter(outcome => outcome.status === "fulfilled").length, attempted: outcomes.length };
  }),
});
