const express = require("express");
const multer = require("multer");
const path = require("path");

const {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
} = require("../controllers/paymentController.js");

const { protect } = require("../middleware/authMiddleware.js");

const router = express.Router();

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "uploads/payments");
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `payment-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.post("/", protect, upload.single("proofFile"), createPayment);
router.get("/", protect, getPayments);
router.get("/:id", protect, getPaymentById);
router.put("/:id", protect, upload.single("proofFile"), updatePayment);
router.delete("/:id", protect, deletePayment);

module.exports = router;