import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// Frontend and API are served from the same origin via the workspace proxy
// (path-based routing), so CORS should never need to wildcard with credentials.
// Restrict to an explicit allowlist of known Replit domains.
const allowedOrigins = new Set<string>();
for (const d of (process.env.REPLIT_DOMAINS ?? "").split(",")) {
  const t = d.trim();
  if (t) allowedOrigins.add(`https://${t}`);
}
const devDomain = process.env.REPLIT_DEV_DOMAIN?.trim();
if (devDomain) allowedOrigins.add(`https://${devDomain}`);

app.use(
  cors({
    credentials: true,
    origin: (origin, cb) => {
      // Same-origin requests have no Origin header; allow them.
      if (!origin) return cb(null, true);
      if (allowedOrigins.has(origin)) return cb(null, true);
      return cb(new Error("Origin not allowed by CORS"));
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

export default app;
