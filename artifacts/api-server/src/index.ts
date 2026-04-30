import app from "./app";
import { logger } from "./lib/logger";
import { startReminderScheduler } from "./lib/notifications";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  if (process.env.RESEND_API_KEY) {
    startReminderScheduler();
    logger.info("Email reminder scheduler started");
  } else {
    logger.warn("RESEND_API_KEY not set — email scheduler disabled");
  }
});
