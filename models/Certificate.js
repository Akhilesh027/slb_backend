const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema(
  {
    certificateId: {
      type: String,
      required: true,
      unique: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    studentName: String,
    studentCode: String,

    branch: {
      type: String,
      required: true,
    },

    course: String,

    type: {
      type: String,
      enum: [
        "Course Completion",
        "Participation",
        "Achievement",
        "Performance",
      ],
      required: true,
    },

    date: {
      type: String,
      default: () => new Date().toISOString().split("T")[0],
    },

    qrCode: String,

    status: {
      type: String,
      enum: ["Generated", "Issued", "Cancelled"],
      default: "Generated",
    },

    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Certificate", certificateSchema);