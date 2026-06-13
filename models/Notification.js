const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    notificationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: [
        "Attendance Alert",
        "Fee Reminder",
        "Fee Approved",
        "Fee Rejected",
        "Event Notice",
        "Event Announcement",
        "Exam Notice",
        "Exam Scheduled",
        "Exam Result Published",
        "Certificate Issued",
        "Holiday Notice",
        "General Announcement",
      ],
      default: "General Announcement",
    },

    audience: {
      type: String,
      enum: [
        "All",
        "Students",
        "Parents",
        "Faculty",
        "Branch Admin",
        "Specific",
        "Specific Student",
        "Specific Faculty",
        "Specific Batch",
        "Specific Branch",
      ],
      default: "All",
    },

    branch: {
      type: String,
      default: "All",
      trim: true,
    },

    batch: {
      type: String,
      default: "",
      trim: true,
    },

    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    recipientName: {
      type: String,
      default: "",
    },

    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
    },

    sendType: {
      type: String,
      enum: ["Send Now", "Schedule Later"],
      default: "Send Now",
    },

    date: {
      type: String,
      default: () => new Date().toISOString().split("T")[0],
    },

    scheduledDate: {
      type: String,
      default: "",
    },

    scheduledTime: {
      type: String,
      default: "",
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    readAt: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["Active", "Inactive", "Draft", "Scheduled", "Sent"],
      default: "Active",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    createdByName: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);