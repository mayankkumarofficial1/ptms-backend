const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    description: { type: String, default: "" },

    status: {
      type: String,
      enum: ["ACTIVE", "ON_HOLD", "COMPLETED"],
      default: "ACTIVE",
    },

    // One project has one manager
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Employees working on project (auto-added when tasks assigned)
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Expected completion date of project
    expectedCompletionDate: {
      type: Date,
      required: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", projectSchema);
