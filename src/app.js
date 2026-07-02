const express = require("express");
const routes = require("./routes");
const apiResponse = require("./utils/apiResponse");
const securityMiddleware = require("./middleware/securityMiddleware");
const bodyParserMiddleware = require("./middleware/bodyParserMiddleware");
const notFoundHandler = require("./middleware/notFoundHandler");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.set("trust proxy", 1);

app.use(securityMiddleware);
app.use(
  ["/api/webhooks/nomba", "/api/v1/webhooks/nomba"],
  express.raw({ type: "application/json", limit: "1mb" }),
);
app.use(bodyParserMiddleware);

app.get("/health", (req, res) => {
  return apiResponse.success(res, 200, "CoopSave API is healthy.", {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/v1", routes);
app.use("/api", routes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
