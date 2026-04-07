function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.statusCode || err.status || 500;
  const isProd = process.env.NODE_ENV === "production";

  const safeMessage =
    status >= 500 && isProd ? "Internal Server Error" : err.message || "Internal Server Error";

  const body = { error: safeMessage };

  if (!isProd && err.stack) {
    body.stack = err.stack;
  }

  res.status(status).json(body);
}

module.exports = { errorHandler };
