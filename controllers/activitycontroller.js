const ActivityLog = require("../models/activitylog");
const Project = require("../models/Project");

const getProjectActivityLogs = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Permission
    const isProjectManager = project.manager.toString() === req.user._id.toString();
    const isMember = project.members.some((m) => m.toString() === req.user._id.toString());

    // if (req.user.role !== "ADMIN" && !isProjectManager && !isMember) {
    //   return res.status(403).json({ message: "Access denied" });
    // }

    const logs = await ActivityLog.find({ project: projectId })
      .populate("performedBy", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: logs.length,
      logs,
    });
  } catch (error) {
    console.error("Get activity logs error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getProjectActivityLogs };
