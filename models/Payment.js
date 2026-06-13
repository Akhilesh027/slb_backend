const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      required: true,
      unique: true,
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
      trim: true,
    },

    course: String,

    totalFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    dueAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    mode: {
      type: String,
      enum: ["Cash", "UPI", "Bank Transfer", "Card"],
      required: true,
    },

    transaction: String,

    paymentDate: {
      type: String,
      default: "",
    },

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

paymentSchema.pre("save", function (next) {
  if (!this.paymentDate && this.date) {
    this.paymentDate = this.date;
  }

  if (!this.date && this.paymentDate) {
    this.date = this.paymentDate;
  }

  if (this.totalFee > 0) {
    this.dueAmount = Math.max(this.totalFee - this.amount, 0);
  }

});

module.exports = mongoose.model("Payment", paymentSchema);