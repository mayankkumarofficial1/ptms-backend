const User = require("../models/User");
const bcrypt = require("bcrypt");
const validatePermissions = require("../utils/validatePermissions");

// POST /api/users  (Admin only)
const createUser = async (req, res) => {
  try {
    const { name, email, password, roleId } = req.body;

    if (!name || !email || !password || !roleId) {
      return res.status(400).json({
        message: "name, email, password, roleId are required",
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      roleId,
    });

    return res.status(201).json({
      message: "User created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        roleId: user.roleId,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Create user error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/users  (Admin only)
const resolvePermissions = require("../utils/resolvePermissions");

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .populate({
      path: "roleId",
      select: "name permissions isSystemRole",
      })
      .select("-password"); // hide password
    const usersWithPermissions = users.map((u) => {
      const permissions = resolvePermissions(
        u.roleId?.permissions,
        u.extraPermissions,
        u.deniedPermissions,
      );
      console.log(
        users.map((u) => ({
          user: u.name,
          role: u.roleId?.name,
          rolePermissions: u.roleId?.permissions,
        })),
      );

      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        isActive: u.isActive,
        roleId: u.roleId._id,
        roleName: u.roleId.name,
        rolePermissions: u.roleId?.permissions || [],
        permissions,
        extraPermissions: u.extraPermissions,
        deniedPermissions: u.deniedPermissions,
      };
    });
    res.json({ users: usersWithPermissions });
  } catch (error) {
    console.error("Get users error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/users/:id/toggle-active (Admin only)
const toggleUserActive = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isActive = !user.isActive;
    await user.save();

    return res.status(200).json({
      message: "User status updated",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        roleId: user.roleId,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Toggle user error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const updateUserPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { extraPermissions = [], deniedPermissions = [] } = req.body;

    if (!Array.isArray(extraPermissions) || !Array.isArray(deniedPermissions)) {
      return res.status(400).json({
        message: "Permissions must be arrays",
      });
    }

    if (
      !validatePermissions(extraPermissions) ||
      !validatePermissions(deniedPermissions)
    ) {
      return res.status(400).json({
        message: "Invalid permissions detected",
      });
    }

    const user = await User.findById(id).populate("roleId", "name permissions");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Protect ADMIN
    if (user.roleId?.permissions?.includes("*")) {
      return res.status(403).json({
        message: "Cannot modify permissions of ADMIN user",
      });
    }

    user.extraPermissions = extraPermissions;
    user.deniedPermissions = deniedPermissions;

    await user.save();

    res.json({
      message: "User permissions updated",
      user: {
        id: user._id,
        extraPermissions: user.extraPermissions,
        deniedPermissions: user.deniedPermissions,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update user permissions" });
  }
};

module.exports = {
  createUser,
  getAllUsers,
  toggleUserActive,
  updateUserPermissions,
};
