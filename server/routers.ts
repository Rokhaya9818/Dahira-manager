import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { approveAccount, getAccountForSession, getMemberTokenFromCookie, listPendingAccounts, loginMemberAccount, registerMemberAccount, rejectAccount, requireAdmin, setMemberAccountRole } from "./memberAuth";
import { dahiraRouter } from "./dahiraData";
import { webPushRouter } from "./webPush";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  memberAuth: router({
    register: publicProcedure.input(z.object({ name: z.string().min(2).max(160), phone: z.string().min(7).max(32), secret: z.string().min(4).max(128) })).mutation(async ({ input }) => {
      const account = await registerMemberAccount(input);
      return { id: account.id, status: account.status, role: account.role, firstAdmin: account.role === "admin" };
    }),
    login: publicProcedure.input(z.object({ phone: z.string().min(7).max(32), secret: z.string().min(4).max(128) })).mutation(async ({ input, ctx }) => {
      const { token, account } = await loginMemberAccount(input.phone, input.secret);
      ctx.res.cookie("dahira_member_session", token, { httpOnly: true, sameSite: "lax", secure: ctx.req.protocol === "https", path: "/", maxAge: 1000 * 60 * 60 * 24 * 30 });
      return { account: { id: account.id, name: account.name, phone: account.phone, role: account.role, status: account.status } };
    }),
    me: publicProcedure.input(z.object({ token: z.string().optional() })).query(async ({ input, ctx }) => {
      const token = input.token || getMemberTokenFromCookie(ctx.req.headers.cookie);
      if (!token) return null;
      const account = await getAccountForSession(token);
      if (!account) return null;
      return { id: account.id, name: account.name, phone: account.phone, role: account.role, status: account.status };
    }),
    pending: publicProcedure.input(z.object({ token: z.string().min(1) })).query(async ({ input }) => {
      await requireAdmin(input.token);
      return listPendingAccounts();
    }),
    approve: publicProcedure.input(z.object({ token: z.string().min(1), accountId: z.number().int().positive() })).mutation(async ({ input }) => {
      await requireAdmin(input.token);
      await approveAccount(input.accountId);
      return { success: true } as const;
    }),
    reject: publicProcedure.input(z.object({ token: z.string().min(1), accountId: z.number().int().positive() })).mutation(async ({ input }) => {
      await requireAdmin(input.token);
      await rejectAccount(input.accountId);
      return { success: true } as const;
    }),
    setRole: publicProcedure.input(z.object({ token: z.string().min(1), accountId: z.number().int().positive(), role: z.enum(["admin", "treasurer", "member"]) })).mutation(async ({ input }) => {
      await requireAdmin(input.token);
      await setMemberAccountRole(input.accountId, input.role);
      return { success: true } as const;
    }),
  }),
  dahira: dahiraRouter,
  webPush: webPushRouter,

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
