import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

/** API Express sans serveur d’écoute, utilisable par les fonctions Netlify. */
export function createNetlifyApp() {
  const app = express();
  app.set("trust proxy", true);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  const trpcMiddleware = createExpressMiddleware({ router: appRouter, createContext });
  app.use("/api/trpc", trpcMiddleware);
  app.use("/.netlify/functions/api/trpc", trpcMiddleware);
  return app;
}
