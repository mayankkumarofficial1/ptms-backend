const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { getProjectActivityLogs } = require("../controllers/activitycontroller");
const requirePermission = require("../middleware/requirePermission")
router.get("/project/:projectId", protect,requirePermission("activity.view"),
 getProjectActivityLogs);

module.exports = router;
