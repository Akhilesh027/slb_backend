const Course = require("../models/Course.js");

exports.createCourse = async (req, res) => {
  try {
    const {
      courseCode,
      courseName,
      level,
      duration,
      fee,
      description,
      syllabus,
      status,
    } = req.body;

    if (!courseCode || !courseName || !level || !duration) {
      return res.status(400).json({
        message: "Course code, name, level and duration are required",
      });
    }

    const exists = await Course.findOne({
      courseCode: courseCode.toUpperCase(),
    });

    if (exists) {
      return res.status(400).json({
        message: "Course code already exists",
      });
    }

    const course = await Course.create({
      courseCode: courseCode.toUpperCase(),
      courseName,
      level,
      duration,
      fee: Number(fee) || 0,
      description,
      syllabus: Array.isArray(syllabus)
        ? syllabus
        : syllabus
        ? syllabus.split(",").map((item) => item.trim())
        : [],
      status: status || "Active",
    });

    res.status(201).json({
      message: "Course created successfully",
      course,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCourses = async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const {
      courseCode,
      courseName,
      level,
      duration,
      fee,
      description,
      syllabus,
      status,
    } = req.body;

    if (courseCode && courseCode.toUpperCase() !== course.courseCode) {
      const exists = await Course.findOne({
        courseCode: courseCode.toUpperCase(),
        _id: { $ne: course._id },
      });

      if (exists) {
        return res.status(400).json({
          message: "Course code already exists",
        });
      }
    }

    course.courseCode = courseCode
      ? courseCode.toUpperCase()
      : course.courseCode;
    course.courseName = courseName || course.courseName;
    course.level = level || course.level;
    course.duration = duration || course.duration;
    course.fee = fee !== undefined ? Number(fee) || 0 : course.fee;
    course.description = description || course.description;
    course.syllabus = Array.isArray(syllabus)
      ? syllabus
      : syllabus
      ? syllabus.split(",").map((item) => item.trim())
      : course.syllabus;
    course.status = status || course.status;

    await course.save();

    res.json({
      message: "Course updated successfully",
      course,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    await Course.findByIdAndDelete(req.params.id);

    res.json({
      message: "Course deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};