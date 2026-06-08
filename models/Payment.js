const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    paymentId: {
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

    amount: {
      type: Number,
      required: true,
    },

    mode: {
      type: String,
      enum: ["Cash", "UPI", "Bank Transfer", "Card"],
      required: true,
    },

    transaction: String,
    date: String,

    proof: String,
    proofFileName: String,

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },

    remarks: String,

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    verifiedAt: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);