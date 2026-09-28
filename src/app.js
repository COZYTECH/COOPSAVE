const express = require("express");
const routes = require("./routes");
const apiResponse = require("./utils/apiResponse");
const securityMiddleware = require("./middleware/securityMiddleware");
const bodyParserMiddleware = require("./middleware/bodyParserMiddleware");
const notFoundHandler = require("./middleware/notFoundHandler");
const errorHandler = require("./middleware/errorHandler");
const requestId = require('./middleware/requestId');
const env = require('./config/env');
const { globalLimiter, getRateLimitStatus } = require('./middleware/rateLimitMiddleware');

const app = express();

app.set("trust proxy", env.trustProxy);

app.use(requestId);
app.use(securityMiddleware);
app.use('/api', globalLimiter);
app.use(
  [
    "/api/webhooks/flutterwave",
    "/api/v1/webhooks/flutterwave"
  ],
  express.raw({ type: "application/json", limit: "1mb" }),
);
app.use(bodyParserMiddleware);

app.get("/health", (req, res) => {
  return apiResponse.success(res, 200, "CoopSave API is healthy.", {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    rateLimit: getRateLimitStatus(),
  });
});

app.use("/api/v1", routes);
app.use("/api", routes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
