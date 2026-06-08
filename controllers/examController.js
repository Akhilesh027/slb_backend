const mongoose = require("mongoose");
const Exam = require("../models/Exam.js");
const Student = require("../models/Student.js");

const adminRoles = ["admin", "super_admin"];

const isAdmin = (req) => adminRoles.includes(req.user?.role);
const getUserBranch = (req) => req.user?.branch || "";

const generateExamId = async () => {
  const prefix = "SLB-EXM-";

  const lastExam = await Exam.findOne({
    examId: { $regex: `^${prefix}` },
  }).sort({ createdAt: -1 });

  let nextNumber = 1;

  if (lastExam?.examId) {
    const lastNumber = parseInt(lastExam.examId.split("-").pop(), 10);
    nextNumber = Number.isNaN(lastNumber) ? 1 : lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
};

const getGrade = (total) => {
  if (total >= 90) return "A+";
  if (total >= 80) return "A";
  if (total >= 70) return "B";
  if (total >= 60) return "C";
  if (total >= 50) return "D";
  return "Fail";
};

const findStudentSafely = async (studentId) => {
  if (!studentId) return null;

  if (mongoose.Types.ObjectId.isValid(studentId)) {
    return Student.findById(studentId);
  }

  return Student.findOne({
    $or: [{ studentId }, { email: studentId }, { name: studentId }],
  });
};

const getExamQueryByRole = (req) => {
  const role = req.user?.role;

  if (isAdmin(req)) return {};

  if (role === "branch_admin" || role === "faculty") {
    return { branch: getUserBranch(req) };
  }

  if (role === "student" || role === "parent") {
    return { studentId: req.user.referenceId };
  }

  return { branch: getUserBranch(req) };
};

const restrictBranchAccess = (req, branchName) => {
  if (isAdmin(req)) return true;
  return getUserBranch(req) === branchName;
};

exports.createExam = async (req, res) => {
  try {
    const {
      name,
      studentId,
      studentName,
      studentCode,
      branch,
      course,
      batch,
      practical,
      theory,
      viva,
      status,
    } = req.body;

    if (!name || !studentId) {
      return res.status(400).json({
        message: "Exam name and student are required",
      });
    }

    const student = await findStudentSafely(studentId);

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    if (!restrictBranchAccess(req, student.branch)) {
      return res.status(403).json({
        message: "Access denied for this branch student",
      });
    }

    const practicalMarks = Number(practical) || 0;
    const theoryMarks = Number(theory) || 0;
    const vivaMarks = Number(viva) || 0;
    const total = practicalMarks + theoryMarks + vivaMarks;

    const examId = await generateExamId();

    const exam = await Exam.create({
      examId,
      name,
      studentId: student._id,
      studentName: studentName || student.name,
      studentCode: studentCode || student.studentId,
      branch: branch || student.branch,
      course: course || student.course,
      batch:
        batch ||
        (Array.isArray(student.batch) ? student.batch.join(", ") : student.batch),
      practical: practicalMarks,
      theory: theoryMarks,
      viva: vivaMarks,
      total,
      grade: getGrade(total),
      status: status || "Completed",
    });

    res.status(201).json({
      message: "Exam created successfully",
      exam,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getExams = async (req, res) => {
  try {
    const query = getExamQueryByRole(req);

    const exams = await Exam.find(query)
      .populate("studentId", "name studentId branch course batch")
      .sort({ createdAt: -1 });

    res.json(exams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getExamById = async (req, res) => {
  try {
    const query = {
      _id: req.params.id,
      ...getExamQueryByRole(req),
    };

    const exam = await Exam.findOne(query).populate(
      "studentId",
      "name studentId branch course batch"
    );

    if (!exam) {
      return res.status(404).json({
        message: "Exam not found or access denied",
      });
    }

    res.json(exam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateExam = async (req, res) => {
  try {
    const query = {
      _id: req.params.id,
      ...getExamQueryByRole(req),
    };

    const exam = await Exam.findOne(query);

    if (!exam) {
      return res.status(404).json({
        message: "Exam not found or access denied",
      });
    }

    const {
      name,
      studentId,
      studentName,
      studentCode,
      branch,
      course,
      batch,
      practical,
      theory,
      viva,
      status,
    } = req.body;

    if (studentId && String(studentId) !== String(exam.studentId)) {
      const student = await findStudentSafely(studentId);

      if (!student) {
        return res.status(404).json({
          message: "Student not found",
        });
      }

      if (!restrictBranchAccess(req, student.branch)) {
        return res.status(403).json({
          message: "Access denied for selected student branch",
        });
      }

      exam.studentId = student._id;
      exam.studentName = studentName || student.name;
      exam.studentCode = studentCode || student.studentId;
      exam.branch = branch || student.branch;
      exam.course = course || student.course;
      exam.batch =
        batch ||
        (Array.isArray(student.batch) ? student.batch.join(", ") : student.batch);
    }

    if (branch && !restrictBranchAccess(req, branch)) {
      return res.status(403).json({
        message: "Access denied for selected branch",
      });
    }

    const practicalMarks =
      practical !== undefined ? Number(practical) || 0 : exam.practical;
    const theoryMarks = theory !== undefined ? Number(theory) || 0 : exam.theory;
    const vivaMarks = viva !== undefined ? Number(viva) || 0 : exam.viva;
    const total = practicalMarks + theoryMarks + vivaMarks;

    exam.name = name || exam.name;
    exam.studentName = studentName || exam.studentName;
    exam.studentCode = studentCode || exam.studentCode;
    exam.branch = branch || exam.branch;
    exam.course = course || exam.course;
    exam.batch = batch || exam.batch;
    exam.practical = practicalMarks;
    exam.theory = theoryMarks;
    exam.viva = vivaMarks;
    exam.total = total;
    exam.grade = getGrade(total);
    exam.status = status || exam.status;

    await exam.save();

    res.json({
      message: "Exam updated successfully",
      exam,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteExam = async (req, res) => {
  try {
    const query = {
      _id: req.params.id,
      ...getExamQueryByRole(req),
    };

    const exam = await Exam.findOne(query);

    if (!exam) {
      return res.status(404).json({
        message: "Exam not found or access denied",
      });
    }

    await Exam.findByIdAndDelete(exam._id);

    res.json({
      message: "Exam deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};