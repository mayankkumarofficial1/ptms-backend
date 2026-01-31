const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { createTask,getTasksByProject,getMyTasks,updateTaskStatus,reassignTask,updateTaskDependency,removeTaskDependency } = require("../controllers/taskcontroller");
const {deleteTask} = require("../controllers/taskcontroller");
const requirePermission = require("../middleware/requirePermission")
// Create task
router.post("/", protect,requirePermission("task.create"), createTask);

// My tasks
router.get("/my", protect, getMyTasks);

// Tasks by project
router.get("/project/:projectId", protect, getTasksByProject);

// Update task status
router.patch("/:id/status", protect,requirePermission("task.update_status"), updateTaskStatus);

router.patch("/:id/assign", protect,requirePermission("task.assign"), reassignTask);
router.patch("/:id/dependency", protect,requirePermission("task.dependency"), updateTaskDependency);
router.delete("/:id/dependency", protect,requirePermission("task.dependency"), removeTaskDependency);

// Delete task
router.delete("/:id", protect, deleteTask);

module.exports = router;
