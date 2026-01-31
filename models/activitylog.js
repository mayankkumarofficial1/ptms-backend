const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ["PROJECT", "TASK", "COMMENT"],
      required: true,
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    action: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      default: "",
    },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ActivityLog", activityLogSchema);
