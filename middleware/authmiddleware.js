const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Role = require("../models/Role");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // const user = await User.findById(decoded.id).populate("roleId");
    const userId = decoded.id || decoded.userId;

    const user = await User.findById(userId).populate("roleId");

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let permissions = [];

    // Admin shortcut
    if (user.roleId.permissions.includes("*")) {
      permissions = ["*"];
    } else {
      permissions = [...user.roleId.permissions];

      // add extra permissions
      if (user.extraPermissions?.length) {
        permissions.push(...user.extraPermissions);
      }

      // remove denied permissions
      if (user.deniedPermissions?.length) {
        permissions = permissions.filter(
          (p) => !user.deniedPermissions.includes(p),
        );
      }
    }

    req.user = {
      _id: user._id, // ✅ REQUIRED
      id: user._id, // (optional, convenience)
      name: user.name,
      email: user.email,
      roleName: user.roleId.name,
      permissions,
    };

    console.log(req.user.permissions);

    next();
  } catch (err) {
    // Only log unexpected errors, not expected JWT validation failures
    if (
      !(err instanceof jwt.JsonWebTokenError) &&
      !(err instanceof jwt.TokenExpiredError)
    ) {
      console.error("Auth middleware error:", err);
    }
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = { protect };
