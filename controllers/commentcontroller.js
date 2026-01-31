const Comment = require("../models/Comment");
const Task = require("../models/Task");
const Project = require("../models/Project");
const { logActivity } = require("../utils/logactivity");

// POST /api/comments/task/:taskId
const addComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { message } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ message: "message is required" });
    }

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const project = await Project.findById(task.project);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Permission check
    const isAssignedUser = task.assignedTo.toString() === req.user._id.toString();
    const isProjectManager = project.manager.toString() === req.user._id.toString();
    const isMember = project.members.some(
      (m) => m.toString() === req.user._id.toString()
    );

    // if (req.user.role !== "ADMIN" && !isAssignedUser && !isProjectManager && !isMember) {
    //   return res.status(403).json({ message: "Access denied" });
    // }

    const comment = await Comment.create({
      task: taskId,
      user: req.user._id,
      message,
    });

    await logActivity({ // log the comment addition
        entityType: "COMMENT",
        entityId: comment._id,
        projectId: project._id,
        action: "COMMENT_ADDED",
        message: `Comment added on task`,
        performedBy: req.user._id,
        });


    return res.status(201).json({
      message: "Comment added",
      comment,
    });
  } catch (error) {
    console.error("Add comment error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/comments/task/:taskId
const getCommentsByTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const project = await Project.findById(task.project);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Permission check
    const isAssignedUser = task.assignedTo.toString() === req.user._id.toString();
    const isProjectManager = project.manager.toString() === req.user._id.toString();
    const isMember = project.members.some(
      (m) => m.toString() === req.user._id.toString()
    );

    // if (req.user.role !== "ADMIN" && !isAssignedUser && !isProjectManager && !isMember) {
    //   return res.status(403).json({ message: "Access denied" });
    // }

    const comments = await Comment.find({ task: taskId })
      .populate("user", "name email role")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      count: comments.length,
      comments,
    });
  } catch (error) {
    console.error("Get comments error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { addComment, getCommentsByTask };
