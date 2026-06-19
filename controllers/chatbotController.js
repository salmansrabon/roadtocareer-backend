// controllers/chatbotController.js
const Course = require("../models/Course");
const Package = require("../models/Package");
const Module = require("../models/Module");

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
Use ONLY the data provided below. Never invent course details, fees, or schedules.
If something is missing, tell the user to contact WhatsApp support (01782808778).

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

const stripHtml = (str) =>
  str
    ? str
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim()
    : "";

const parseClassDays = (val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return [val]; }
  }
  return [];
};

// Build context string from already-fetched courses (no extra DB query)
const buildContext = async (courses) => {
  if (!courses.length) return "No active courses currently available.";

  let ctx = "ACTIVE COURSES:\n\n";
  for (const c of courses) {
    ctx += `COURSE: ${c.course_title} (${c.course_initial})\n`;
    ctx += `- Description: ${stripHtml(c.short_description)}\n`;
    ctx += `- Batch: ${c.batch_no}\n`;
    ctx += `- Enrollment: ${c.enrollment ? "OPEN" : "CLOSED"}\n`;
    if (c.enrollment) {
      ctx += `- Enrollment Period: ${c.enrollment_start_date} to ${c.enrollment_end_date}\n`;
      ctx += `- Orientation Date: ${c.orientation_date}\n`;
      ctx += `- Classes Start: ${c.class_start_date}\n`;
      ctx += `- Class Days: ${parseClassDays(c.class_days).join(", ")}\n`;
      ctx += `- Class Time: ${c.class_time}\n`;
    }
    if (c.Packages?.length) {
      ctx += "- Packages:\n";
      c.Packages.forEach(
        (p) =>
          (ctx += `  • ${p.packageName}: ৳${p.discountedFee} (discounted), ৳${p.regularFee} (regular), ${p.installment} installment(s)\n`)
      );
    }

    const modules = await Module.findAll({ where: { courseId: c.courseId } });
    if (modules.length) {
      ctx += "- Curriculum:\n";
      modules.forEach((m) => {
        const mod = m.module;
        if (!mod) return;
        if (Array.isArray(mod)) ctx += `  * ${mod.join(", ")}\n`;
        else if (mod.topics) ctx += `  * ${mod.topics.join(", ")}\n`;
        else if (mod.title) ctx += `  * ${mod.title}\n`;
      });
    }
    ctx += "\n";
  }

  ctx += `CONTACT:
- WhatsApp: +8801782808778
- Website: https://roadtocareer.net

FAQ:
- Monthly Discount: Top 5 scorers each month get ৳500 off the next installment.
- Job Support: Mock interviews, resume reviews, and job circulars provided.
- Certificate: Requires completing minimum 7–8 projects.
- Learning Resources: Recorded videos, slides, and PDFs with lifetime access.
- Alumni: 900+ graduates, 800+ employed in QA/SDET roles.
- Instructor: Salman Rahman, Senior Software Engineer at Cefalo.
`;
  return ctx;
};

const formatTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
};

const formatDate = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const formatInstallment = (raw) => {
  try {
    const inst = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (inst?.amount) return inst.amount.map((a, i) => `Installment ${i + 1}: ৳${a}`).join(", ");
    if (inst?.total) return `${inst.total} installment(s)`;
  } catch {}
  return String(raw);
};

// Direct DB formatter — used when GPT is unavailable
const directDbResponse = (q, courses) => {
  if (!courses.length)
    return "No active courses at the moment. Contact us on WhatsApp: 01782808778.";

  // Fee check BEFORE course — "course fee" should show fees, not course listing
  if (/fee|price|cost|payment|package|installment|how much/.test(q)) {
    const lines = courses.flatMap((c) =>
      (c.Packages || []).map(
        (p) =>
          `**${c.course_title} – ${p.packageName}**\nDiscounted: ৳${p.discountedFee} | Regular: ৳${p.regularFee}\n${formatInstallment(p.installment)}`
      )
    );
    return lines.length ? "Course Fees:\n\n" + lines.join("\n\n") : null;
  }

  if (/enroll|join|admission|register/.test(q)) {
    return courses
      .map(
        (c) =>
          `**${c.course_title}**: ${
            c.enrollment
              ? `Enrollment Open (${formatDate(c.enrollment_start_date)} – ${formatDate(c.enrollment_end_date)})\nClasses start: ${formatDate(c.class_start_date)}`
              : "Enrollment Closed"
          }`
      )
      .join("\n\n");
  }

  if (/when.*start|next batch|batch start|class start/.test(q)) {
    return courses
      .filter((c) => c.class_start_date)
      .map((c) => `**${c.course_title}** (Batch ${c.batch_no}): Classes start ${formatDate(c.class_start_date)}`)
      .join("\n");
  }

  if (/schedule|class day|class time|what time|which day/.test(q)) {
    const lines = courses
      .filter((c) => c.enrollment && parseClassDays(c.class_days).length)
      .map(
        (c) =>
          `**${c.course_title}**: ${parseClassDays(c.class_days).join(", ")} | ${formatTime(c.class_time)}`
      );
    return lines.length ? "Class Schedules:\n\n" + lines.join("\n") : null;
  }

  if (/module|curriculum|syllabus|topic/.test(q)) {
    return "Curriculum details are available after enrollment. For a preview, message us on WhatsApp: 01782808778.";
  }

  // General course info — broad match last
  if (/course|about|latest|available|tell me|what is|sqa|product engineering|full stack/.test(q)) {
    return (
      "Here are our active courses:\n\n" +
      courses
        .map(
          (c) =>
            `**${c.course_title}** (Batch ${c.batch_no})\n${stripHtml(c.short_description)}\nEnrollment: ${
              c.enrollment
                ? `Open until ${formatDate(c.enrollment_end_date)} | Classes start ${formatDate(c.class_start_date)}`
                : "Closed"
            }`
        )
        .join("\n\n")
    );
  }

  return null;
};

// Truly static FAQ — no DB or GPT needed
const STATIC_FAQ = [
  {
    pattern: /^(hi+|hello+|hey+)(\s+(there|again))?[!.?\s]*$/,
    reply:
      "Hi there! Welcome to Road to SDET. I can help with course details, fees, schedules, or job support. What would you like to know?",
  },
  {
    pattern: /contact|whatsapp/,
    reply: "You can reach us on WhatsApp: 01782808778\nOr visit: roadtocareer.net",
  },
  {
    pattern: /job support|placement|career support|mock interview/,
    reply:
      "We provide full job support — mock interviews, resume reviews, and job circulars. Over 800 students are already employed!",
  },
  {
    pattern: /no money|can't afford|poor|broke|financial hardship/,
    reply:
      "We offer flexible installment plans and a ৳500 monthly discount for top performers. Message us on WhatsApp (01782808778) to find a plan that works for you.",
  },
  {
    pattern: /certificate|project requirement/,
    reply:
      "You'll receive an industry-recognized certificate after completing 7–8 practical QA/automation projects.",
  },
  {
    pattern: /resource|recording|pdf|slide/,
    reply: "All classes are recorded. You get slides, PDFs, and templates with lifetime access.",
  },
  {
    pattern: /alumni|success stor/,
    reply: "Over 900 graduates, 800+ now employed in QA/SDET roles!",
  },
  {
    pattern: /instructor|salman|cefalo/,
    reply:
      "Your instructor is Salman Rahman, Senior Software Engineer at Cefalo, with extensive QA/SDET experience.",
  },
];

const generateResponse = async (question) => {
  const q = question.toLowerCase().trim();

  // 1. Static FAQ — no DB needed
  for (const { pattern, reply } of STATIC_FAQ) {
    if (pattern.test(q)) return reply;
  }

  // 2. Fetch live course data once
  const courses = await Course.findAll({
    where: { is_enabled: true },
    include: [{ model: Package }],
  });

  // 3. Try GPT with full DB context
  const ctx = await buildContext(courses);
  const gpt = await generateGPTResponse(question, ctx);
  if (gpt) return gpt;

  // 4. GPT unavailable — answer directly from DB
  const direct = directDbResponse(q, courses);
  if (direct) return direct;

  return "I'm not entirely sure about that. For specific queries, please message our team on WhatsApp: 01782808778.";
};

const chatbotResponse = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question?.trim())
      return res.status(400).json({ message: "Please provide a question." });

    const msg = await generateResponse(question.trim());
    res.json({ message: msg });
  } catch (e) {
    console.error("Chatbot error:", e);
    res.status(500).json({ message: "Sorry, I'm facing technical issues. Please try again later." });
  }
};

module.exports = { chatbotResponse };
