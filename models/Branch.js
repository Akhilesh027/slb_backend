const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema(
  {
    branchCode: {
      type: String,
      required: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    managerName: String,
    contact: String,

    students: {
      type: Number,
      default: 0,
    },

    faculty: {
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

module.exports = mongoose.model("Branch", branchSchema);