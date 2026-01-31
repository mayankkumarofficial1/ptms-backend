const Task = require("../models/Task");
const Project = require("../models/Project");
const User = require("../models/User");
const { logActivity } = require("../utils/logactivity");
const Comment = require("../models/Comment");
const ActivityLog = require("../models/activitylog");

// POST /api/tasks
const createTask = async (req, res) => {
  try {
    const {
      projectId,
      title,
      description,
      priority,
      assignedToId,
      dueDate,
      estimatedTime,
      dependsOnTaskId,
      dependencyReason,
    } = req.body;

    // Only Admin or Manager can create tasks
    // if (req.user.role !== "ADMIN" && req.user.role !== "MANAGER") {
    //   return res.status(403).json({ message: "Access denied" });
    // }

    if (!projectId || !title || !assignedToId || !dueDate) {
      return res.status(400).json({
        message: "projectId, title, assignedToId, dueDate are required",
      });
    }

    // Check project exists
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Manager can create tasks only in their own project
    // if (
    //   req.user.role === "MANAGER" &&
    //   project.manager.toString() !== req.user._id.toString()
    // ) {
    //   return res.status(403).json({
    //     message: "Access denied: not your project",
    //   });
    // }

    // Check assigned user exists
    const assignedUser = await User.findById(assignedToId);
    if (!assignedUser)
      return res.status(404).json({ message: "Assigned user not found" });

    // Dependency validation
    let dependsOnTask = null;
    if (dependsOnTaskId) {
      const depTask = await Task.findById(dependsOnTaskId);
      if (!depTask) {
        return res.status(404).json({ message: "Dependency task not found" });
      }

      // dependency must be from same project
      if (depTask.project.toString() !== projectId.toString()) {
        return res.status(400).json({
          message: "Dependency task must belong to the same project",
        });
      }

      dependsOnTask = dependsOnTaskId;

      // If dependency exists, reason should be provided
      if (!dependencyReason || dependencyReason.trim() === "") {
        return res.status(400).json({
          message: "dependencyReason is required when dependsOnTaskId is provided",
        });
      }
    }

    // Create task
    const task = await Task.create({
      project: projectId,
      title,
      description: description || "",
      priority: priority || "MEDIUM",
      assignedTo: assignedToId,
      dueDate,
      estimatedTime: estimatedTime || 0,
      dependsOnTask,
      dependencyReason: dependencyReason || "",
    });

    // Auto-add assigned user to project members (if not already)
    const alreadyMember = project.members.some(
      (m) => m.toString() === assignedToId.toString()
    );

    if (!alreadyMember) {
      project.members.push(assignedToId);
      await project.save();
    }

    await logActivity({
      entityType: "TASK",
      entityId: task._id,
      projectId: projectId,
      action: "TASK_CREATED",
      message: `Task created: ${task.title}`,
      performedBy: req.user._id,
      });


    return res.status(201).json({
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    console.error("Create task error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};


// GET /api/tasks/project/:projectId
const getTasksByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Permission checks
    // if (req.user.role === "MANAGER") {
    //   if (project.manager.toString() !== req.user._id.toString()) {
    //     return res.status(403).json({ message: "Access denied" });
    //   }
    // }

    // if (req.user.role === "EMPLOYEE") {
    //   const isMember = project.members.some(
    //     (m) => m.toString() === req.user._id.toString()
    //   );
    //   if (!isMember) {
    //     return res.status(403).json({ message: "Access denied" });
    //   }
    // }

    const tasks = await Task.find({ project: projectId })
      .populate("assignedTo", "name email role")
      .populate("dependsOnTask", "title status");

    // Add overdue flag (computed)
    const tasksWithOverdue = tasks.map((t) => {
      const isOverdue = new Date(t.dueDate) < new Date() && t.status !== "DONE";
      return { ...t.toObject(), isOverdue };
    });

    return res.status(200).json({
      count: tasksWithOverdue.length,
      tasks: tasksWithOverdue,
    });
  } catch (error) {
    console.error("Get tasks by project error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};


// GET /api/tasks/my
const getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user._id })
      .populate("project", "name status expectedCompletionDate")
      .populate("dependsOnTask", "title status");

    const tasksWithOverdue = tasks.map((t) => {
      const isOverdue = new Date(t.dueDate) < new Date() && t.status !== "DONE";
      return { ...t.toObject(), isOverdue };
    });

    return res.status(200).json({
      count: tasksWithOverdue.length,
      tasks: tasksWithOverdue,
    });
  } catch (error) {
    console.error("Get my tasks error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/tasks/:id/status
const updateTaskStatus = async (req, res) => {
  try {
    const { status, dependencyReason } = req.body;

    const allowedStatuses = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const project = await Project.findById(task.project);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Permission:
    // Admin always allowed
    // Assigned user allowed
    // Manager of that project allowed
    const isAssignedUser = task.assignedTo.toString() === req.user._id.toString();


    const isProjectManager = project.manager.toString() === req.user._id.toString();

    // if (req.user.role !== "ADMIN" && !isAssignedUser && !isProjectManager) {
    //   return res.status(403).json({ message: "Access denied" });
    // }

    // Dependency rule
    if ((status === "IN_PROGRESS" || status === "DONE") && task.dependsOnTask) {
      const depTask = await Task.findById(task.dependsOnTask);
      if (depTask && depTask.status !== "DONE") {
        return res.status(400).json({
          message: "Cannot start task until dependency task is DONE",
        });
      }
    }

    // Blocked rule
    if (status === "BLOCKED") {
      if (!dependencyReason || dependencyReason.trim() === "") {
        return res.status(400).json({
          message: "dependencyReason is required when status is BLOCKED",
        });
      }
      task.dependencyReason = dependencyReason;
    }

    // If status changed away from BLOCKED, optionally clear reason
    if (status !== "BLOCKED") {
      // keep reason if you want history, but for MVP we can clear:
      // task.dependencyReason = "";
    }
    const oldStatus = task.status; //before changing status, store old status

    task.status = status;
    await task.save();

    await logActivity({ // log the status change
      entityType: "TASK",
      entityId: task._id,
      projectId: project._id,
      action: "STATUS_CHANGED",
      message: `Task status changed: ${task.title} (${oldStatus} → ${status})`,
      performedBy: req.user._id,
    });


    return res.status(200).json({
      message: "Task status updated",
      task,
    });
  } catch (error) {
    console.error("Update task status error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/tasks/:id/assign
const reassignTask = async (req, res) => {
  try {
    const { assignedToId } = req.body;

    if (!assignedToId) {
      return res.status(400).json({ message: "assignedToId is required" });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const project = await Project.findById(task.project);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Only Admin or project manager can reassign
    const isProjectManager = project.manager.toString() === req.user._id.toString();
    // if (req.user.role !== "ADMIN" && !isProjectManager) {
    //   return res.status(403).json({ message: "Access denied" });
    // }

    const newUser = await User.findById(assignedToId);
    if (!newUser) return res.status(404).json({ message: "User not found" });

    const oldAssignedTo = task.assignedTo.toString();
    task.assignedTo = assignedToId;
    await task.save();

    // Auto-add to project members
    const alreadyMember = project.members.some(
      (m) => m.toString() === assignedToId.toString()
    );
    if (!alreadyMember) {
      project.members.push(assignedToId);
      await project.save();
    }
    oldAssignedToname = await User.findById(oldAssignedTo).then(u => u ? u.name : "Unassigned");
    await logActivity({
      entityType: "TASK",
      entityId: task._id,
      projectId: project._id,
      action: "ASSIGNMENT_CHANGED",
      message: `Task reassigned (${oldAssignedToname || "Unassigned"} → ${newUser?.name || "Unknown"})`,
      performedBy: req.user._id,
    });

    return res.status(200).json({
      message: "Task reassigned successfully",
      task,
    });
  } catch (error) {
    console.error("Reassign task error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/tasks/:id/dependency
const updateTaskDependency = async (req, res) => {
  try {
    const { dependsOnTaskId, dependencyReason } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const project = await Project.findById(task.project);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const isProjectManager = project.manager.toString() === req.user._id.toString();
    // if (req.user.role !== "ADMIN" && !isProjectManager) {
    //   return res.status(403).json({ message: "Access denied" });
    // }

    if (!dependsOnTaskId) {
      return res.status(400).json({ message: "dependsOnTaskId is required" });
    }

    if (!dependencyReason || dependencyReason.trim() === "") {
      return res.status(400).json({ message: "dependencyReason is required" });
    }

    const depTask = await Task.findById(dependsOnTaskId);
    if (!depTask) return res.status(404).json({ message: "Dependency task not found" });

    if (depTask.project.toString() !== task.project.toString()) {
      return res.status(400).json({
        message: "Dependency task must belong to same project",
      });
    }

    // prevent self dependency
    if (depTask._id.toString() === task._id.toString()) {
      return res.status(400).json({ message: "Task cannot depend on itself" });
    }

    task.dependsOnTask = dependsOnTaskId;
    task.dependencyReason = dependencyReason;

    await task.save();

    await logActivity({
      entityType: "TASK",
      entityId: task._id,
      projectId: project._id,
      action: "DEPENDENCY_UPDATED",
      message: `Dependency updated for task: ${task.title}`,
      performedBy: req.user._id,
    });

    return res.status(200).json({
      message: "Task dependency updated",
      task,
    });
  } catch (error) {
    console.error("Update dependency error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/tasks/:id/dependency
const removeTaskDependency = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const project = await Project.findById(task.project);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const isProjectManager = project.manager.toString() === req.user._id.toString();
    // if (req.user.role !== "ADMIN" && !isProjectManager) {
    //   return res.status(403).json({ message: "Access denied" });
    // }

    task.dependsOnTask = null;
    task.dependencyReason = "";
    await task.save();

    await logActivity({
      entityType: "TASK",
      entityId: task._id,
      projectId: project._id,
      action: "DEPENDENCY_REMOVED",
      message: `Dependency removed for task: ${task.title}`,
      performedBy: req.user._id,
    });

    return res.status(200).json({
      message: "Task dependency removed",
      task,
    });
  } catch (error) {
    console.error("Remove dependency error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const deleteTask = async (req, res) => {
  const { id } = req.params;

  const task = await Task.findById(id);
  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  // Only ADMIN or MANAGER can delete tasks
  // if (req.user.role !== "ADMIN" && req.user.role !== "MANAGER") {
  //   return res.status(403).json({ message: "Not allowed to delete tasks" });
  // }

  // remove comments of this task
  await Comment.deleteMany({ task: task._id });

  // remove activity logs of this task
  await ActivityLog.deleteMany({ entityType: "TASK", entityId: task._id });

  // remove dependency references (tasks depending on this task)
  await Task.updateMany(
    { dependsOnTask: task._id },
    { $unset: { dependsOnTask: "", dependencyReason: "" } }
  );

  await task.deleteOne();

  // log deletion in project logs
  await ActivityLog.create({
    entityType: "PROJECT",
    entityId: task.project,
    action: "TASK_DELETED",
    message: `Task deleted: ${task.title}`,
    performedBy: req.user.id,
    project: task.project,

  });

  return res.status(200).json({ message: "Task deleted successfully" });
};

module.exports = { createTask, getTasksByProject, getMyTasks, updateTaskStatus, reassignTask, updateTaskDependency, removeTaskDependency, deleteTask };