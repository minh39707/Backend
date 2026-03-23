/**
 * Middleware to extract user ID from x-user-id header.
 * Does not block requests without it — routes decide if auth is required.
 */
function extractUserId(req, res, next) {
  const userId = req.headers['x-user-id'];
  req.userId = userId ?? null;
  next();
}

/**
 * Middleware to require a valid user ID.
 */
function requireUser(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required. Missing x-user-id header.' });
  }
  next();
}

module.exports = { extractUserId, requireUser };
