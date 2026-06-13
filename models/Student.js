const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    studentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    gender: {
      type: String,
      enum: ["Female", "Male", "Other"],
    },

    dob: String,

    parentName: {
      type: String,
      trim: true,
    },

    parentMobile: {
      type: String,
      trim: true,
    },

    studentMobile: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    address: String,

    branch: {
      type: String,
      required: true,
      trim: true,
    },

    course: {
      type: String,
      required: true,
      trim: true,
    },

    batch: {
      type: [String],
      default: [],
    },

    batchType: {
      type: String,
      enum: ["Morning", "Evening"],
      default: "Morning",
    },

    trainingMode: {
      type: String,
      enum: ["Offline", "Online", "Hybrid"],
      default: "Offline",
    },

    admissionDate: String,

    joinDate: String,

    feeStatus: {
      type: String,
      enum: ["Paid", "Pending", "Partial"],
      default: "Pending",
    },

    attendancePercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", studentSchema);