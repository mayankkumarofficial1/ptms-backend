const Project = require("../models/Project");
const User = require("../models/User");
const Task = require("../models/Task");
const Comment = require("../models/Comment");
const ActivityLog = require("../models/activitylog");
// POST /api/projects
const createProject = async (req, res) => {
  try {
    const { name, description, managerId } = req.body;

    if (!name || !managerId) {
      return res.status(400).json({
        message: "name, managerId are required",
      });
    }

    // Only ADMIN or MANAGER can create project
    // if (req.user.role !== "ADMIN" && req.user.role !== "MANAGER") {
    //   return res.status(403).json({ message: "Access denied" });
    // }

    const manager = await User.findById(managerId);
    if (!manager) {
      return res.status(404).json({ message: "Manager not found" });
    }

    // ManagerId must be MANAGER (or ADMIN if you want admin as manager)
    if (manager.role == "EMPLOYEE") {
      return res.status(400).json({
        message: "managerId must belong to a MANAGER or ADMIN",
      });
    }

    const project = await Project.create({
      name,
      description: description || "",
      manager: managerId,
      members: [], // will auto-add later when tasks assigned
    });

    return res.status(201).json({
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    console.error("Create project error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/projects
const getProjects = async (req, res) => {
  try {
    let filter = {};

    // Admin can see all projects
    // if (req.user.role === "ADMIN") {
    //   filter = {};
    // }

    // Manager can see only their projects
    // if (req.user.role === "MANAGER") {
    //   filter = { manager: req.user._id };
    // }

    // Employee can see projects where they are member
    // if (req.user.role === "EMPLOYEE") {
    //   filter = { members: req.user._id };
    // }

    const projects = await Project.find(filter).populate(
      "manager",
      "name email role",
    );

    return res.status(200).json({
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error("Get projects error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/projects/:id
const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("manager", "name email role")
      .populate("members", "name email role");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Permission:
    // Admin can view all
    // Manager can view only own projects
    // Employee can view only if member
    // if (req.user.role === "MANAGER" && project.manager._id.toString() !== req.user._id.toString()) {
    //   return res.status(403).json({ message: "Access denied" });
    // }

    // if (req.user.role === "EMPLOYEE") {
    //   // const isMember = project.members.some(
    //   //   (m) => m._id.toString() === req.user._id.toString()

    //   // );
    //   // if (!isMember) {
    //   //   return res.status(403).json({ message: "Access denied" });
    //   // }
    //   return res.status(403).json({ message: "Access denied" });
    // }

    return res.status(200).json({ project });
  } catch (error) {
    console.error("Get project by id error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/projects/:id
const updateProject = async (req, res) => {
  try {
    const { name, description } = req.body;

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Permission:
    // Admin can update any project
    // Manager can update only their own project
    // if (req.user.role === "MANAGER") {
    //   if (project.manager.toString() !== req.user._id.toString()) {
    //     return res.status(403).json({ message: "Access denied" });
    //   }
    // }

    // if (req.user.role !== "ADMIN" && req.user.role !== "MANAGER") {
    //   return res.status(403).json({ message: "Access denied" });
    // }

    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    await project.save();

    return res.status(200).json({
      message: "Project updated successfully",
      project,
    });
  } catch (error) {
    console.error("Update project error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/projects/:id/status
const updateProjectStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "status is required" });
    }

    const allowed = ["ACTIVE", "ON_HOLD", "COMPLETED"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Permission:
    // Admin can update any
    // Manager can update only their own
    // if (req.user.role === "MANAGER") {
    //   if (project.manager.toString() !== req.user._id.toString()) {
    //     return res.status(403).json({ message: "Access denied" });
    //   }
    // }

    // if (req.user.role !== "ADMIN" && req.user.role !== "MANAGER") {
    //   return res.status(403).json({ message: "Access denied" });
    // }

    project.status = status;
    await project.save();

    return res.status(200).json({
      message: "Project status updated",
      project,
    });
  } catch (error) {
    console.error("Update project status error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/projects/:id/report
// GET /api/projects/:id/report
const getProjectReport = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const projectId = req.params.id;

    const project = await Project.findById(projectId)
      .populate("manager", "name email role")
      .populate("members", "name email role");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isProjectManager =
      project.manager &&
      project.manager._id &&
      project.manager._id.toString() === req.user._id.toString();

    const isMember =
      Array.isArray(project.members) &&
      project.members.some(
        (m) => m && m._id && m._id.toString() === req.user._id.toString(),
      );

    // Permission check (optional – enable later)
    // if (
    //   !req.user.permissions?.includes("*") &&
    //   !isProjectManager &&
    //   !isMember
    // ) {
    //   return res.status(403).json({ message: "Access denied" });
    // }

    const tasks = await Task.find({ project: projectId });

    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((t) => t.status === "DONE").length;

    const blockedTasks = tasks.filter((t) => t.status === "BLOCKED");

    const overdueTasks = tasks.filter(
      (t) =>
        t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE",
    );

    const completionPercent =
      totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

    return res.status(200).json({
      project: {
        id: project._id,
        name: project.name,
        status: project.status,
        manager: project.manager,
      },
      summary: {
        totalTasks,
        doneTasks,
        completionPercent,
        blockedCount: blockedTasks.length,
        overdueCount: overdueTasks.length,
      },
      blockedTasks: blockedTasks.map((t) => ({
        id: t._id,
        title: t.title,
        dependencyReason: t.dependencyReason,
        dependsOnTask: t.dependsOnTask,
        dueDate: t.dueDate,
      })),
      overdueTasks: overdueTasks.map((t) => ({
        id: t._id,
        title: t.title,
        status: t.status,
        dueDate: t.dueDate,
      })),
    });
  } catch (error) {
    console.error("Project report error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const addProjectMember = async (req, res) => {
  const { id } = req.params; // projectId
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "userId is required" });
  }

  const project = await Project.findById(id);
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // if (user.role !== "EMPLOYEE") {
  //   return res.status(400).json({ message: "Only EMPLOYEE can be added as member" });
  // }

  // prevent duplicates
  const alreadyMember = project.members.some((m) => m.toString() === userId);
  if (alreadyMember) {
    return res
      .status(400)
      .json({ message: "User already a member of this project" });
  }

  project.members.push(userId);
  await project.save();

  const updatedProject = await Project.findById(id)
    .populate("manager", "name email role")
    .populate("members", "name email role");

  return res.status(200).json({
    message: "Member added successfully",
    project: updatedProject,
  });
};

const removeProjectMember = async (req, res) => {
  const { projectId, userId } = req.params;

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  // check if user is a member
  const isMember = project.members.some((m) => m.toString() === userId);
  if (!isMember) {
    return res
      .status(400)
      .json({ message: "User is not a member of this project" });
  }

  // IMPORTANT: check if user has tasks assigned in this project
  const assignedTaskCount = await Task.countDocuments({
    project: projectId,
    assignedTo: userId,
  });

  if (assignedTaskCount > 0) {
    return res.status(400).json({
      message:
        "Cannot remove member. User still has tasks assigned in this project.",
      assignedTaskCount,
    });
  }

  // remove from members array
  project.members = project.members.filter((m) => m.toString() !== userId);
  await project.save();

  const updatedProject = await Project.findById(projectId)
    .populate("manager", "name email role")
    .populate("members", "name email role");

  return res.status(200).json({
    message: "Member removed successfully",
    project: updatedProject,
  });
};

const changeProjectManager = async (req, res) => {
  const { id } = req.params; // projectId
  const { managerId } = req.body;

  if (!managerId) {
    return res.status(400).json({ message: "managerId is required" });
  }

  const project = await Project.findById(id);
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  const newManager = await User.findById(managerId);
  if (!newManager) {
    return res.status(404).json({ message: "Manager not found" });
  }

  if (newManager.role !== "MANAGER") {
    return res.status(400).json({ message: "Selected user is not a MANAGER" });
  }

  // already assigned?
  if (project.manager?.toString() === managerId) {
    return res
      .status(400)
      .json({ message: "This manager is already assigned" });
  }

  // update manager
  project.manager = managerId;

  // recommended: ensure new manager exists in members list
  const alreadyMember = project.members?.some(
    (m) => m.toString() === managerId,
  );
  if (!alreadyMember) {
    project.members.push(managerId);
  }

  await project.save();

  const updatedProject = await Project.findById(id)
    .populate("manager", "name email role")
    .populate("members", "name email role");

  return res.status(200).json({
    message: "Project manager changed successfully",
    project: updatedProject,
  });
};

const deleteProject = async (req, res) => {
  const { id } = req.params; // projectId

  const project = await Project.findById(id);
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  // 1) Find tasks of this project
  const tasks = await Task.find({ project: id }).select("_id");

  const taskIds = tasks.map((t) => t._id);

  // 2) Delete comments related to tasks
  await Comment.deleteMany({ task: { $in: taskIds } });

  // 3) Delete tasks
  await Task.deleteMany({ project: id });

  // 4) Delete activity logs (project + tasks)
  await ActivityLog.deleteMany({
    $or: [
      { entityType: "PROJECT", entityId: id },
      { entityType: "TASK", entityId: { $in: taskIds } },
    ],
  });

  // 5) Delete project
  await Project.findByIdAndDelete(id);

  return res.status(200).json({
    message: "Project and all related data deleted successfully",
  });
};

module.exports = {
  createProject,

  getProjects,

  getProjectById,

  updateProject,

  updateProjectStatus,

  getProjectReport,

  addProjectMember,

  removeProjectMember,

  changeProjectManager,

  deleteProject,
};
