const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    notificationId: {
      type: String,
      required: true,
      unique: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: [
        "Fee Reminder",
        "Event Notice",
        "General Announcement",
        "Exam Notice",
        "Holiday Notice",
      ],
      default: "General Announcement",
    },

    audience: {
      type: String,
      enum: ["All", "Students", "Parents", "Faculty", "Branch Admin", "Specific"],
      default: "All",
    },

    branch: {
      type: String,
      default: "All",
    },

    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    recipientName: String,

    date: {
      type: String,
      default: () => new Date().toISOString().split("T")[0],
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);