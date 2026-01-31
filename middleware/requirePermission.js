module.exports = (permission) => {
  return (req, res, next) => {
    // Admin shortcut
    if (req.user.permissions.includes("*")) {
      return next();
    }

    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({
        message: "Permission denied",
      });
    }

    next();
  };
};
