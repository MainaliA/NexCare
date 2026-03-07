let authMiddleware;

try {
  const authModule = require("./auth");

  if (typeof authModule === "function") {
    // Direct export: module.exports = function(req, res, next) {...}
    authMiddleware = authModule;
  } else if (typeof authModule === "object") {
    // Named export — try common names
    authMiddleware =
      authModule.authMiddleware ||
      authModule.auth ||
      authModule.verifyToken ||
      authModule.protect ||
      authModule.authenticate ||
      authModule.requireAuth ||
      authModule.default;

    if (!authMiddleware) {
      // Last resort: find the first function in the exports
      const firstFn = Object.values(authModule).find(v => typeof v === "function");
      if (firstFn) {
        authMiddleware = firstFn;
        console.log(`[auth-compat] Resolved auth middleware from export key: ${
          Object.keys(authModule).find(k => authModule[k] === firstFn)
        }`);
      }
    }
  }
} catch (error) {
  console.warn("[auth-compat] Could not load ../middleware/auth:", error.message);
}

// Fallback: if Person A's auth middleware doesn't exist yet,
// use a passthrough that logs a warning (for development only)
if (!authMiddleware) {
  console.warn("[auth-compat] ⚠️  No auth middleware found — using PASSTHROUGH (dev only!)");
  console.warn("[auth-compat] Make sure Person A creates server/middleware/auth.js");
  authMiddleware = (req, res, next) => {
    // In dev/demo mode, fake a user so routes don't crash
    if (!req.user) {
      req.user = {
        id: "demo-patient-id",
        name: "Demo User",
        email: "demo@demo.com",
        role: "patient",
      };
      console.warn("[auth-compat] Injected demo user — replace with real auth before demo!");
    }
    next();
  };
}

module.exports = { authMiddleware };
