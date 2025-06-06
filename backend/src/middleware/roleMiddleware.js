module.exports = (roles) => (req, res, next) => {
  // Example: check if user has one of the allowed roles
  // You should replace this with your actual role logic
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}; 