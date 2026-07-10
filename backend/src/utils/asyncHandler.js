/**
 * Wraps an async route handler so thrown errors / rejected promises
 * are forwarded to Express's error-handling middleware instead of
 * crashing the process or requiring a try/catch in every controller.
 */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
