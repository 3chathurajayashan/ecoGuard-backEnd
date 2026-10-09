export const requireAuth = (req, res, next) => {
  req.user = { id: '64d2b2f8e4b0123456789abc', role: 'ranger' };
  req.session = { user: req.user };
  next();
};

export const allowRoles = (...roles) => {
  return (req, res, next) => {
    req.user = { id: '64d2b2f8e4b0123456789abc', role: 'ranger' };
    req.session = { user: req.user };
    next();
  };
};