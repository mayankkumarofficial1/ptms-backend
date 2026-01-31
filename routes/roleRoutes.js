const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const requirePermission = require("../middleware/requirePermission");
const {
  getAllRoles,
  createRole,
  updateRolePermissions,
} = require("../controllers/roleController");

console.log("authMiddleware:", typeof authMiddleware);
console.log("requirePermission:", typeof requirePermission);
console.log("getAllRoles:", typeof getAllRoles);

router.get(
  "/",
  protect,
  requirePermission("role.read"),
  getAllRoles
);

router.post(
  "/",
  protect,
  requirePermission("role.create"),
  createRole
);


router.patch(
  "/:id",
  protect,
  requirePermission("role.update"),
  updateRolePermissions
);

module.exports = router;
