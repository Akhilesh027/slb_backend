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

const normalizeDays = (days) => {
  if (Array.isArray(days)) return days;
  if (!days) return [];
  return [days];
};

const buildTiming = (timing, startTime, endTime) => {
  if (timing) return timing;

  if (startTime || endTime) {
    return `${startTime || ""}${startTime && endTime ? " - " : ""}${
      endTime || ""
    }`;
  }

  return "";
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
      batchType,
      startDate,
      endDate,
      startTime,
      endTime,
      timing,
      days,
      mode,
      capacity,
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

    const existingBatch = await Batch.findOne({
      batchName: batchName.trim(),
      branch,
    });

    if (existingBatch) {
      return res.status(400).json({
        message: "Batch name already exists in this branch",
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
        status: "Active",
      });

      if (!faculty) {
        return res.status(400).json({
          message: "Selected faculty not found or inactive in this branch",
        });
      }

      selectedFacultyName = faculty.name;
    }

    const batchCode = await generateBatchCode(branch);
    const finalCapacity = Number(capacity) || 0;

    const batch = await Batch.create({
      batchCode,
      batchName: batchName.trim(),
      course,
      courseName: courseName || course,
      facultyId: facultyId || null,
      facultyName: selectedFacultyName,
      branch,
      batchType: batchType || "Beginner",
      startDate: startDate || "",
      endDate: endDate || "",
      startTime: startTime || "",
      endTime: endTime || "",
      timing: buildTiming(timing, startTime, endTime),
      days: normalizeDays(days),
      mode: mode || "Offline",
      capacity: finalCapacity,
      enrolled: 0,
      availableSeats: finalCapacity,
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
      batchType,
      startDate,
      endDate,
      startTime,
      endTime,
      timing,
      days,
      mode,
      capacity,
      status,
    } = req.body;

    if (branch && !restrictBranchAccess(req, branch)) {
      return res.status(403).json({
        message: "Access denied for selected branch",
      });
    }

    const finalBranch = branch || batch.branch;

    if (batchName) {
      const duplicateBatch = await Batch.findOne({
        _id: { $ne: batch._id },
        batchName: batchName.trim(),
        branch: finalBranch,
      });

      if (duplicateBatch) {
        return res.status(400).json({
          message: "Batch name already exists in this branch",
        });
      }
    }

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
        status: "Active",
      });

      if (!faculty) {
        return res.status(400).json({
          message: "Selected faculty not found or inactive in this branch",
        });
      }

      selectedFacultyName = faculty.name;
    } else if (facultyId === null || facultyId === "") {
      selectedFacultyName = "";
    }

    const finalCapacity =
      capacity !== undefined ? Number(capacity) || 0 : batch.capacity;

    if (batch.enrolled > finalCapacity) {
      return res.status(400).json({
        message: "Capacity cannot be less than enrolled students",
      });
    }

    batch.batchName = batchName ? batchName.trim() : batch.batchName;
    batch.course = course || batch.course;
    batch.courseName = courseName || course || batch.courseName;

    batch.facultyId =
      facultyId === null || facultyId === "" ? null : facultyId || batch.facultyId;

    batch.facultyName = selectedFacultyName || facultyName || "";
    batch.branch = branch || batch.branch;
    batch.batchType = batchType || batch.batchType;

    batch.startDate = startDate !== undefined ? startDate : batch.startDate;
    batch.endDate = endDate !== undefined ? endDate : batch.endDate;
    batch.startTime = startTime !== undefined ? startTime : batch.startTime;
    batch.endTime = endTime !== undefined ? endTime : batch.endTime;

    batch.timing = buildTiming(timing, batch.startTime, batch.endTime);
    batch.days = days !== undefined ? normalizeDays(days) : batch.days;
    batch.mode = mode || batch.mode;
    batch.capacity = finalCapacity;
    batch.availableSeats = Math.max(finalCapacity - batch.enrolled, 0);
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

    if (batch.enrolled > 0) {
      return res.status(400).json({
        message: "Cannot delete batch with enrolled students",
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