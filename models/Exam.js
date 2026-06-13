const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    examId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    examType: {
      type: String,
      enum: [
        "Theory Exam",
        "Practical Exam",
        "Monthly Assessment",
        "Annual Assessment",
        "Viva",
      ],
      default: "Monthly Assessment",
    },

    type: {
      type: String,
      default: "Monthly Assessment",
    },

    examDate: {
      type: String,
      default: "",
    },

    date: {
      type: String,
      default: "",
    },

    startTime: {
      type: String,
      default: "",
    },

    endTime: {
      type: String,
      default: "",
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
    batch: String,

    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      default: null,
    },

    facultyName: {
      type: String,
      default: "",
    },

    examiner: {
      type: String,
      default: "",
    },

    practical: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    theory: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    viva: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    total: {
      type: Number,
      default: 0,
    },

    grade: String,

    resultStatus: {
      type: String,
      enum: [
        "Scheduled",
        "Completed",
        "Published",
        "Passed",
        "Failed",
        "Needs Improvement",
      ],
      default: "Scheduled",
    },

    status: {
      type: String,
      enum: [
        "Scheduled",
        "Completed",
        "Published",
        "Passed",
        "Failed",
        "Needs Improvement",
      ],
      default: "Scheduled",
    },

    remarks: String,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    createdByName: String,
  },
  { timestamps: true }
);

examSchema.pre("save", function (next) {
  if (!this.examDate && this.date) {
    this.examDate = this.date;
  }

  if (!this.date && this.examDate) {
    this.date = this.examDate;
  }

  if (!this.examType && this.type) {
    this.examType = this.type;
  }

  if (!this.type && this.examType) {
    this.type = this.examType;
  }

  if (!this.resultStatus && this.status) {
    this.resultStatus = this.status;
  }

  if (!this.status && this.resultStatus) {
    this.status = this.resultStatus;
  }

  this.total =
    (Number(this.practical) || 0) +
    (Number(this.theory) || 0) +
    (Number(this.viva) || 0);

  if (this.total >= 90) this.grade = "A+";
  else if (this.total >= 80) this.grade = "A";
  else if (this.total >= 70) this.grade = "B";
  else if (this.total >= 60) this.grade = "C";
  else if (this.total >= 50) this.grade = "D";
  else this.grade = "Fail";

});

module.exports = mongoose.model("Exam", examSchema);