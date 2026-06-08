const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    examId: {
      type: String,
      required: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
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
    batch: String,

    practical: {
      type: Number,
      default: 0,
    },

    theory: {
      type: Number,
      default: 0,
    },

    viva: {
      type: Number,
      default: 0,
    },

    total: {
      type: Number,
      default: 0,
    },

    grade: String,

    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Published"],
      default: "Completed",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Exam", examSchema);