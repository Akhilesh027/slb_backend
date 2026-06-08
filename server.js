const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db.js");

dotenv.config();
connectDB();

const app = express();

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://10.26.146.28:3000",
    "https://yourfrontenddomain.com",
  ],
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("SLB Kuchipudi Backend API is running");
});

const authRoutes = require("./routes/authRoutes.js");
const studentRoutes = require("./routes/studentRoutes.js");
const facultyRoutes = require("./routes/facultyRoutes.js");
const branchRoutes = require("./routes/branchRoutes.js");
const userRoutes = require("./routes/userRoutes.js");
const courseRoutes = require("./routes/courseRoutes.js");
const batchRoutes = require("./routes/batchRoutes.js");
const eventRoutes = require("./routes/eventRoutes.js");
const attendanceRoutes = require("./routes/attendanceRoutes.js");
const paymentRoutes = require("./routes/paymentRoutes.js");
const examRoutes = require("./routes/examRoutes.js");
const certificateRoutes = require("./routes/certificateRoutes.js");
const notificationRoutes = require("./routes/notificationRoutes.js");

app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/notifications", notificationRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});