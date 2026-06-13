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

    batchType: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner",
    },

    startDate: {
      type: String,
      default: "",
    },

    endDate: {
      type: String,
      default: "",
    },

    startTime: {
      type: String,
      trim: true,
      default: "",
    },

    endTime: {
      type: String,
      trim: true,
      default: "",
    },

    timing: {
      type: String,
      trim: true,
      default: "",
    },

    days: {
      type: [String],
      default: [],
    },

    mode: {
      type: String,
      enum: ["Online", "Offline", "Hybrid"],
      default: "Offline",
    },

    capacity: {
      type: Number,
      default: 0,
      min: 0,
    },

    enrolled: {
      type: Number,
      default: 0,
      min: 0,
    },

    availableSeats: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true }
);

batchSchema.pre("save", function (next) {
  this.availableSeats = Math.max(
    (Number(this.capacity) || 0) - (Number(this.enrolled) || 0),
    0
  );

  if (!this.timing && (this.startTime || this.endTime)) {
    this.timing = `${this.startTime || ""}${
      this.startTime && this.endTime ? " - " : ""
    }${this.endTime || ""}`;
  }

});

module.exports = mongoose.model("Batch", batchSchema);