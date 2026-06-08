const mongoose = require("mongoose");
const Certificate = require("../models/Certificate.js");
const Student = require("../models/Student.js");

const adminRoles = ["admin", "super_admin"];

const isAdmin = (req) => adminRoles.includes(req.user?.role);
const getUserBranch = (req) => req.user?.branch || "";

const generateCertificateId = async () => {
  const prefix = "SLB-CER-";

  const lastCertificate = await Certificate.findOne({
    certificateId: { $regex: `^${prefix}` },
  }).sort({ createdAt: -1 });

  let nextNumber = 1;

  if (lastCertificate?.certificateId) {
    const lastNumber = parseInt(
      lastCertificate.certificateId.split("-").pop(),
      10
    );
    nextNumber = Number.isNaN(lastNumber) ? 1 : lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
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

const getCertificateQueryByRole = (req) => {
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

exports.createCertificate = async (req, res) => {
  try {
    const {
      studentId,
      studentName,
      studentCode,
      branch,
      course,
      type,
      date,
      status,
    } = req.body;

    if (!studentId || !type) {
      return res.status(400).json({
        message: "Student and certificate type are required",
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

    const certificateId = await generateCertificateId();

    const qrCode = `${certificateId}-${student.studentId}`;

    const certificate = await Certificate.create({
      certificateId,
      studentId: student._id,
      studentName: studentName || student.name,
      studentCode: studentCode || student.studentId,
      branch: branch || student.branch,
      course: course || student.course,
      type,
      date: date || new Date().toISOString().split("T")[0],
      qrCode,
      status: status || "Generated",
      generatedBy: req.user?._id || req.user?.id,
    });

    res.status(201).json({
      message: "Certificate generated successfully",
      certificate,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getCertificates = async (req, res) => {
  try {
    const query = getCertificateQueryByRole(req);

    const certificates = await Certificate.find(query)
      .populate("studentId", "name studentId branch course batch")
      .sort({ createdAt: -1 });

    res.json(certificates);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getCertificateById = async (req, res) => {
  try {
    const query = {
      _id: req.params.id,
      ...getCertificateQueryByRole(req),
    };

    const certificate = await Certificate.findOne(query).populate(
      "studentId",
      "name studentId branch course batch"
    );

    if (!certificate) {
      return res.status(404).json({
        message: "Certificate not found or access denied",
      });
    }

    res.json(certificate);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.updateCertificate = async (req, res) => {
  try {
    const query = {
      _id: req.params.id,
      ...getCertificateQueryByRole(req),
    };

    const certificate = await Certificate.findOne(query);

    if (!certificate) {
      return res.status(404).json({
        message: "Certificate not found or access denied",
      });
    }

    const {
      studentId,
      studentName,
      studentCode,
      branch,
      course,
      type,
      date,
      status,
    } = req.body;

    if (studentId && String(studentId) !== String(certificate.studentId)) {
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

      certificate.studentId = student._id;
      certificate.studentName = studentName || student.name;
      certificate.studentCode = studentCode || student.studentId;
      certificate.branch = branch || student.branch;
      certificate.course = course || student.course;
      certificate.qrCode = `${certificate.certificateId}-${student.studentId}`;
    }

    if (branch && !restrictBranchAccess(req, branch)) {
      return res.status(403).json({
        message: "Access denied for selected branch",
      });
    }

    certificate.studentName = studentName || certificate.studentName;
    certificate.studentCode = studentCode || certificate.studentCode;
    certificate.branch = branch || certificate.branch;
    certificate.course = course || certificate.course;
    certificate.type = type || certificate.type;
    certificate.date = date || certificate.date;
    certificate.status = status || certificate.status;

    await certificate.save();

    res.json({
      message: "Certificate updated successfully",
      certificate,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.deleteCertificate = async (req, res) => {
  try {
    const query = {
      _id: req.params.id,
      ...getCertificateQueryByRole(req),
    };

    const certificate = await Certificate.findOne(query);

    if (!certificate) {
      return res.status(404).json({
        message: "Certificate not found or access denied",
      });
    }

    await Certificate.findByIdAndDelete(certificate._id);

    res.json({
      message: "Certificate deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};