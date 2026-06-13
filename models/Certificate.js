const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema(
  {
    certificateId: {
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

    courseCompleted: {
      type: String,
      trim: true,
      default: "",
    },

    type: {
      type: String,
      enum: [
        "Course Completion",
        "Participation",
        "Achievement",
        "Performance",
        "Arangetram",
        "Merit Certificate",
      ],
      required: true,
    },

    issueDate: {
      type: String,
      default: () => new Date().toISOString().split("T")[0],
    },

    date: {
      type: String,
      default: () => new Date().toISOString().split("T")[0],
    },

    facultyApproval: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedByName: {
      type: String,
      default: "",
    },

    approvedAt: {
      type: String,
      default: "",
    },

    certificateFile: {
      type: String,
      default: "",
    },

    certificateFileName: {
      type: String,
      default: "",
    },

    certificatePdf: {
      type: String,
      default: "",
    },

    certificatePdfName: {
      type: String,
      default: "",
    },

    qrCode: {
      type: String,
      default: "",
    },

    qrCodeName: {
      type: String,
      default: "",
    },

    remarks: String,

    status: {
      type: String,
      enum: ["Generated", "Issued", "Cancelled"],
      default: "Generated",
    },

    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    generatedByName: String,
  },
  { timestamps: true }
);

certificateSchema.pre("save", function (next) {
  if (!this.issueDate && this.date) {
    this.issueDate = this.date;
  }

  if (!this.date && this.issueDate) {
    this.date = this.issueDate;
  }

  if (!this.certificatePdf && this.certificateFile) {
    this.certificatePdf = this.certificateFile;
  }

  if (!this.certificateFile && this.certificatePdf) {
    this.certificateFile = this.certificatePdf;
  }

  if (!this.certificatePdfName && this.certificateFileName) {
    this.certificatePdfName = this.certificateFileName;
  }

  if (!this.certificateFileName && this.certificatePdfName) {
    this.certificateFileName = this.certificatePdfName;
  }

  
});

module.exports = mongoose.model("Certificate", certificateSchema);