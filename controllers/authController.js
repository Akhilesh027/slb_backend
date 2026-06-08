const jwt = require("jsonwebtoken");
const User = require("../models/User.js");

const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET missing in .env file");
  }

  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.status !== "Active") {
      return res.status(403).json({ message: "Your account is inactive" });
    }

    res.json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        branch: user.branch,
        referenceId: user.referenceId,
        referenceModel: user.referenceModel,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.me = async (req, res) => {
  res.json(req.user);
};

exports.createSuperAdmin = async (req, res) => {
  try {
    const exists = await User.findOne({
      role: "super_admin",
    });

    if (exists) {
      return res.status(400).json({
        message: "Super Admin already exists",
      });
    }

    const user = await User.create({
      name: "SLB Super Admin",
      email: "admin@slbkuchipudi.com",
      phone: "9999999999",
      password: "Admin@123",
      role: "super_admin",
      branch: "All Branches",
      status: "Active",
    });

    res.status(201).json({
      message: "Super Admin Created",
      email: user.email,
      password: "Admin@123",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};