const express = require("express");

const {
  createCertificate,
  getCertificates,
  getCertificateById,
  updateCertificate,
  deleteCertificate,
} = require("../controllers/certificateController.js");

const { protect, authorize } = require("../middleware/authMiddleware.js");

const router = express.Router();

const viewRoles = [
  "super_admin",
  "admin",
  "branch_admin",
  "faculty",
  "student",
  "parent",
];

const manageRoles = ["super_admin", "admin", "branch_admin", "faculty"];

const deleteRoles = ["super_admin", "admin", "branch_admin"];

router.get("/", protect, authorize(...viewRoles), getCertificates);
router.get("/:id", protect, authorize(...viewRoles), getCertificateById);

router.post("/", protect, authorize(...manageRoles), createCertificate);
router.put("/:id", protect, authorize(...manageRoles), updateCertificate);
router.delete("/:id", protect, authorize(...deleteRoles), deleteCertificate);

module.exports = router;