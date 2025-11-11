import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import User from "../models/User.js";
import archiver from "archiver";
import PDFDocument from "pdfkit";
import stream from "stream";
import multer from "multer";
import path from "path";
import fs from "fs";
import protectAdmin from "../middlewares/auth.js";

const router = express.Router();

// 🔹 Ensure "uploads/" directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true }); // ✅ Creates "uploads/" if not present
}

// 🔹 Multer Configuration for File Upload (Payment Screenshot)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // ✅ Ensure "uploads/" folder exists in your backend directory
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// 📌 Grading Scale
const gradingScale = [
  { min: 90, grade: "A", gpa: 4.0 },
  { min: 85, grade: "A-", gpa: 3.7 },
  { min: 80, grade: "B+", gpa: 3.3 },
  { min: 75, grade: "B", gpa: 3.0 },
  { min: 70, grade: "B-", gpa: 2.7 },
  { min: 65, grade: "C+", gpa: 2.3 },
  { min: 60, grade: "C", gpa: 2.0 },
  { min: 55, grade: "C-", gpa: 1.7 },
  { min: 50, grade: "D", gpa: 1.0 },
  { min: 0, grade: "F", gpa: 0.0 },
];

// 📌 Function to Convert Score to Grade & GPA
const getGradeAndGPA = (score) => {
  for (const scale of gradingScale) {
    if (score >= scale.min) {
      return { grade: scale.grade, gpa: scale.gpa };
    }
  }
  return { grade: "F", gpa: 0.0 };
};

// 📌 Course List with Credit Hours
const courses = [
  { code: "RELB151", title: "Christian Beliefs I/Moral Principles I", credit: 2, semester: "I", mentor: "Mrs. Sharon Clinton" },
  { code: "RELB291", title: "Apocalyptic Literature/Daniel", credit: 2, semester: "I", mentor: "Dr. Jesin Israel" },
  { code: "RELB125", title: "Life and Teachings of Jesus", credit: 3, semester: "I", mentor: "Mr. Gaiphun Gangmei" },
  { code: "RELB238", title: "Adventist Heritage", credit: 3, semester: "I", mentor: "Dr. Koberson Langhu" },
  { code: "EDUC131", title: "Philosophy of Education", credit: 2, semester: "I", mentor: "Dr. Carol Linda Kingston" },
  { code: "WREL234", title: "Religions of the World", credit: 3, semester: "II", mentor: "Mr. Gaiphun Gangmei" },
  { code: "HLED121", title: "Personal Health", credit: 2, semester: "II", mentor: "Pr. Vanlaltluaga Khuma" },
  { code: "RELB152", title: "Christian Beliefs II/Moral Principles II", credit: 2, semester: "II", mentor: "Mrs. Sharon Clinton" },
  { code: "FNCE252", title: "Church Stewardship & Finance", credit: 3, semester: "II", mentor: "Mr. Abhishek Lakra" },
  { code: "RELB292", title: "Apocalyptic Literature II/Revelation", credit: 2, semester: "II", mentor: "Dr. Jesin Israel" },
];

// router.post('/admin/register') for initial use only
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const newAdmin = new Admin({ username, password });
    await newAdmin.save();
    res.status(201).json({ message: 'Admin created' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create admin', error });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '4h' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error });
  }
});

/* ==============================
   🔹 User & Grading Routes
   ============================== */
// 📌 View All Users
router.get("/users", protectAdmin, async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// Update Grades for a Student
router.put("/update-grades/:id", async (req, res) => {
  try {
    const { grades } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ Ensure grades are properly formatted
    Object.keys(grades).forEach((course) => {
      const { score, grade, pts } = grades[course];
      user.grades[course] = {
        score: !isNaN(score) ? Number(score) : 0,  // ✅ Prevent NaN
        grade: grade || "F",
        pts: !isNaN(pts) ? Number(pts) : 0.0,  // ✅ Prevent NaN
        creditHours: user.grades[course]?.creditHours || 2, // ✅ Ensure Cr. Hrs exist
      };
    });

    // ✅ Calculate and update cumulative GPA safely
    const totalPts = Object.values(user.grades).reduce((acc, course) => acc + (course.pts || 0), 0);
    const totalCreditHours = Object.values(user.grades).reduce((acc, course) => acc + (course.creditHours || 0), 0);
    user.cumulativeGPA = totalCreditHours > 0 ? parseFloat((totalPts / totalCreditHours).toFixed(2)) : 0.0;  // ✅ Prevent division by zero

    await user.save();
    res.json({ message: "Grades updated successfully", user });
  } catch (error) {
    // console.error("❌ Error updating grades:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

// 📌 Download Individual Transcript
router.get("/download-certificate/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const courses = [
      { code: "RELB151", title: "Christian Beliefs I/Moral Principles I", credit: 2, semester: "I", mentor: "Mrs. Sharon Clinton" },
      { code: "RELB291", title: "Apocalyptic Literature/Daniel", credit: 2, semester: "I", mentor: "Dr. Jesin Israel" },
      { code: "RELB125", title: "Life and Teachings of Jesus", credit: 3, semester: "I", mentor: "Mr. Gaiphun Gangmei" },
      { code: "RELB238", title: "Adventist Heritage", credit: 3, semester: "I", mentor: "Dr. Koberson Langhu" },
      { code: "EDUC131", title: "Philosophy of Education", credit: 2, semester: "I", mentor: "Dr. Carol Linda Kingston" },
      { code: "WREL234", title: "Religions of the World", credit: 3, semester: "II", mentor: "Mr. Gaiphun Gangmei" },
      { code: "HLED121", title: "Personal Health", credit: 2, semester: "II", mentor: "Pr. Vanlaltluaga Khuma" },
      { code: "RELB152", title: "Christian Beliefs II/Moral Principles II", credit: 2, semester: "II", mentor: "Mrs. Sharon Clinton" },
      { code: "FNCE252", title: "Church Stewardship & Finance", credit: 3, semester: "II", mentor: "Mr. Abhishek Lakra" },
      { code: "RELB292", title: "Apocalyptic Literature II/Revelation", credit: 2, semester: "II", mentor: "Dr. Jesin Israel" },
    ];
    const gradingScale = [
      { min: 83, grade: "A", gpa: 4.00 },
      { min: 80, grade: "A-", gpa: 3.67 },
      { min: 77, grade: "B+", gpa: 3.33 },
      { min: 73, grade: "B", gpa: 3.00 },
      { min: 70, grade: "B-", gpa: 2.67 },
      { min: 64, grade: "C+", gpa: 2.33 },
      { min: 56, grade: "C", gpa: 2.00 },
      { min: 50, grade: "C-", gpa: 1.67 },
      { min: 47, grade: "D+", gpa: 1.33 },
      { min: 43, grade: "D", gpa: 1.00 },
      { min: 40, grade: "D-", gpa: 0.67 },
      { min: 0, grade: "F", gpa: 0.00 },
    ];

    function getGradeAndPts(score, credit) {
      const matchedGrade = gradingScale.find((g) => score >= g.min) || { grade: "F", gpa: 0.00 };
      return { grade: matchedGrade.grade, pts: matchedGrade.gpa * credit };
    }

    const doc = new PDFDocument({ size: "A4", margins: { top: 50, left: 50, right: 50, bottom: 50 } });
    res.setHeader("Content-Disposition", `attachment; filename="${user.registrationNumber || user.name}_Certificate.pdf"`);
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    doc.font("Times-Bold").fontSize(16).text("SPICER MEMORIAL COLLEGE", { align: "center" });
    doc.fontSize(12).text("Aundh Post, Aundh", { align: "center" });
    doc.text("Pune 411 067, INDIA", { align: "center" });
    doc.text("Phone: 25807000, 7001", { align: "center" });
    doc.moveDown();
    doc.fontSize(14).text("Enrichment Transcript", { align: "center", underline: true });
    doc.moveDown();

    doc.fontSize(10).text(`Name: ${user.name}`);
    doc.text(`ID No: ${user.registrationNumber || "N/A"}`);
    doc.text(`Date of Birth: ${user.dateOfBirth || "N/A"}`);
    const currentDate = new Date().toLocaleDateString(); // e.g. "4/10/2025" or based on locale
    doc.text(`Completion Date: ${currentDate}`);

    doc.text(`Eligibility of Admission: ${user.basisOfAdmission || "N/A"}`);
    doc.moveDown();

    doc.fontSize(10).text("ACADEMIC RECORD", { align: "center", underline: true });
    doc.moveDown();
    doc.font("Courier");

    const semesters = ["I", "II"];
    const sgpas = [];
    const creditList = [];

    const columnWidths = {
      code: 12,   // Course code width
      title: 45,  // Course title width
      credit: 6,  // Credit width
      grade: 6,   // Grade width
      points: 6,  // Points width
    };

    for (const semester of semesters) {
      doc.fontSize(10).font("Courier-Bold").text(`Semester ${semester}`, { align: "left" });
      doc.moveDown();

      // Print the table header with fixed widths
      doc.font("Courier-Bold").text(
        "Course No".padEnd(columnWidths.code) +
        "Course Title".padEnd(columnWidths.title) +
        "Hrs".padEnd(columnWidths.credit) +
        "Gr".padEnd(columnWidths.grade) +
        "Pts".padEnd(columnWidths.points),
        50
      );
      doc.text("-".repeat(80), 50);
      doc.moveDown();

      const semesterCourses = courses.filter((c) => c.semester === semester);
      let totalCredits = 0;
      let totalPoints = 0;
      let hasFail = false;

      semesterCourses.forEach((course) => {
        const score = user.grades?.[course.code]?.score || 0;
        const { grade, pts } = getGradeAndPts(score, course.credit);

        totalCredits += course.credit;
        totalPoints += pts;
        if (grade === "F") hasFail = true;

        // Align each column to its respective width
        let line = course.code.padEnd(columnWidths.code) +
          course.title.padEnd(columnWidths.title) +
          String(course.credit).padEnd(columnWidths.credit) +
          grade.padEnd(columnWidths.grade) +
          pts.toFixed(2).padEnd(columnWidths.points);

        doc.text(line, 50);
      });

      const sgpa = totalPoints / totalCredits;
      sgpas.push(sgpa);
      creditList.push(totalCredits);

      const resultStatus = hasFail ? "FAIL" : "PASS";

      doc.moveDown();
      doc.font("Courier-Bold").text(`Total Credits: ${totalCredits} | Total Grade Points: ${totalPoints.toFixed(2)}`, 50);
      doc.font("Courier-Bold").text(`SGPA: ${sgpa.toFixed(2)}`, 50);
      doc.font("Courier-Bold").text(`Result: ${resultStatus}`, 50);
      doc.moveDown();
    }

    const totalWeightedGPA = sgpas[0] * creditList[0] + sgpas[1] * creditList[1];
    const totalCreditsAll = creditList[0] + creditList[1];
    const cgpa = totalWeightedGPA / totalCreditsAll;

    doc.moveDown();
    doc.font("Courier-Bold").fontSize(12).text(`CGPA : ${cgpa.toFixed(2)}`, { align: "center" });
    doc.moveDown(3);

    doc.font("Times-Italic").text("The Certificate is valid when it contains the ink signature of the Registrar and the embossed seal of the College.", { align: "center" });
    doc.text("ISSUED WITHOUT CORRECTION OR ERASURE", { align: "center" });
    doc.moveDown(6);

    doc.text("________________________", { align: "left" });
    doc.fontSize(15).text("        Registrar", { align: "left" });
    doc.text("Date: ____________", { align: "right" });

    doc.end();
  } catch (error) {
    // console.error("Error generating individual certificate:", error);
    res.status(500).json({ message: "Server error", error });
  }
});



// 📌 Download All Transcripts
router.get("/download-certificates", async (req, res) => {
  try {
    const users = await User.find();
    if (users.length === 0) {
      return res.status(404).json({ message: "No users found." });
    }

    const archive = archiver("zip", { zlib: { level: 9 } });
    res.attachment("Certificates.zip");
    archive.pipe(res);

    const courses = [
      { code: "RELB151", title: "Christian Beliefs I/Moral Principles I", credit: 2, semester: "I", mentor: "Mrs. Sharon Clinton" },
      { code: "RELB291", title: "Apocalyptic Literature/Daniel", credit: 2, semester: "I", mentor: "Dr. Jesin Israel" },
      { code: "RELB125", title: "Life and Teachings of Jesus", credit: 3, semester: "I", mentor: "Mr. Gaiphun Gangmei" },
      { code: "RELB238", title: "Adventist Heritage", credit: 3, semester: "I", mentor: "Dr. Koberson Langhu" },
      { code: "EDUC131", title: "Philosophy of Education", credit: 2, semester: "I", mentor: "Dr. Carol Linda Kingston" },
      { code: "WREL234", title: "Religions of the World", credit: 3, semester: "II", mentor: "Mr. Gaiphun Gangmei" },
      { code: "HLED121", title: "Personal Health", credit: 2, semester: "II", mentor: "Pr. Vanlaltluaga Khuma" },
      { code: "RELB152", title: "Christian Beliefs II/Moral Principles II", credit: 2, semester: "II", mentor: "Mrs. Sharon Clinton" },
      { code: "FNCE252", title: "Church Stewardship & Finance", credit: 3, semester: "II", mentor: "Mr. Abhishek Lakra" },
      { code: "RELB292", title: "Apocalyptic Literature II/Revelation", credit: 2, semester: "II", mentor: "Dr. Jesin Israel" },
    ];

    const gradingScale = [
      { min: 83, grade: "A", gpa: 4.00 },
      { min: 80, grade: "A-", gpa: 3.67 },
      { min: 77, grade: "B+", gpa: 3.33 },
      { min: 73, grade: "B", gpa: 3.00 },
      { min: 70, grade: "B-", gpa: 2.67 },
      { min: 64, grade: "C+", gpa: 2.33 },
      { min: 56, grade: "C", gpa: 2.00 },
      { min: 50, grade: "C-", gpa: 1.67 },
      { min: 47, grade: "D+", gpa: 1.33 },
      { min: 43, grade: "D", gpa: 1.00 },
      { min: 40, grade: "D-", gpa: 0.67 },
      { min: 0, grade: "F", gpa: 0.00 },
    ];

    function getGradeAndPts(score, credit) {
      const matchedGrade = gradingScale.find((g) => score >= g.min) || { grade: "F", gpa: 0.00 };
      return { grade: matchedGrade.grade, pts: matchedGrade.gpa * credit };
    }

    for (const user of users) {
      const doc = new PDFDocument({ size: "A4", margins: { top: 50, left: 50, right: 50, bottom: 50 } });
      const bufferStream = new stream.PassThrough();
      doc.pipe(bufferStream);

      doc.font("Times-Bold").fontSize(16).text("SPICER MEMORIAL COLLEGE", { align: "center" });
      doc.fontSize(12).text("Aundh Post, Aundh", { align: "center" });
      doc.text("Pune 411 067, INDIA", { align: "center" });
      doc.text("Phone: 25807000, 7001", { align: "center" });
      doc.moveDown();
      doc.fontSize(14).text("Enrichment Transcript", { align: "center", underline: true });
      doc.moveDown();

      doc.fontSize(10).text(`Name: ${user.name}`);
      doc.text(`ID No: ${user.registrationNumber || "N/A"}`);
      doc.text(`Date of Birth: ${user.dateOfBirth || "N/A"}`);

      // Ensure Completion Date and Basis of Admission are not "N/A"
      const currentDate = new Date().toLocaleDateString(); // e.g. "4/10/2025" or based on locale
      doc.text(`Completion Date: ${currentDate}`);
      doc.text(`Eligibility of Admission: ${user.basisOfAdmission || "Not Available"}`);
      doc.moveDown();

      doc.fontSize(10).text("ACADEMIC RECORD", { align: "center", underline: true });
      doc.moveDown();
      doc.font("Courier");

      // Dynamically fetch semesters based on the courses the user is enrolled in
      const userSemesters = [...new Set(
        courses
          .filter(course => user.grades?.[course.code])
          .map(course => course.semester)
      )];

      const sgpas = [];
      const totalCreditList = [];

      // Adjusted column widths and padding for better alignment
      const codeWidth = 12;
      const titleWidth = 40;
      const spaceBetweenTitleAndHrs = 10; // More space between Course Title and Hrs
      const creditWidth = 6;
      const gradeWidth = 6;
      const pointsWidth = 6;

      for (const semester of userSemesters) {
        doc.fontSize(10).font("Courier-Bold").text(`Semester ${semester}`, { align: "left" });
        doc.moveDown();

        // Headers with adjusted column widths
        doc.font("Courier-Bold")
          .text("Course No".padEnd(codeWidth) + "Course Title".padEnd(titleWidth + spaceBetweenTitleAndHrs) + "Hrs".padEnd(creditWidth) + "Gr".padEnd(gradeWidth) + "Pts".padEnd(pointsWidth), 50);
        doc.text("-".repeat(80), 50);
        doc.moveDown();

        const semesterCourses = courses.filter((c) => c.semester === semester);
        let totalCredits = 0;
        let totalPoints = 0;
        let hasFail = false;

        semesterCourses.forEach((course) => {
          const score = user.grades?.[course.code]?.score || 0;
          const { grade, pts } = getGradeAndPts(score, course.credit);

          totalCredits += course.credit;
          totalPoints += pts;
          if (grade === "F") hasFail = true;

          // Adjusted column widths for better alignment
          const line = course.code.padEnd(codeWidth) + course.title.padEnd(titleWidth + spaceBetweenTitleAndHrs) + String(course.credit).padEnd(creditWidth) + grade.padEnd(gradeWidth) + pts.toFixed(2).padEnd(pointsWidth);
          doc.text(line, 50);
        });

        const sgpa = totalPoints / totalCredits;
        sgpas.push(sgpa);
        totalCreditList.push(totalCredits);

        const resultStatus = hasFail ? "FAIL" : "PASS";
        doc.moveDown();
        doc.font("Courier-Bold").text(`Total Credits: ${totalCredits} | Total Grade Points: ${totalPoints.toFixed(2)}`, 50);
        doc.font("Courier-Bold").text(`SGPA: ${sgpa.toFixed(2)}`, 50);
        doc.font("Courier-Bold").text(`Result: ${resultStatus}`, 50);
        doc.moveDown();
      }

      const totalWeightedGPA = sgpas[0] * totalCreditList[0] + sgpas[1] * totalCreditList[1];
      const totalCreditsAll = totalCreditList[0] + totalCreditList[1];
      const cgpa = totalWeightedGPA / totalCreditsAll;

      doc.moveDown();
      doc.font("Courier-Bold").fontSize(12).text(`CGPA : ${cgpa.toFixed(2)}`, { align: "center" });
      doc.moveDown(3);

      doc.font("Times-Italic").text("The Certificate is valid when it contains the ink signature of the Registrar and the embossed seal of the College.", { align: "center" });
      doc.text("ISSUED WITHOUT CORRECTION OR ERASURE", { align: "center" });
      doc.moveDown(6);

      doc.text("________________________", { align: "left" });
      doc.fontSize(15).text("        Registrar", { align: "left" });
      doc.text("Date: ____________", { align: "right" });

      doc.end();

      const pdfBuffer = await new Promise((resolve, reject) => {
        const buffers = [];
        bufferStream.on("data", (chunk) => buffers.push(chunk));
        bufferStream.on("end", () => resolve(Buffer.concat(buffers)));
        bufferStream.on("error", reject);
      });

      archive.append(pdfBuffer, { name: `${user.registrationNumber || user.name}.pdf` });
    }

    archive.finalize();
  } catch (error) {
    // console.error("Error generating certificates:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});









// Helper function to calculate grade and points
function getGradeAndPts(score, credit) {
  const gradingScale = [
    { min: 83, grade: "A", gpa: 4.00 },
    { min: 80, grade: "A-", gpa: 3.67 },
    { min: 70, grade: "B", gpa: 3.00 },
    { min: 56, grade: "C", gpa: 2.00 },
    { min: 40, grade: "D", gpa: 1.00 },
    { min: 0, grade: "F", gpa: 0.00 },
  ];

  const matchedGrade = gradingScale.find((g) => score >= g.min) || { grade: "F", gpa: 0.00 };
  return { grade: matchedGrade.grade, pts: matchedGrade.gpa * credit };
}



export default router;
