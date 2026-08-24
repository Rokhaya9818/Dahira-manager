import serverless from "serverless-http";
import { createNetlifyApp } from "../../server/netlifyApp";

const app = createNetlifyApp();

/** Point d’entrée unique pour les routes API Netlify, dont /api/trpc. */
export const handler = serverless(app);
