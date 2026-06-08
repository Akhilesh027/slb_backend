const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    attendanceId: {
      type: String,
      required: true,
      unique: true,
    },

    date: {
      type: String,
      required: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    studentName: String,
    studentCode: String,

    batch: String,
    course: String,
    branch: String,

    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    facultyName: String,

    mode: String,

    status: {
      type: String,
      enum: ["Present", "Absent", "Leave", "Holiday"],
      default: "Present",
    },

    remarks: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);