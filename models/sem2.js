import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    registrationNumber: { type: String, required: true}, // ✅ capital N + uniqueness

    name: { type: String, required: true },
    paymentScreenshot: { type: String, required: true },
   selectedCourses: { type: [String], default: [], required: true },

    totalFee: { type: Number, default: 0 },
});

const sem2 = mongoose.models.sem2 || mongoose.model("sem2", userSchema);
export default sem2;
