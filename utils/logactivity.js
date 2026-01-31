const ActivityLog = require("../models/activitylog");

const logActivity = async ({ entityType, entityId, projectId, action, message, performedBy }) => {
  try {
    await ActivityLog.create({
      entityType,
      entityId,
      project: projectId,
      action,
      message: message || "",
      performedBy,
    });
  } catch (err) {
    console.error("Activity log failed:", err.message);
  }
};

module.exports = { logActivity };
