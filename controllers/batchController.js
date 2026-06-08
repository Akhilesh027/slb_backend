const Batch = require("../models/Batch.js");
const Branch = require("../models/Branch.js");
const Course = require("../models/Course.js");
const Faculty = require("../models/Faculty.js");

const adminRoles = ["admin", "super_admin"];

const isAdmin = (req) => adminRoles.includes(req.user?.role);

const getUserBranch = (req) => req.user?.branch || "";

const getBatchBranchFilter = (req) => {
  if (isAdmin(req)) return {};

  if (req.user?.role === "branch_admin" || req.user?.role === "faculty") {
    return { branch: getUserBranch(req) };
  }

  return { branch: getUserBranch(req) };
};

const restrictBranchAccess = (req, branchName) => {
  if (isAdmin(req)) return true;
  return getUserBranch(req) === branchName;
};

const getBranchCode = (branchName = "") => {
  return (
    branchName.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 3) || "OTH"
  );
};

const generateBatchCode = async (branch) => {
  const branchCode = getBranchCode(branch);
  const prefix = `SLB-${branchCode}-BAT-`;

  const lastBatch = await Batch.findOne({
    batchCode: { $regex: `^${prefix}` },
  }).sort({ createdAt: -1 });

  let nextNumber = 1;

  if (lastBatch?.batchCode) {
    const lastNumber = parseInt(lastBatch.batchCode.split("-").pop(), 10);
    nextNumber = Number.isNaN(lastNumber) ? 1 : lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
};

exports.createBatch = async (req, res) => {
  try {
    const {
      batchName,
      course,
      courseName,
      facultyId,
      facultyName,
      branch,
      timing,
      days,
      mode,
      capacity,
      enrolled,
      status,
    } = req.body;

    if (!batchName || !course || !branch) {
      return res.status(400).json({
        message: "Batch name, course and branch are required",
      });
    }

    if (!restrictBranchAccess(req, branch)) {
      return res.status(403).json({
        message: "Access denied for this branch",
      });
    }

    const branchExists = await Branch.findOne({ name: branch });

    if (!branchExists) {
      return res.status(400).json({
        message: "Selected branch does not exist",
      });
    }

    const courseExists = await Course.findOne({
      courseName: course,
      status: "Active",
    });

    if (!courseExists) {
      return res.status(400).json({
        message: "Selected course does not exist or is inactive",
      });
    }

    let selectedFacultyName = facultyName || "";

    if (facultyId) {
      const faculty = await Faculty.findOne({
        _id: facultyId,
        assignedBranch: branch,
      });

      if (!faculty) {
        return res.status(400).json({
          message: "Selected faculty not found in this branch",
        });
      }

      selectedFacultyName = faculty.name;
    }

    const batchCode = await generateBatchCode(branch);

    const batch = await Batch.create({
      batchCode,
      batchName,
      course,
      courseName: courseName || course,
      facultyId: facultyId || null,
      facultyName: selectedFacultyName,
      branch,
      timing,
      days,
      mode,
      capacity: Number(capacity) || 0,
      enrolled: Number(enrolled) || 0,
      status: status || "Active",
    });

    res.status(201).json({
      message: "Batch created successfully",
      batch,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getBatches = async (req, res) => {
  try {
    const query = getBatchBranchFilter(req);

    const batches = await Batch.find(query)
      .populate("facultyId", "name email facultyId status assignedBranch")
      .sort({ createdAt: -1 });

    res.json(batches);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getBatchById = async (req, res) => {
  try {
    const query = {
      _id: req.params.id,
      ...getBatchBranchFilter(req),
    };

    const batch = await Batch.findOne(query).populate(
      "facultyId",
      "name email facultyId status assignedBranch"
    );

    if (!batch) {
      return res.status(404).json({
        message: "Batch not found or access denied",
      });
    }

    res.json(batch);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.updateBatch = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({
        message: "Batch not found",
      });
    }

    if (!restrictBranchAccess(req, batch.branch)) {
      return res.status(403).json({
        message: "Access denied for this branch",
      });
    }

    const {
      batchName,
      course,
      courseName,
      facultyId,
      facultyName,
      branch,
      timing,
      days,
      mode,
      capacity,
      enrolled,
      status,
    } = req.body;

    if (branch && !restrictBranchAccess(req, branch)) {
      return res.status(403).json({
        message: "Access denied for selected branch",
      });
    }

    const finalBranch = branch || batch.branch;

    if (branch) {
      const branchExists = await Branch.findOne({ name: branch });

      if (!branchExists) {
        return res.status(400).json({
          message: "Selected branch does not exist",
        });
      }
    }

    if (course) {
      const courseExists = await Course.findOne({
        courseName: course,
        status: "Active",
      });

      if (!courseExists) {
        return res.status(400).json({
          message: "Selected course does not exist or is inactive",
        });
      }
    }

    let selectedFacultyName = batch.facultyName;

    if (facultyId) {
      const faculty = await Faculty.findOne({
        _id: facultyId,
        assignedBranch: finalBranch,
      });

      if (!faculty) {
        return res.status(400).json({
          message: "Selected faculty not found in this branch",
        });
      }

      selectedFacultyName = faculty.name;
    }

    batch.batchName = batchName || batch.batchName;
    batch.course = course || batch.course;
    batch.courseName = courseName || course || batch.courseName;
    batch.facultyId = facultyId || batch.facultyId;
    batch.facultyName = selectedFacultyName || facultyName || batch.facultyName;
    batch.branch = branch || batch.branch;
    batch.timing = timing || batch.timing;
    batch.days = days || batch.days;
    batch.mode = mode || batch.mode;
    batch.capacity =
      capacity !== undefined ? Number(capacity) || 0 : batch.capacity;
    batch.enrolled =
      enrolled !== undefined ? Number(enrolled) || 0 : batch.enrolled;
    batch.status = status || batch.status;

    await batch.save();

    const updatedBatch = await Batch.findById(req.params.id).populate(
      "facultyId",
      "name email facultyId status assignedBranch"
    );

    res.json({
      message: "Batch updated successfully",
      batch: updatedBatch,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.deleteBatch = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({
        message: "Batch not found",
      });
    }

    if (!restrictBranchAccess(req, batch.branch)) {
      return res.status(403).json({
        message: "Access denied for this branch",
      });
    }

    await Batch.findByIdAndDelete(req.params.id);

    res.json({
      message: "Batch deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};