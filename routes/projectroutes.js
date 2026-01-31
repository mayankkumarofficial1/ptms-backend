const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  updateProjectStatus,
  getProjectReport,
  addProjectMember,
} = require("../controllers/projectcontroller");

const { removeProjectMember } = require("../controllers/projectcontroller");
const { changeProjectManager } = require("../controllers/projectcontroller");
const { deleteProject } = require("../controllers/projectcontroller");
const requirePermission = require("../middleware/requirePermission")

// Create project
router.post("/", protect,requirePermission("project.create"), createProject);

// List projects
router.get("/", protect,requirePermission("project.read"), getProjects);

// Get single project
router.get("/:id", protect,requirePermission("project.read"), getProjectById);

// Update project details
router.patch("/:id", protect,requirePermission("project.update"), updateProject);

// Update project status
router.patch("/:id/status", protect, updateProjectStatus);

// Get project report
router.get("/:id/report", protect,requirePermission("report.view"), getProjectReport);

// ✅ Add project member (ADMIN only)
router.patch("/:id/members", protect, requirePermission(), addProjectMember);

// ✅ Remove project member (ADMIN only)
router.delete(
  "/:projectId/members/:userId",
  protect,
  requirePermission(),
  removeProjectMember
);

// ✅ Change project manager (ADMIN only)
router.patch(
  "/:id/manager",
  protect,
  requirePermission(),
  changeProjectManager
);

// ✅ Delete project (ADMIN only)
router.delete(
  "/:id",
  protect,
  requirePermission(),
  deleteProject
);



module.exports = router;
