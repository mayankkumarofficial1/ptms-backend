const Role = require("../models/Role");

const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ name: 1 });
    res.json({ roles });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch roles" });
  }
};

const validatePermissions = require("../utils/validatePermissions");

const createRole = async (req, res) => {
  try {
    let { name, permissions } = req.body;

    if (!name || !Array.isArray(permissions)) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    name = name.trim().toUpperCase();

    if (name === "ADMIN") {
      return res.status(403).json({
        message: "ADMIN role cannot be created",
      });
    }

    const exists = await Role.findOne({ name });
    if (exists) {
      return res.status(400).json({ message: "Role already exists" });
    }

    if (!validatePermissions(permissions)) {
      return res.status(400).json({
        message: "Invalid permissions detected",
      });
    }

    const role = await Role.create({
      name,
      permissions,
      isSystemRole: false,
    });

    res.status(201).json({ role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create role" });
  }
};

const updateRolePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ message: "Permissions must be an array" });
    }

    const role = await Role.findById(id);

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    if (role.isSystemRole) {
      return res.status(403).json({
        message: "System roles cannot be modified",
      });
    }

    if (!validatePermissions(permissions)) {
      return res.status(400).json({
        message: "Invalid permissions detected",
      });
    }

    role.permissions = permissions;
    await role.save();

    res.json({ role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update role" });
  }
};


module.exports = {
  getAllRoles,
    createRole,
    updateRolePermissions,
};
