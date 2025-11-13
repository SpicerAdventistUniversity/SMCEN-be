// import express from "express";
// import User from "../models/User.js";
// import PDFDocument from "pdfkit";
// import archiver from "archiver";
// import fs from "fs";
// import path from "path";
// import { fileURLToPath } from "url";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const router = express.Router();

// // Function to delete folder contents before removal
// const deleteFolderRecursive = (folderPath) => {
//   if (fs.existsSync(folderPath)) {
//     fs.readdirSync(folderPath).forEach((file) => {
//       const curPath = path.join(folderPath, file);
//       if (fs.lstatSync(curPath).isDirectory()) {
//         deleteFolderRecursive(curPath);
//       } else {
//         fs.unlinkSync(curPath);
//       }
//     });
//     fs.rmdirSync(folderPath);
//   }
// };

// // ✅ API to Fetch All Transcripts as a ZIP file
// router.get("/transcript", async (req, res) => {
//   try {
//     const users = await User.find({}, "name grades email");

//     if (users.length === 0) {
//       return res.status(404).json({ message: "No users found." });
//     }

//     const archive = archiver("zip", { zlib: { level: 9 } }); // ✅ Compression
//     res.attachment("transcripts.zip");
//     archive.pipe(res);

//     let completed = 0;
//     const tempDir = path.join(__dirname, "../temp_transcripts");

//     // Ensure temp directory exists and clean it up
//     if (fs.existsSync(tempDir)) {
//       deleteFolderRecursive(tempDir);
//     }
//     fs.mkdirSync(tempDir, { recursive: true });

//     users.forEach((user) => {
//       const filePath = path.join(tempDir, `${user.name.replace(/\s+/g, "_")}_transcript.pdf`);
//       const doc = new PDFDocument({ size: "A4", margin: 50 });
//       const writeStream = fs.createWriteStream(filePath);
//       doc.pipe(writeStream);

//       // ✅ Title
//       doc.font("Helvetica-Bold").fontSize(24).fillColor("#2E3A59").text("Academic Transcript", { align: "center" });
//       doc.moveDown(2);

//       // ✅ Student Details
//       doc.font("Helvetica").fontSize(16).text(`Name: ${user.name}`, { align: "left" });
//       doc.text(`Email: ${user.email}`, { align: "left" });
//       doc.moveDown(1);

//       // ✅ Course Grades Table
//       doc.font("Helvetica-Bold").fontSize(18).fillColor("#0073e6").text("Grades", { align: "center" });
//       doc.moveDown(1);

//       const courses = [
//         { code: "RELB151", title: "Christian Beliefs I", semester: "I" },
//         { code: "RELB291", title: "Apocalyptic Literature", semester: "I" },
//         { code: "RELB125", title: "Life and Teachings of Jesus", semester: "I" },
//         { code: "RELB238", title: "Adventist Heritage", semester: "I" },
//         { code: "EDUC231", title: "Philosophy of Education", semester: "I" },
//         { code: "RELB152", title: "Christian Beliefs II", semester: "II" },
//         { code: "FNCE451", title: "Church Stewardship & Finance", semester: "II" },
//         { code: "RELB292", title: "Apocalyptic Literature", semester: "II" },
//         { code: "RELB151_2", title: "Religions of the World", semester: "II" },
//         { code: "HLED121", title: "Personal Health", semester: "II" },
//       ];

//       courses.forEach((course) => {
//         doc.font("Helvetica-Bold").fontSize(14).fillColor("black").text(`${course.title} (${course.semester})`, { continued: true });
//         doc.font("Helvetica").fontSize(14).text(` - Grade: ${user.grades?.[course.code] || "Not Assigned"}`);
//       });

//       doc.moveDown(2);
//       doc.end();

//       writeStream.on("finish", () => {
//         archive.file(filePath, { name: `transcripts/${path.basename(filePath)}` });
//         completed++;
//         if (completed === users.length) {
//           archive.finalize();
//           archive.on("end", () => deleteFolderRecursive(tempDir)); // Cleanup only after finalization
//         }
//       });
//     });
//   } catch (error) {
//     // console.error("Error generating transcripts:", error);
//     res.status(500).json({ message: "Server error", error });
//   }
// });

// export default router;

import express from "express";
import User from "../models/User.js";
import archiver from "archiver";
import PDFDocument from "pdfkit";
import stream from "stream";
import User from "../models/userModel.js"; // adjust path if needed

// ---------- Common Data ----------
const courses = [
  { code: "RELB151", title: "Christian Beliefs I", credit: 2, semester: "I", mentor: "Mrs. Sharon Clinton" },
  { code: "RELB291", title: "Apocalyptic Literature I", credit: 2, semester: "I", mentor: "Dr. Jesin Israel" },
  { code: "RELB125", title: "Life and Teachings of Jesus", credit: 3, semester: "I", mentor: "Mr. Gaiphun Gangmei" },
  { code: "RELB238", title: "Adventist Heritage", credit: 3, semester: "I", mentor: "Dr. Koberson Langhu" },
  { code: "EDUC231", title: "Philosophy of Education", credit: 2, semester: "I", mentor: "Dr. Carol Linda Kingston" },
  { code: "WREL234", title: "Religions of the World", credit: 3, semester: "II", mentor: "Mr. Gaiphun Gangmei" },
  { code: "HLED121", title: "Personal Health", credit: 2, semester: "II", mentor: "Pr. Vanlaltluaga Khuma" },
  { code: "RELB152", title: "Christian Beliefs II", credit: 2, semester: "II", mentor: "Mrs. Sharon Clinton" },
  { code: "FNCE252", title: "Church Stewardship & Finance", credit: 3, semester: "II", mentor: "Mr. Abhishek Lakra" },
  { code: "RELB292", title: "Apocalyptic Literature II", credit: 2, semester: "II", mentor: "Dr. Jesin Israel" },
];

const gradingScale = [
  { min: 83, grade: "A", gpa: 4.0 },
  { min: 80, grade: "A-", gpa: 3.67 },
  { min: 77, grade: "B+", gpa: 3.33 },
  { min: 73, grade: "B", gpa: 3.0 },
  { min: 70, grade: "B-", gpa: 2.67 },
  { min: 64, grade: "C+", gpa: 2.33 },
  { min: 56, grade: "C", gpa: 2.0 },
  { min: 50, grade: "C-", gpa: 1.67 },
  { min: 47, grade: "D+", gpa: 1.33 },
  { min: 43, grade: "D", gpa: 1.0 },
  { min: 40, grade: "D-", gpa: 0.67 },
  { min: 0, grade: "F", gpa: 0.0 },
];

const router = express.Router();

function getGradeAndPts(score, credit) {
  const matched = gradingScale.find((g) => score >= g.min) || { grade: "F", gpa: 0 };
  return { grade: matched.grade, pts: matched.gpa * credit };
}

// ---------- Helper to generate one semester PDF ----------
async function generateSemesterPDF(user, semester) {
  const doc = new PDFDocument({ size: "A4", margins: { top: 50, left: 50, right: 50, bottom: 50 } });
  const bufferStream = new stream.PassThrough();
  doc.pipe(bufferStream);

  // Header
  doc.font("Times-Bold").fontSize(16).text("SPICER MEMORIAL COLLEGE", { align: "center" });
  doc.fontSize(12).text("Aundh Post, Aundh, Pune 411067, INDIA", { align: "center" });
  doc.text("Phone: 25807000, 7001", { align: "center" });
  doc.moveDown();
  doc.fontSize(14).text(`Semester ${semester} Marksheet`, { align: "center", underline: true });
  doc.moveDown();

  // Student details
  doc.fontSize(10)
    .text(`Name: ${user.name}`)
    .text(`ID No: ${user.registrationNumber || "N/A"}`)
    .text(`Date of Birth: ${user.dateOfBirth || "N/A"}`);
  const currentDate = new Date().toLocaleDateString();
  doc.text(`Completion Date: ${currentDate}`);
  doc.text(`Eligibility of Admission: ${user.basisOfAdmission || "N/A"}`);
  doc.moveDown();

  // Table header
  doc.fontSize(10).text("ACADEMIC RECORD", { align: "center", underline: true });
  doc.moveDown();
  doc.font("Courier-Bold").text(
    "Course No".padEnd(12) + "Course Title".padEnd(40) + "Hrs".padEnd(6) + "Gr".padEnd(6) + "Pts".padEnd(6),
    50
  );
  doc.text("-".repeat(80), 50);
  doc.moveDown();

  // Table content
  const semesterCourses = courses.filter((c) => c.semester === semester);
  let totalCredits = 0, totalPoints = 0, hasFail = false;
  semesterCourses.forEach((course) => {
    const score = user.grades?.[course.code]?.score || 0;
    const { grade, pts } = getGradeAndPts(score, course.credit);
    totalCredits += course.credit;
    totalPoints += pts;
    if (grade === "F") hasFail = true;

    const line =
      course.code.padEnd(12) +
      course.title.padEnd(40) +
      String(course.credit).padEnd(6) +
      grade.padEnd(6) +
      pts.toFixed(2).padEnd(6);
    doc.text(line, 50);
  });

  doc.moveDown();
  const sgpa = totalPoints / totalCredits;
  doc.font("Courier-Bold")
    .text(`Total Credits: ${totalCredits}`)
    .text(`Total Grade Points: ${totalPoints.toFixed(2)}`)
    .text(`SGPA: ${sgpa.toFixed(2)}`)
    .text(`Result: ${hasFail ? "FAIL" : "PASS"}`);

  doc.moveDown(3);
  doc.font("Times-Italic").text("The Marksheet is valid only with ink signature and college seal.", { align: "center" });
  doc.moveDown(5);
  doc.text("________________________", { align: "left" });
  doc.fontSize(14).text("Registrar", { align: "left" });
  doc.text("Date: ____________", { align: "right" });

  doc.end();

  const pdfBuffer = await new Promise((resolve, reject) => {
    const buffers = [];
    bufferStream.on("data", (chunk) => buffers.push(chunk));
    bufferStream.on("end", () => resolve(Buffer.concat(buffers)));
    bufferStream.on("error", reject);
  });
  return pdfBuffer;
}

// ---------- Individual Semester I ----------
router.get("/download-sem1/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found." });
    const pdfBuffer = await generateSemesterPDF(user, "I");
    res.setHeader("Content-Disposition", `attachment; filename="${user.registrationNumber || user.name}_Sem1.pdf"`);
    res.setHeader("Content-Type", "application/pdf");
    res.end(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ---------- Individual Semester II ----------
router.get("/download-sem2/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found." });
    const pdfBuffer = await generateSemesterPDF(user, "II");
    res.setHeader("Content-Disposition", `attachment; filename="${user.registrationNumber || user.name}_Sem2.pdf"`);
    res.setHeader("Content-Type", "application/pdf");
    res.end(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ---------- All Students Semester I ----------
router.get("/download-sem1", async (req, res) => {
  try {
    const users = await User.find();
    if (users.length === 0) return res.status(404).json({ message: "No users found." });

    const archive = archiver("zip", { zlib: { level: 9 } });
    res.attachment("Semester1_Marksheets.zip");
    archive.pipe(res);

    for (const user of users) {
      const pdfBuffer = await generateSemesterPDF(user, "I");
      archive.append(pdfBuffer, { name: `${user.registrationNumber || user.name}_Sem1.pdf` });
    }

    archive.finalize();
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ---------- All Students Semester II ----------
router.get("/download-sem2", async (req, res) => {
  try {
    const users = await User.find();
    if (users.length === 0) return res.status(404).json({ message: "No users found." });

    const archive = archiver("zip", { zlib: { level: 9 } });
    res.attachment("Semester2_Marksheets.zip");
    archive.pipe(res);

    for (const user of users) {
      const pdfBuffer = await generateSemesterPDF(user, "II");
      archive.append(pdfBuffer, { name: `${user.registrationNumber || user.name}_Sem2.pdf` });
    }

    archive.finalize();
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


export default router