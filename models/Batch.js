const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema(
  {
    batchCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    batchName: {
      type: String,
      required: true,
      trim: true,
    },

    course: {
      type: String,
      required: true,
      trim: true,
    },

    courseName: {
      type: String,
      trim: true,
    },

    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      default: null,
    },

    facultyName: {
      type: String,
      trim: true,
    },

    branch: {
      type: String,
      required: true,
      trim: true,
    },

    timing: {
      type: String,
      trim: true,
    },

    days: {
      type: String,
      trim: true,
    },

    mode: {
      type: String,
      enum: ["Online", "Offline", "Hybrid", ""],
      default: "",
    },

    capacity: {
      type: Number,
      default: 0,
    },

    enrolled: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Batch", batchSchema);