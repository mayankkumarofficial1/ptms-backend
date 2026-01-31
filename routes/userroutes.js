const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const {
  updateUserPermissions,
  createUser,
  getAllUsers,
  toggleUserActive,
} = require("../controllers/usercontroller");

const requirePermission = require("../middleware/requirePermission")

// GET /api/users/me (any logged in user)
router.get("/me", protect, (req, res) => {
  res.json({
    message: "User Profile Fetched ✅",
    user: req.user,
  });
});

// POST /api/users (admin only)
router.post("/", protect, requirePermission("user.create"), createUser);

// GET /api/users (admin only)
router.get("/", protect, requirePermission("user.read"), getAllUsers);

// PATCH /api/users/:id/toggle-active (admin only)
router.patch("/:id/toggle-active", protect, requirePermission("user.update"), toggleUserActive);

router.patch(
  "/:id/permissions",
  protect,
  requirePermission("user.update"),
  updateUserPermissions
);


module.exports = router;
