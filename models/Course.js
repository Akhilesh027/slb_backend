const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    courseCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    courseName: {
      type: String,
      required: true,
      trim: true,
    },

    level: {
      type: String,
      required: true,
    },

    duration: {
      type: String,
      required: true,
    },

    fee: {
      type: Number,
      default: 0,
    },

    description: String,

    syllabus: [String],

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Course", courseSchema);