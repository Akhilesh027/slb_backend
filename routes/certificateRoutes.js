const express = require("express");

const {
  createCertificate,
  getCertificates,
  getCertificateById,
  updateCertificate,
  deleteCertificate,
} = require("../controllers/certificateController.js");

const { protect } = require("../middleware/authMiddleware.js");

const router = express.Router();

router.post("/", protect, createCertificate);
router.get("/", protect, getCertificates);
router.get("/:id", protect, getCertificateById);
router.put("/:id", protect, updateCertificate);
router.delete("/:id", protect, deleteCertificate);

module.exports = router;