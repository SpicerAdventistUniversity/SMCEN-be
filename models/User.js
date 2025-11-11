import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
  score: { type: Number, default: 0 },
  grade: { type: String, default: "F" },
  pts: { type: Number, default: 0.0 },
  creditHours: { type: Number, required: true },
});

const userSchema = new mongoose.Schema({
  registrationNumber: { type: String, unique: true },

  // ✅ Mandatory Fields
  registrationType: { type: String, required: true, enum: ["NEW", "OLD"] },
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  dateOfBirth: { type: String, required: true }, // ✅ Date of Birth
  basisOfAdmission: { type: String, required: true }, // ✅ Basis of Admission
  collegeAttended: { type: String, required: true }, // ✅ College Attended
  gender: { type: String, required: true, enum: ["Male", "Female", "Others"] },
  maritalStatus: { type: String, required: true, enum: ["Single", "Married"] },
  motherTongue: { type: String, required: true },
  isAdventist: { type: String, required: true, enum: ["Yes", "No"] },
  phoneNumber: { type: String, required: true },
  address: { type: String, required: true },
  state: { type: String, required: true },
  paymentScreenshot: { type: String, required: true },
  photo: { type: String, required: true },

  // ✅ Optional Fields
  union: { type: String },
  sectionRegionConference: { type: String },
  workplace: { type: String },

  // ✅ Payment Screenshot (File URL)


  // ✅ Academic Grades
  grades: {
    RELB151: { type: courseSchema, default: { creditHours: 2 } },
    RELB291: { type: courseSchema, default: { creditHours: 2 } },
    RELB125: { type: courseSchema, default: { creditHours: 3 } },
    RELB238: { type: courseSchema, default: { creditHours: 3 } },
    EDUC131: { type: courseSchema, default: { creditHours: 2 } },
    WREL234: { type: courseSchema, default: { creditHours: 3 } },
    HLED121: { type: courseSchema, default: { creditHours: 2 } },
    RELB152: { type: courseSchema, default: { creditHours: 2 } },
    FNCE252: { type: courseSchema, default: { creditHours: 3 } },
    RELB292: { type: courseSchema, default: { creditHours: 2 } },
  },

  // ✅ Cumulative GPA
  cumulativeGPA: { type: Number, default: 0, min: 0, max: 4.0 },

  // ✅ New Fields from Register.jsx

  // Selected Courses
  selectedCourses: { type: [String], default: [] ,required: true}, // ✅ Added selected courses

  // Total Payment
  totalFee: { type: Number, default: 0 },
  
});

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
