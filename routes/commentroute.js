const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const {
  addComment,
  getCommentsByTask,
} = require("../controllers/commentcontroller");
const requirePermission = require("../middleware/requirePermission")
// Add comment
router.post("/task/:taskId", protect,requirePermission("task.comment"),
 addComment);

// Get comments for a task
router.get("/task/:taskId", protect,requirePermission("task.read"),
 getCommentsByTask);

module.exports = router;
