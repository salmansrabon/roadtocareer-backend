require("dotenv").config();
const {runSeeders} = require("./scripts/seed");

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const courseRoutes = require("./routes/courseRoutes");
const packageRoutes = require("./routes/packageRoutes");
const studentRoutes = require("./routes/studentRoutes");
const userRoutes = require('./routes/userRoutes');
const moduleRoutes = require('./routes/moduleRoutes');
const paymentRoutes = require("./routes/paymentRoutes");
const teamRoutes = require("./routes/teamRoutes");
const path = require("path");
const imageRoutes = require("./routes/imageRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const mcqRoutes = require("./routes/mcqRoutes");
const mcqConfigRoutes = require("./routes/mcqConfigRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const fileRoutes  = require("./routes/fileRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const jobRoutes = require("./routes/jobRoutes");

// remove this block after upgrading to node 18 into cpanel
const fetch = require('node-fetch');
global.fetch = fetch;
global.Headers = fetch.Headers;
global.Request = fetch.Request;
global.Response = fetch.Response;
const Blob = require('fetch-blob');
global.Blob = Blob;
global.FormData = require('formdata-node').FormData;


const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/modules", moduleRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/teams", teamRoutes);
app.use("/images", express.static(path.join(__dirname, "images")));
app.use("/api/images", imageRoutes);
app.use("/api/file", fileRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/mcq", mcqRoutes);
app.use("/api/mcq-config", mcqConfigRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/assignment", assignmentRoutes);
app.use("/api/googledrive", require("./routes/googleDriveRoutes"));
app.use("/api/jobs", jobRoutes)

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`),
    await runSeeders();
});