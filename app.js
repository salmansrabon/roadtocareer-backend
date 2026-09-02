const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const courseRoutes = require("./routes/courseRoutes");
const packageRoutes = require("./routes/packageRoutes");
const studentRoutes = require("./routes/studentRoutes");
const userRoutes = require("./routes/userRoutes");
const moduleRoutes = require("./routes/moduleRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const teamRoutes = require("./routes/teamRoutes");
const imageRoutes = require("./routes/imageRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const mcqRoutes = require("./routes/mcqRoutes");
const mcqConfigRoutes = require("./routes/mcqConfigRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const jobRoutes = require("./routes/jobRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");
const examRoutes = require("./routes/examRoutes");
const seoRoutes = require("./routes/seoRoutes");
const aiVoiceRoutes = require("./routes/aiVoiceRoutes");
const blogRoutes = require("./routes/blogRoutes");
const eventFormRoutes = require("./routes/eventFormRoutes");
const eventRoutes = require("./routes/eventRoutes");
const bookRoutes = require("./routes/bookRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./config/swagger");
const swaggerAuth = require("./middlewares/swaggerAuth");

const app = express();

// Trust the reverse proxy so req.ip resolves the real client IP (needed for
// per-IP job view tracking) instead of always seeing the proxy's address.
app.set("trust proxy", true);

// ✅ CORS Configuration - Allow requests from frontend
const corsOptions = {
    origin: [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://localhost:3002", 
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "https://www.roadtocareer.net",
        "https://roadtocareer.net",
        "https://courses.roadtocareer.net",
        process.env.FRONTEND_URL
    ].filter(Boolean),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.use(cookieParser()); // TASK-47: reads the httpOnly auth cookie into req.cookies
app.use(express.json({ limit: "50mb" })); // Increased limit for certificate images
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Prevent Nginx/browser from caching API responses
app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
});

// API Routes
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
app.use("/api/blogs", blogRoutes);
app.use("/api", eventFormRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/notifications", notificationRoutes);

// ✅ Swagger API Documentation (Protected with Basic Auth)
app.use("/swagger", swaggerAuth, swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customSiteTitle: "Road to SDET API Documentation",
    swaggerOptions: {
        persistAuthorization: true,
    }
}));

app.get("/swagger.json", swaggerAuth, (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerDocument);
});

module.exports = app;
