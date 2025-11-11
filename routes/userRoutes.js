import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import User from "../models/User.js";
import dotenv from "dotenv";
import { exportUsersToCSV } from "../controllers/userController.js";
import { exportSem2UsersToCSV } from "../controllers/userController.js";
import sem2 from "../models/sem2.js"; // ✅ Import sem2 model


dotenv.config();
const router = express.Router();

// 🔹 Ensure "uploads/" directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true }); // ✅ Creates "uploads/" if not present
}

// 🔹 Multer Configuration for File Upload (Payment Screenshot)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const extname = path.extname(file.originalname);
    cb(null, `${timestamp}${extname}`); // ✅ Save with timestamp initially
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, JPEG, and PNG files are allowed"), false);
  }
};

const upload = multer({ storage, fileFilter });

const generateRegistrationNumber = async () => {
  const yearPrefix = new Date().getFullYear().toString().slice(2); // "25" for 2025

  // Find the last user whose reg number starts with the current year
  const lastUser = await User.findOne({ registrationNumber: { $regex: `^SMCEN${yearPrefix}` } })
    .sort({ registrationNumber: -1 });

  if (!lastUser || !lastUser.registrationNumber) {
    return `SMCEN${yearPrefix}001`;
  }

  const lastNumber = parseInt(lastUser.registrationNumber.slice(7), 10); // After 'SMCEN25'
  const nextNumber = String(lastNumber + 1).padStart(3, "0");

  return `SMCEN${yearPrefix}${nextNumber}`;
};



// ✅ User Registration Route
router.post("/register", upload.fields([
  { name: "paymentScreenshot", maxCount: 1 },
  { name: "photo", maxCount: 1 },
]), async (req, res) => {
  try {
    let {
      registrationType,
      name,
      email,
      password,
      // password:hashedPassword
      dateOfBirth,
      basisOfAdmission,
      collegeAttended,
      gender,
      maritalStatus,
      motherTongue,
      isAdventist,
      union,
      sectionRegionConference,
      address,
      state,
      phoneNumber,
      workplace,
      selectedCourses,
      totalFee,
    } = req.body;

    totalFee = parseFloat(totalFee);

    if (
      !registrationType || !name || !email || !password || !dateOfBirth ||
      !basisOfAdmission || !collegeAttended || !gender || !maritalStatus ||
      !motherTongue || isAdventist === undefined || !phoneNumber || !address || !state ||
      !selectedCourses || selectedCourses.length === 0 || isNaN(totalFee)
    ) {
      return res.status(400).json({ message: "Please fill in all required fields and ensure the total fee is valid." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered. Please log in or use a different email." });
    }

    const registrationNumber = await generateRegistrationNumber();
    const hashedPassword = await bcrypt.hash(password, 10);

    let paymentScreenshot = null;
    let photo = null;

    if (req.files?.paymentScreenshot?.[0]) {
      const paymentFile = req.files.paymentScreenshot[0];
      const paymentExt = path.extname(paymentFile.originalname);
      const newPaymentName = `${registrationNumber}-payment${paymentExt}`;
      const newPaymentPath = path.join("uploads", newPaymentName);
      fs.renameSync(paymentFile.path, newPaymentPath);
      paymentScreenshot = `/uploads/${newPaymentName}`;
    }

    if (req.files?.photo?.[0]) {
      const photoFile = req.files.photo[0];
      const photoExt = path.extname(photoFile.originalname);
      const newPhotoName = `${registrationNumber}-photo${photoExt}`;
      const newPhotoPath = path.join("photos", newPhotoName);
      fs.renameSync(photoFile.path, newPhotoPath);
      photo = `/photos/${newPhotoName}`;
    }

    const newUser = new User({
      registrationNumber,
      registrationType,
      name,
      email,
      password,
      dateOfBirth,
      basisOfAdmission,
      collegeAttended,
      gender,
      maritalStatus,
      motherTongue,
      isAdventist,
      union,
      sectionRegionConference,
      address,
      phoneNumber,
      workplace,
      paymentScreenshot,
      photo,
      state,
      selectedCourses,
      totalFee,
    });

    await newUser.save();

    res.status(201).json({ message: "User registered successfully!", registrationNumber });

  } catch (error) {
    // console.error("Registration Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


//registration sem2
router.post("/register2", upload.single("paymentScreenshot"), async (req, res) => {
  try {
    let { name, selectedCourses, totalFee } = req.body;
    let registrationNumber = req.body.registrationNumber;

    // Log the request body to confirm data is being received correctly

    // Convert totalFee to a number if it is a string
    totalFee = Number(totalFee);  // Convert '16200' (string) to 16200 (number)

    // If selectedCourses is a string, split it into an array
    if (typeof selectedCourses === 'string') {
      selectedCourses = selectedCourses.split(',');
    }

    // console.log("Converted Fields:", { totalFee, selectedCourses, name, registrationNumber });

    // ✅ Check if required fields are missing
    if (
      !registrationNumber || !name ||
      !selectedCourses || selectedCourses.length === 0 || isNaN(totalFee)
    ) {
      // console.log("Validation failed. Missing fields.");
      return res.status(400).json({ message: "Please fill in all required fields." });
    }

    if (!registrationNumber || registrationNumber === "undefined" || registrationNumber === "null") {
      return res.status(400).json({ message: "Invalid or missing registration number." });
    }


    // ✅ Check if the user already exists (Registration Number Uniqueness Check)
    const existingUser = await sem2.findOne({ registrationNumber });
    if (existingUser) {
      return res.status(400).json({ message: "You have Already registered" });
    }

    // ✅ Handle Payment Screenshot upload (if present)
    let paymentScreenshot = null;
    if (req.file) {
      const ext = path.extname(req.file.originalname);
      const newFileName = `${registrationNumber}-sem2payment${ext}`;
      const oldPath = req.file.path;
      const newPath = path.join("sem2", newFileName);

      fs.renameSync(oldPath, newPath);
      paymentScreenshot = `/sem2/${newFileName}`;
    }

    // ✅ Create New User Object with updated fields (selectedCourses, totalPayment, and paymentScreenshot)
    const newUser = new sem2({
      registrationNumber,
      name,
      paymentScreenshot,
      selectedCourses, // Use the array here
      totalFee,
    });
    await newUser.save();

    res.status(201).json({ message: "second semester registered successfully!", registrationNumber });
  } catch (error) {
    // console.error("Registration Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});






// ✅ User Login Route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    // ✅ Compare password
    // const isMatch = await bcrypt.compare(password, user.password);
    // if (!isMatch) {
    //   return res.status(400).json({ message: "Invalid email or password." });
    // }
    if (password !== user.password) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    // ✅ Generate JWT Token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ message: "Login successful!", token, userId: user._id });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// ✅ Fetch User Profile for Dashboard
router.get("/profileData/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    // ✅ Find User by ID
    const user = await User.findById(userId).select("-password"); // Exclude password for security

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});


router.get("/export/csv", exportUsersToCSV);
router.get("/export/csv-sem2", exportSem2UsersToCSV);


export default router;
