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
const chatbotRoutes = require("./routes/chatbotRoutes");
const examRoutes = require("./routes/examRoutes");
const seoRoutes = require("./routes/seoRoutes");
const aiVoiceRoutes = require("./routes/aiVoiceRoutes");

// remove this block after upgrading to node 18 into cpanel
// const fetch = require('node-fetch');
// global.fetch = fetch;
// global.Headers = fetch.Headers;
// global.Request = fetch.Request;
// global.Response = fetch.Response;
// const Blob = require('fetch-blob');
// global.Blob = Blob;
// global.FormData = require('formdata-node').FormData;


const app = express();

// ✅ CORS Configuration - Allow requests from frontend
const corsOptions = {
    origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://localhost:3002', 
        'http://127.0.0.1:3001',
        'http://127.0.0.1:3002',
        'https://www.roadtocareer.net',
        'https://roadtocareer.net',
        process.env.FRONTEND_URL
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' })); // Increased limit for certificate images
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
app.use("/api/jobs", jobRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/exam", examRoutes);
app.use("/api/seo", seoRoutes);
app.use("/api/ai-voice", aiVoiceRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server running on port ${PORT}`),
    await runSeeders();
});
