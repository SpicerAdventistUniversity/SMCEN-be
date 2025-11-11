import { stat } from "fs";
import User from "../models/User.js";
import sem2 from "../models/sem2.js"; // ✅ Import sem2 model
import pkg from "json2csv";
import { workerData } from "worker_threads";
const { Parser } = pkg;

export const exportUsersToCSV = async (req, res) => {
  try {
    const users = await User.find({});

    const plainUsers = users.map((user) => ({
      registrationNumber: user.registrationNumber,
      registrationType: user.registrationType,
      name: user.name,
      email: user.email,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      maritalStatus: user.maritalStatus,
      motherTongue: user.motherTongue,
      phoneNumber: user.phoneNumber,
      isAdventist: user.isAdventist,
      basisOfAdmission: user.basisOfAdmission,
      collegeAttended: user.collegeAttended,
      union: user.union,
      sectionRegionConference: user.sectionRegionConference,
      address: user.address,
      state: user.state,
      workplace: user.workplace,
      selectedCourses: user.selectedCourses,
      totalFee: user.totalFee,
      paymentScreenshot: user.paymentScreenshot,
    }));

    const parser = new Parser();
    const csv = parser.parse(plainUsers);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=students.csv");
    res.status(200).end(csv);
  } catch (error) {
    // console.error(error);
    res.status(500).json({ message: "Failed to export users to CSV." });
  }
};


export const exportSem2UsersToCSV = async (req, res) => {
  try {
    const users = await sem2.find({});

    const plainUsers = users.map((user) => ({
      registrationNumber: user.registrationNumber,
      name: user.name,
      paymentScreenshot: user.paymentScreenshot,
      selectedCourses: user.selectedCourses.join(", "),
      totalFee: user.totalFee,
    }));

    const parser = new Parser();
    const csv = parser.parse(plainUsers);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=sem2_students.csv");
    res.status(200).end(csv);
  } catch (error) {
    // console.error(error);
    res.status(500).json({ message: "Failed to export Semester II users to CSV." });
  }
};