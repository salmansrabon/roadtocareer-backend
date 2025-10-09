// controllers/chatbotController.js
const { Op } = require("sequelize");
const Course = require("../models/Course");
const Package = require("../models/Package");
const Module = require("../models/Module");

// 🔹 GPT-4o Integration
const generateGPTResponse = async (question, databaseContext) => {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a friendly, conversational assistant for Road to SDET - a software testing training program.
Be natural, empathetic, and helpful — like talking to a knowledgeable friend.
Use ONLY the data provided below. If something’s missing, tell the user to contact WhatsApp support (01782808778).

DATABASE CONTEXT:
${databaseContext}`,
          },
          { role: "user", content: question },
        ],
        temperature: 0.5,
        max_tokens: 1000,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
    const data = await res.json();
    return data.choices[0]?.message?.content || null;
  } catch (err) {
    console.error("GPT API error:", err);
    return null;
  }
};

// 🔹 Build Database Context
const getDatabaseContext = async () => {
  try {
    const courses = await Course.findAll({
      where: { is_enabled: true },
      include: [{ model: Package }],
    });
    if (!courses.length) return "Database information temporarily unavailable.";

    let ctx = "CURRENT COURSE DATA:\n\n";
    for (const c of courses) {
      ctx += `COURSE: ${c.course_title} (${c.course_initial})\n`;
      ctx += `- Description: ${c.short_description}\n`;
      ctx += `- Batch: ${c.batch_no}\n`;
      ctx += `- Enrollment: ${c.enrollment ? "OPEN" : "CLOSED"}\n`;
      if (c.enrollment) {
        ctx += `- Enrollment: ${c.enrollment_start_date} to ${c.enrollment_end_date}\n`;
        ctx += `- Orientation: ${c.orientation_date}, Classes Start: ${c.class_start_date}\n`;
        ctx += `- Class Days: ${c.class_days.join(", ")} | Time: ${c.class_time}\n`;
      }
      c.Packages?.forEach(
        (p) =>
          (ctx += `  • ${p.packageName}: ৳${p.studentFee} (Student), ৳${p.jobholderFee} (Job Holder), ${p.installment} installments\n`)
      );

      const modules = await Module.findAll({ where: { courseId: c.courseId } });
      modules.forEach((m) => {
        const mod = m.module;
        if (!mod) return;
        if (Array.isArray(mod)) ctx += `  * ${mod.join(", ")}\n`;
        else if (mod.topics) ctx += `  * ${mod.topics.join(", ")}\n`;
        else if (mod.title) ctx += `  * ${mod.title}\n`;
      });
      ctx += "\n";
    }

    ctx += `
CONTACT INFO:
- WhatsApp: 01782808778
- Website: roadtocareer.net

FAQ:
- Discount: Top 5 scorers get ৳500 off next month.
- Job Support: Mock interviews, resume reviews, job circulars.
- Certificate: 7–8 projects required.
- Resources: Recordings, slides, PDFs, templates.
- Alumni: 900+ completed, 800+ employed.
- Instructor: Salman Rahman (Senior Software Engineer, Cefalo).
- Regular Batch: Sat–Mon, 8:30–10:30 PM.
- Job Holder Batch: Fri–Sat, 8:30–11:00 PM.
`;
    return ctx;
  } catch (e) {
    console.error("DB context error:", e);
    return "Database information temporarily unavailable.";
  }
};

// 🔹 Main Logic
const generateResponse = async (question) => {
  const q = question.toLowerCase().trim();
  const ctx = await getDatabaseContext();
  const courses = await Course.findAll({ where: { is_enabled: true }, include: [{ model: Package }] });
  if (!courses.length) return "No active courses found at the moment.";

  // ✅ Only match pure greetings (not “hi what is the fee”)
  if ((/\bhi\b|\bhello\b/.test(q)) && !/(fee|price|course|schedule|job|batch)/.test(q)) {
    return "Hi there! 👋 Welcome to Road to SDET. I can help with course details, fees, schedules, or job support. What would you like to know?";
  }

  // Financial concerns
  if (/no money|can't afford|poor|broke|financial|cheap|expensive/.test(q))
    return "I understand that affordability matters. We offer flexible installment plans and even a ৳500 discount each month for top performers. Many of our students started small and now work in great QA jobs. Message us on WhatsApp (01782808778) to discuss a plan that fits you best.";

  // Direct contact
  if (/contact|whatsapp|support/.test(q))
    return "📱 You can reach us directly on WhatsApp: 01782808778\n🌐 Or visit: roadtocareer.net\nOur support team is quick and helpful!";

  // FAQ sections
  if (/discount|scholarship/.test(q))
    return "Yes! Top 5 scorers each month get ৳500 off next month's installment — a great way to reward hard work!";
  if (/job|placement|career/.test(q))
    return "We provide full job support — mock interviews, resume reviews, and job circulars. Over 800 students are already employed!";
  if (/certificate|project/.test(q))
    return "You'll receive an industry-recognized certificate after completing 7–8 practical QA and automation projects.";
  if (/resource|recording|pdf/.test(q))
    return "All classes are recorded, and you'll get slides, PDFs, and templates — with lifetime access.";
  if (/alumni|success/.test(q))
    return "Over 900 graduates, 800+ employed in QA/SDET roles — many working at top tech firms!";
  if (/instructor|salman|cefalo/.test(q))
    return "Your instructor is Salman Rahman, Senior Software Engineer at Cefalo, with extensive QA/SDET experience.";
  if (/batch|schedule|time/.test(q))
    return "📘 Regular Batch: Sat–Mon, 8:30–10:30 PM (6 hrs/week)\n💼 Job Holder Batch: Fri–Sat, 8:30–11:00 PM (5 hrs/week)";

  // Course listing
  if (/course|available|list/.test(q))
    return (
      "📘 Available Courses:\n\n" +
      courses
        .map(
          (c) =>
            `**${c.course_title}** (${c.course_initial})\n${c.short_description}\nBatch: ${c.batch_no}\nEnrollment: ${
              c.enrollment
                ? `Open (${c.enrollment_start_date}–${c.enrollment_end_date})`
                : "Closed"
            }\n`
        )
        .join("\n")
    );

  // Fees
  if (/fee|price|cost|payment/.test(q))
    return (
      "💰 Course Fees:\n\n" +
      courses
        .flatMap((c) =>
          c.Packages.map(
            (p) =>
              `**${c.course_title} – ${p.packageName}**\nStudent: ৳${p.studentFee}\nJob Holder: ৳${p.jobholderFee}\nInstallments: ${p.installment}`
          )
        )
        .join("\n\n")
    );

  if (/installment|payment plan/.test(q))
    return "💳 You can pay through flexible installments! Message us on WhatsApp (01782808778) for details.";

  // Curriculum
  if (/module|curriculum|syllabus|learn/.test(q)) {
    const modules = await Module.findAll();
    if (!modules.length) return "Curriculum details are shared after enrollment.";
    return (
      "📚 Course Curriculum:\n\n" +
      modules
        .map((m) =>
          Array.isArray(m.module)
            ? `• ${m.module.join(", ")}`
            : m.module?.topics
            ? `• ${m.module.topics.join(", ")}`
            : ""
        )
        .join("\n")
    );
  }

  // Enrollment
  if (/enroll|admission|join/.test(q))
    return courses
      .map(
        (c) =>
          `**${c.course_title}**: ${
            c.enrollment
              ? `✅ Open (${c.enrollment_start_date}–${c.enrollment_end_date}), starts ${c.class_start_date}`
              : "❌ Closed"
          }`
      )
      .join("\n");

  // ✅ Fallback → GPT
  const hasData = ctx.includes("৳") && !ctx.includes("temporarily unavailable");
  if (hasData) {
    const gpt = await generateGPTResponse(question, ctx);
    if (gpt) return gpt;
  }

  // Default fallback
  return "I'm not entirely sure about that, but I can help with course fees, schedules, or job support. For specific queries, please message our team on WhatsApp: 01782808778.";
};

// 🔹 Controller
const chatbotResponse = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question?.trim()) return res.status(400).json({ message: "Please provide a question." });

    const msg = await generateResponse(question.trim());
    res.json({ message: msg });
  } catch (e) {
    console.error("Chatbot error:", e);
    res.status(500).json({
      message: "Sorry, I'm facing technical issues. Please try again later.",
    });
  }
};

module.exports = { chatbotResponse };
