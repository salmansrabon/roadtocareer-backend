// Profile completion gap analysis — built on top of profileScoreHelper.js's
// scoring logic (TASK-33 / TASK-38). Where scoreXxx() returns a number,
// gapXxx() returns WHICH specific fields are missing, with a human-readable
// label and the marginal points completing that field adds — reusing the
// exact same predicates (isNonEmpty/isValidUrl) so a gap list can never
// disagree with the actual score.
//
// Invariant every gapXxx() must satisfy (see backend/tests for the check):
//   sum(missingItems[].pointsAvailable) === sectionMaxAchievable - currentSectionScore

const {
  calculateProfileScore,
  isNonEmpty,
  isValidUrl,
  parseTechnicalSkills,
  parseSoftSkills,
  scoreAboutMe,
  scoreProject,
  scoreEmploymentRecord,
  scoreAcademicRecord,
  scoreTrainingRecord,
  scoreJobSeekingAndCtfl,
  scoreRoadToSdetCertificate,
  BASIC_INFO_POINTS,
  ABOUT_ME_POINTS,
  SKILLS_POINTS,
  PROJECT_POINTS,
  PROJECTS_MAX_COUNTED,
  EMPLOYMENT_POINTS,
  ACADEMIC_POINTS,
  TRAINING_POINTS,
  CTFL_POINTS,
  CTFL_MAX,
  ROAD_TO_SDET_CERTIFICATE_BONUS,
} = require("./profileScoreHelper");

// profileScoreHelper.js doesn't export scoreProject/scoreEmploymentRecord/etc.
// (they're internal helpers of the scorer) — re-declared here isn't an option
// without duplicating logic, so this file requires them to be exported too.
// (Added alongside the other additive exports in profileScoreHelper.js.)

function gapBasicInformation(student) {
  const missingItems = [];
  if (!isNonEmpty(student.photo)) missingItems.push({ label: "Add a profile photo", pointsAvailable: BASIC_INFO_POINTS.PHOTO });
  if (!isNonEmpty(student.university)) missingItems.push({ label: "Add your university name", pointsAvailable: BASIC_INFO_POINTS.UNIVERSITY });
  if (!isNonEmpty(student.passingYear)) missingItems.push({ label: "Add your passing year", pointsAvailable: BASIC_INFO_POINTS.PASSING_YEAR });
  if (!isNonEmpty(student.profession)) missingItems.push({ label: "Add your profession", pointsAvailable: BASIC_INFO_POINTS.PROFESSION });
  if (!isNonEmpty(student.company)) missingItems.push({ label: "Add your company name", pointsAvailable: BASIC_INFO_POINTS.COMPANY });
  if (!isNonEmpty(student.designation)) missingItems.push({ label: "Add your designation", pointsAvailable: BASIC_INFO_POINTS.DESIGNATION });

  const hasMobile = isNonEmpty(student.mobile);
  if (!hasMobile) {
    missingItems.push({
      label: "Add your mobile number",
      pointsAvailable: BASIC_INFO_POINTS.MOBILE + BASIC_INFO_POINTS.SHOW_MOBILE_PUBLICLY,
    });
  }

  if (!isNonEmpty(student.linkedin)) {
    missingItems.push({ label: "Add a valid LinkedIn profile URL", pointsAvailable: BASIC_INFO_POINTS.LINKEDIN });
  } else if (!isValidUrl(student.linkedin, "linkedin.com")) {
    missingItems.push({ label: "Fix your LinkedIn URL — must be a valid linkedin.com link", pointsAvailable: BASIC_INFO_POINTS.LINKEDIN });
  }

  if (!isNonEmpty(student.github)) {
    missingItems.push({ label: "Add a valid GitHub profile URL", pointsAvailable: BASIC_INFO_POINTS.GITHUB });
  } else if (!isValidUrl(student.github, "github.com")) {
    missingItems.push({ label: "Fix your GitHub URL — must be a valid github.com link", pointsAvailable: BASIC_INFO_POINTS.GITHUB });
  }

  // StudentId/batch_no/student_name/email are effectively always present
  // (set at enrollment) but included for completeness/robustness.
  if (!isNonEmpty(student.StudentId)) missingItems.push({ label: "Add your Student ID", pointsAvailable: BASIC_INFO_POINTS.STUDENT_ID });
  if (!isNonEmpty(student.batch_no)) missingItems.push({ label: "Add your batch number", pointsAvailable: BASIC_INFO_POINTS.BATCH_NO });
  if (!isNonEmpty(student.student_name)) missingItems.push({ label: "Add your name", pointsAvailable: BASIC_INFO_POINTS.STUDENT_NAME });
  if (!isNonEmpty(student.email)) missingItems.push({ label: "Add your email", pointsAvailable: BASIC_INFO_POINTS.EMAIL });
  // Note: EXPERIENCE_IN_YEARS is 0 pts here by design (de-duplicated into
  // Employment History — both read employment.totalExperience) — never
  // surfaced as a Basic Info gap.

  const sum = (obj) => Object.values(obj).reduce((a, b) => a + b, 0);
  const sectionMaxAchievable = sum(BASIC_INFO_POINTS);
  const currentSectionScore = sectionMaxAchievable - missingItems.reduce((s, i) => s + i.pointsAvailable, 0);

  return { section: "Basic Information", currentSectionScore, sectionMaxAchievable, missingItems };
}

function gapAboutMe(student) {
  const currentSectionScore = scoreAboutMe(student);
  const missingItems = currentSectionScore === 0
    ? [{ label: "Add a professional summary (About Me)", pointsAvailable: ABOUT_ME_POINTS.PROFESSIONAL_SUMMARY }]
    : [];
  return { section: "About Me", currentSectionScore, sectionMaxAchievable: ABOUT_ME_POINTS.PROFESSIONAL_SUMMARY, missingItems };
}

function gapSkills(student) {
  const technicalSkills = parseTechnicalSkills(student.skill?.technical_skill).filter(isNonEmpty);
  const softSkills = parseSoftSkills(student.skill?.soft_skill).filter(isNonEmpty);
  const technicalScore = Math.min(technicalSkills.length * SKILLS_POINTS.TECHNICAL_SKILL_PER_ITEM, SKILLS_POINTS.TECHNICAL_SKILL_MAX_ITEMS);
  const softScore = Math.min(softSkills.length * SKILLS_POINTS.SOFT_SKILL_PER_ITEM, SKILLS_POINTS.SOFT_SKILL_MAX_ITEMS);
  const currentSectionScore = technicalScore + softScore;
  const sectionMaxAchievable = SKILLS_POINTS.TECHNICAL_SKILL_MAX_ITEMS + SKILLS_POINTS.SOFT_SKILL_MAX_ITEMS;

  const missingItems = [];
  const techNeeded = SKILLS_POINTS.TECHNICAL_SKILL_MAX_ITEMS - technicalScore;
  if (techNeeded > 0) {
    missingItems.push({
      label: `Add ${techNeeded} more technical skill${techNeeded > 1 ? "s" : ""} (you have ${technicalSkills.length}/${SKILLS_POINTS.TECHNICAL_SKILL_MAX_ITEMS})`,
      pointsAvailable: techNeeded,
    });
  }
  const softNeeded = SKILLS_POINTS.SOFT_SKILL_MAX_ITEMS - softScore;
  if (softNeeded > 0) {
    missingItems.push({
      label: `Add ${softNeeded} more soft skill${softNeeded > 1 ? "s" : ""} (you have ${softSkills.length}/${SKILLS_POINTS.SOFT_SKILL_MAX_ITEMS})`,
      pointsAvailable: softNeeded,
    });
  }

  return { section: "Skills", currentSectionScore, sectionMaxAchievable, missingItems };
}

function gapProjects(student) {
  const projects = Array.isArray(student.projects) ? student.projects : [];
  const scored = projects.map((project) => ({ project, score: scoreProject(project) }));
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, PROJECTS_MAX_COUNTED);

  const perProjectMax = PROJECT_POINTS.TITLE + PROJECT_POINTS.DESCRIPTION + PROJECT_POINTS.GITHUB_URL;
  const sectionMaxAchievable = perProjectMax * PROJECTS_MAX_COUNTED;
  const currentSectionScore = Math.min(top.reduce((sum, t) => sum + t.score, 0), sectionMaxAchievable);

  const missingItems = [];
  for (let slot = 0; slot < PROJECTS_MAX_COUNTED; slot++) {
    const entry = top[slot];
    if (!entry) {
      missingItems.push({ label: `Add project #${slot + 1} with a title, description, and GitHub URL`, pointsAvailable: perProjectMax });
      continue;
    }
    const p = entry.project;
    const label = isNonEmpty(p.projectTitle) ? `"${p.projectTitle}"` : `project #${slot + 1}`;
    if (!isNonEmpty(p.projectTitle)) missingItems.push({ label: `Add a title for ${label}`, pointsAvailable: PROJECT_POINTS.TITLE });
    if (!isNonEmpty(p.description)) missingItems.push({ label: `Add a description for ${label}`, pointsAvailable: PROJECT_POINTS.DESCRIPTION });
    if (!isValidUrl(p.github_url, "github.com")) missingItems.push({ label: `Add a valid GitHub URL for ${label}`, pointsAvailable: PROJECT_POINTS.GITHUB_URL });
  }

  return { section: "Projects", currentSectionScore, sectionMaxAchievable, missingItems };
}

function gapEmploymentHistory(student) {
  const totalExperiencePresent = isNonEmpty(student.employment?.totalExperience);
  const records = Array.isArray(student.employment?.company) ? student.employment.company : [];

  let best = null;
  let bestScore = -1;
  records.forEach((record) => {
    const score = scoreEmploymentRecord(record);
    if (score > bestScore) {
      bestScore = score;
      best = record;
    }
  });

  const sectionMaxAchievable = EMPLOYMENT_POINTS.TOTAL_EXPERIENCE
    + EMPLOYMENT_POINTS.COMPANY_NAME + EMPLOYMENT_POINTS.DESIGNATION
    + EMPLOYMENT_POINTS.EMPLOYMENT_DURATION + EMPLOYMENT_POINTS.EXPERIENCE_AT_COMPANY
    + EMPLOYMENT_POINTS.JOB_RESPONSIBILITY;
  const currentSectionScore = Math.min(
    (totalExperiencePresent ? EMPLOYMENT_POINTS.TOTAL_EXPERIENCE : 0) + Math.max(bestScore, 0),
    sectionMaxAchievable
  );

  const missingItems = [];
  if (!totalExperiencePresent) {
    missingItems.push({ label: "Add your total years of experience", pointsAvailable: EMPLOYMENT_POINTS.TOTAL_EXPERIENCE });
  }
  if (!best) {
    missingItems.push({
      label: "Add an employment record (company, designation, duration, experience summary, and responsibilities)",
      pointsAvailable: EMPLOYMENT_POINTS.COMPANY_NAME + EMPLOYMENT_POINTS.DESIGNATION
        + EMPLOYMENT_POINTS.EMPLOYMENT_DURATION + EMPLOYMENT_POINTS.EXPERIENCE_AT_COMPANY
        + EMPLOYMENT_POINTS.JOB_RESPONSIBILITY,
    });
  } else {
    if (!isNonEmpty(best.companyName)) missingItems.push({ label: "Add your employer's company name", pointsAvailable: EMPLOYMENT_POINTS.COMPANY_NAME });
    if (!isNonEmpty(best.designation)) missingItems.push({ label: "Add your job designation", pointsAvailable: EMPLOYMENT_POINTS.DESIGNATION });
    if (!isNonEmpty(best.employmentDuration)) missingItems.push({ label: "Add your employment duration", pointsAvailable: EMPLOYMENT_POINTS.EMPLOYMENT_DURATION });
    if (!isNonEmpty(best.experience)) missingItems.push({ label: "Add a summary of your experience at this company", pointsAvailable: EMPLOYMENT_POINTS.EXPERIENCE_AT_COMPANY });
    if (!isNonEmpty(best.jobResponsibility)) missingItems.push({ label: "Add your job responsibilities", pointsAvailable: EMPLOYMENT_POINTS.JOB_RESPONSIBILITY });
  }

  return { section: "Employment History", currentSectionScore, sectionMaxAchievable, missingItems };
}

function gapAcademicInformation(student) {
  const records = Array.isArray(student.education) ? student.education : [];
  let best = null;
  let bestScore = -1;
  records.forEach((record) => {
    const score = scoreAcademicRecord(record);
    if (score > bestScore) {
      bestScore = score;
      best = record;
    }
  });

  const sectionMaxAchievable = ACADEMIC_POINTS.EXAM_NAME + ACADEMIC_POINTS.INSTITUTE + ACADEMIC_POINTS.CGPA + ACADEMIC_POINTS.YEAR;
  const currentSectionScore = Math.min(Math.max(bestScore, 0), sectionMaxAchievable);

  const missingItems = [];
  if (!best) {
    missingItems.push({ label: "Add an academic record (degree/exam name, institute, CGPA, and passing year)", pointsAvailable: sectionMaxAchievable });
  } else {
    if (!isNonEmpty(best.examName)) missingItems.push({ label: "Add your degree/exam name", pointsAvailable: ACADEMIC_POINTS.EXAM_NAME });
    if (!isNonEmpty(best.institute)) missingItems.push({ label: "Add your institute/university name", pointsAvailable: ACADEMIC_POINTS.INSTITUTE });
    if (!isNonEmpty(best.cgpa)) missingItems.push({ label: "Add your CGPA/GPA", pointsAvailable: ACADEMIC_POINTS.CGPA });
    if (!isNonEmpty(best.year)) missingItems.push({ label: "Add your passing year (academic record)", pointsAvailable: ACADEMIC_POINTS.YEAR });
  }

  return { section: "Academic Information", currentSectionScore, sectionMaxAchievable, missingItems };
}

function gapTrainingAndCertification(student) {
  const records = Array.isArray(student.trainingCertifications) ? student.trainingCertifications : [];
  let best = null;
  let bestScore = -1;
  records.forEach((record) => {
    const score = scoreTrainingRecord(record);
    if (score > bestScore) {
      bestScore = score;
      best = record;
    }
  });

  const sectionMaxAchievable = TRAINING_POINTS.TITLE + TRAINING_POINTS.ISSUING_ORGANIZATION + TRAINING_POINTS.ISSUE_DATE + TRAINING_POINTS.CERTIFICATE_URL;
  const currentSectionScore = Math.min(Math.max(bestScore, 0), sectionMaxAchievable);

  const missingItems = [];
  if (!best) {
    missingItems.push({ label: "Add a certification/training record with a valid certificate URL", pointsAvailable: sectionMaxAchievable });
  } else {
    if (!isNonEmpty(best.title)) missingItems.push({ label: "Add the certification/training title", pointsAvailable: TRAINING_POINTS.TITLE });
    if (!isNonEmpty(best.issuingOrganization)) missingItems.push({ label: "Add the issuing organization", pointsAvailable: TRAINING_POINTS.ISSUING_ORGANIZATION });
    if (!isNonEmpty(best.issueDate)) missingItems.push({ label: "Add the issue date", pointsAvailable: TRAINING_POINTS.ISSUE_DATE });
    if (!isValidUrl(best.url)) missingItems.push({ label: "Add a valid certificate URL", pointsAvailable: TRAINING_POINTS.CERTIFICATE_URL });
  }

  return { section: "Training and Certification", currentSectionScore, sectionMaxAchievable, missingItems };
}

function gapJobSeekingAndCtfl(student) {
  const currentSectionScore = scoreJobSeekingAndCtfl(student);
  // Computed analytically (capped by the legacy CTFL_MAX) rather than reading
  // CTFL_MAX directly — ISTQB_CERTIFIED was tuned to 0 pts, so the true
  // achievable ceiling (5) is now lower than the stale CTFL_MAX (7); this
  // stays correct automatically if either constant is retuned again.
  const sectionMaxAchievable = Math.min(CTFL_POINTS.ISTQB_CERTIFIED + CTFL_POINTS.ISTQB_CERTIFICATE_URL, CTFL_MAX);

  const missingItems = [];
  if (student.isISTQBCertified !== "Yes") {
    missingItems.push({
      label: "Get ISTQB (CTFL) certified and add your certificate",
      pointsAvailable: sectionMaxAchievable,
      optional: true, // a real external credential, not a fillable form field
    });
  } else if (!isValidUrl(student.istqb_certificate)) {
    missingItems.push({ label: "Add your ISTQB certificate URL", pointsAvailable: CTFL_POINTS.ISTQB_CERTIFICATE_URL });
  }

  return { section: "Job Seeking & CTFL", currentSectionScore, sectionMaxAchievable, missingItems };
}

function gapRoadToSdetCertificate(student) {
  const currentSectionScore = scoreRoadToSdetCertificate(student);
  const missingItems = student.get_certificate
    ? []
    : [{ label: "Complete the Road to SDET course to earn your certificate", pointsAvailable: ROAD_TO_SDET_CERTIFICATE_BONUS, optional: true }];
  return { section: "Road to SDET Certificate", currentSectionScore, sectionMaxAchievable: ROAD_TO_SDET_CERTIFICATE_BONUS, missingItems };
}

const FRESHER_KEYWORDS = ["student", "fresher", "fresh graduate", "graduate", "unemployed", "job seeker", "n/a"];
const JOB_HOLDER_KEYWORDS = ["engineer", "developer", "sdet", "qa", "tester", "analyst", "manager", "consultant", "specialist", "officer"];

// profession is free-text and unreliable alone — real employment data (which
// a fresher simply won't have) is the stronger signal and is checked first.
function detectEmploymentStatus(student) {
  const hasEmploymentData =
    isNonEmpty(student.company) ||
    isNonEmpty(student.designation) ||
    isNonEmpty(student.employment?.totalExperience) ||
    (Array.isArray(student.employment?.company) && student.employment.company.some((r) => isNonEmpty(r?.companyName)));
  if (hasEmploymentData) return "jobHolder";

  const profession = String(student.profession || "").toLowerCase().trim();
  if (!profession) return "unknown";
  if (FRESHER_KEYWORDS.some((k) => profession.includes(k))) return "fresher";
  if (JOB_HOLDER_KEYWORDS.some((k) => profession.includes(k))) return "jobHolder";
  return "unknown";
}

function getProfileGapAnalysis(student, threshold = 70) {
  const currentScore = calculateProfileScore(student);
  const employmentStatus = detectEmploymentStatus(student);

  const sections = [
    gapBasicInformation(student),
    gapAboutMe(student),
    gapSkills(student),
    gapProjects(student),
    gapEmploymentHistory(student),
    gapAcademicInformation(student),
    gapTrainingAndCertification(student),
    gapJobSeekingAndCtfl(student),
    gapRoadToSdetCertificate(student),
  ];

  const missingItems = sections.flatMap((s) => s.missingItems.map((item) => ({ ...item, section: s.section })));

  return {
    currentScore,
    threshold,
    employmentStatus,
    sections,
    missingItems,
    pointsToThreshold: Math.max(0, threshold - currentScore),
    pointsToMax: Math.max(0, 100 - currentScore),
  };
}

// Milestones ordered by relevance per persona — job holders lead with
// Employment since that's their most impactful open section; fresher/unknown
// leads with the course certificate since Employment isn't actionable yet.
const itemKey = (section, label) => `${section}|||${label}`;

// Only 3 genuine "milestones" toward 100%, everything else (skills, projects,
// training/certification, etc.) is a plain fillable field and belongs only in
// the "reach X%" quick-win block, never repeated here:
//   - Road to SDET course-completion certificate (everyone)
//   - Employment history (fresher/unknown only, deferred — "once you get a
//     job." A job holder already has this data available right now, so for
//     them it's just a normal quick-win field, never a separate milestone.)
//   - ISTQB certification (everyone)
// usedItemKeys excludes points already asked for in the quick-win block, so a
// milestone that's partially or fully covered there isn't repeated/inflated.
function remainingSectionPoints(section, sectionName, usedItemKeys) {
  if (!section) return 0;
  return section.missingItems
    .filter((item) => !usedItemKeys.has(itemKey(sectionName, item.label)))
    .reduce((sum, item) => sum + item.pointsAvailable, 0);
}

function buildMilestoneLines(gap, usedItemKeys = new Set()) {
  const bySection = Object.fromEntries(gap.sections.map((s) => [s.section, s]));
  const lines = [];

  const certRemaining = remainingSectionPoints(bySection["Road to SDET Certificate"], "Road to SDET Certificate", usedItemKeys);
  if (certRemaining > 0) {
    lines.push(`- Complete the Road to SDET course to earn your certificate (+${certRemaining} pts)`);
  }

  if (gap.employmentStatus !== "jobHolder") {
    const employmentRemaining = remainingSectionPoints(bySection["Employment History"], "Employment History", usedItemKeys);
    if (employmentRemaining > 0) {
      lines.push(`- Once you start working, add your employment history (+${employmentRemaining} pts)`);
    }
  }

  const ctflRemaining = remainingSectionPoints(bySection["Job Seeking & CTFL"], "Job Seeking & CTFL", usedItemKeys);
  if (ctflRemaining > 0) {
    lines.push(`- Get ISTQB (CTFL) certified and add your certificate (+${ctflRemaining} pts)`);
  }

  return lines;
}

// Replaces the old static buildReminderEmailBody — same voice/sign-off, but
// the quick-win list and milestone path are computed from the student's real
// data via getProfileGapAnalysis, not a fixed generic bullet list.
function buildPersonalizedReminderBody(student, gap) {
  const { currentScore, threshold, employmentStatus, missingItems, pointsToThreshold } = gap;

  // Quick wins toward the threshold: skip optional/milestone items, and skip
  // Employment History entirely for fresher/unknown — they don't have a job
  // yet, so asking for employment info there would be confusing, not helpful.
  const quickWinPool = missingItems
    .filter((item) => !item.optional)
    .filter((item) => employmentStatus === "jobHolder" || item.section !== "Employment History")
    .sort((a, b) => b.pointsAvailable - a.pointsAvailable);

  const quickWins = [];
  let accumulated = 0;
  for (const item of quickWinPool) {
    if (accumulated >= pointsToThreshold) break;
    quickWins.push(item);
    accumulated += item.pointsAvailable;
  }

  const MAX_RENDERED_QUICK_WINS = 8; // avoid a wall of text for near-empty profiles
  const extraCount = Math.max(0, quickWins.length - MAX_RENDERED_QUICK_WINS);
  // Selection above is highest-value-first (fewest items to reach the
  // threshold); display order is the opposite — smallest first, biggest
  // (e.g. the 13-pt certificate) last, so the list opens with easy wins.
  const renderedQuickWins = quickWins
    .slice(0, MAX_RENDERED_QUICK_WINS)
    .sort((a, b) => a.pointsAvailable - b.pointsAvailable);

  const quickWinBlock = renderedQuickWins.length > 0
    ? `\nHere's exactly what to do to reach ${threshold}%:\n${renderedQuickWins.map((item) => `- ${item.label} (+${item.pointsAvailable} pts)`).join("\n")}${extraCount > 0 ? `\n...and ${extraCount} more small item(s).` : ""}\n`
    : "";

  const almostThereNote = pointsToThreshold > 0 && pointsToThreshold <= 5
    ? "You're almost there — just a few points to go!\n\n"
    : "";

  const usedItemKeys = new Set(quickWins.map((item) => itemKey(item.section, item.label)));
  const milestoneLines = buildMilestoneLines(gap, usedItemKeys);
  const milestoneBlock = milestoneLines.length > 0
    ? `\nAfter reaching ${threshold}%, here's your path toward 100%:\n${milestoneLines.join("\n")}\n`
    : "";

  return `Dear ${student.student_name},

We noticed that your Road to SDET profile is currently ${currentScore}% complete.

${almostThereNote}Please update your profile and increase your profile completion score to at least ${threshold}%.
${quickWinBlock}${milestoneBlock}
Keeping your profile complete and up to date increases your visibility and helps us better evaluate you for internships, job opportunities, and recruiter recommendations.

Regards,
Team Road to SDET
WhatsApp: 01782808778`;
}

module.exports = {
  getProfileGapAnalysis,
  buildPersonalizedReminderBody,
  detectEmploymentStatus,
  gapBasicInformation,
  gapAboutMe,
  gapSkills,
  gapProjects,
  gapEmploymentHistory,
  gapAcademicInformation,
  gapTrainingAndCertification,
  gapJobSeekingAndCtfl,
  gapRoadToSdetCertificate,
};
