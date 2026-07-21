// Student profile completion scoring (TASK-33)
// See srs/20. profile-score-calculation.md for the full spec this implements.

// Section maximums (must sum to TOTAL_MAX_SCORE)
const BASIC_INFO_MAX = 26;
const ABOUT_ME_MAX = 5;
const SKILLS_MAX = 12;
const PROJECTS_MAX = 24;
const EMPLOYMENT_MAX = 8;
const ACADEMIC_MAX = 5;
const TRAINING_MAX = 13;
const CTFL_MAX = 7;
const TOTAL_MAX_SCORE = 100;

// Points per criterion, grouped by section
const BASIC_INFO_POINTS = {
  PHOTO: 5,
  STUDENT_ID: 1,
  BATCH_NO: 1,
  STUDENT_NAME: 1,
  EMAIL: 1,
  MOBILE: 1,
  SHOW_MOBILE_PUBLICLY: 1, // tied to Mobile being set, not the privacy flag itself
  UNIVERSITY: 1,
  PASSING_YEAR: 1,
  PROFESSION: 1,
  COMPANY: 1,
  DESIGNATION: 1,
  EXPERIENCE_IN_YEARS: 0, // credited only once, via EMPLOYMENT_POINTS.TOTAL_EXPERIENCE — both read employment.totalExperience
  LINKEDIN: 5,
  GITHUB: 5,
};

const ABOUT_ME_POINTS = {
  PROFESSIONAL_SUMMARY: ABOUT_ME_MAX,
};

const SKILLS_POINTS = {
  TECHNICAL_SKILL_PER_ITEM: 1,
  TECHNICAL_SKILL_MAX_ITEMS: 8,
  SOFT_SKILL_PER_ITEM: 1,
  SOFT_SKILL_MAX_ITEMS: 4,
};

const PROJECT_POINTS = {
  TITLE: 1,
  DESCRIPTION: 2,
  GITHUB_URL: 5,
};
const PROJECTS_MAX_COUNTED = 3; // only the top-scoring N projects contribute

const EMPLOYMENT_POINTS = {
  TOTAL_EXPERIENCE: 1, // section-level field, not per-record
  COMPANY_NAME: 1,
  DESIGNATION: 1,
  EMPLOYMENT_DURATION: 1,
  EXPERIENCE_AT_COMPANY: 1,
  JOB_RESPONSIBILITY: 3,
};

const ACADEMIC_POINTS = {
  EXAM_NAME: 2,
  INSTITUTE: 1,
  CGPA: 1,
  YEAR: 1,
};

const TRAINING_POINTS = {
  TITLE: 1,
  ISSUING_ORGANIZATION: 1,
  ISSUE_DATE: 1,
  CERTIFICATE_URL: 10,
};

const CTFL_POINTS = {
  LOOKING_FOR_JOB: 0, // persisted/displayed only, never scored
  ISTQB_CERTIFIED: 0,
  ISTQB_CERTIFICATE_URL: 5,
};

// Bonus: Road to SDET course-completion certificate (distinct from ISTQB/CTFL
// certification above). Not part of the ticket's 8 sections/100-point
// structure — an extra bonus on top, capped by the overall 100 ceiling.
const ROAD_TO_SDET_CERTIFICATE_BONUS = 5;

function isNonEmpty(value) {
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

function hostMatches(hostname, domain) {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return host === domain || host.endsWith(`.${domain}`);
}

function isValidUrl(value, domain) {
  if (typeof value !== "string" || !isNonEmpty(value)) return false;
  const trimmed = value.trim();
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (domain && !hostMatches(url.hostname, domain)) return false;
    return true;
  } catch {
    return false;
  }
}

function parseTechnicalSkills(technicalSkillRaw) {
  if (!technicalSkillRaw) return [];
  if (Array.isArray(technicalSkillRaw)) return technicalSkillRaw;
  if (typeof technicalSkillRaw !== "string") return [];
  try {
    const parsed = JSON.parse(technicalSkillRaw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // fall through to comma-split for legacy plain-string values
  }
  return technicalSkillRaw.split(",").map((s) => s.trim());
}

function parseSoftSkills(softSkillRaw) {
  if (!isNonEmpty(softSkillRaw)) return [];
  return softSkillRaw.split(",").map((s) => s.trim());
}

function scoreBasicInformation(student) {
  let score = 0;
  if (isNonEmpty(student.photo)) score += BASIC_INFO_POINTS.PHOTO;
  if (isNonEmpty(student.StudentId)) score += BASIC_INFO_POINTS.STUDENT_ID;
  if (isNonEmpty(student.batch_no)) score += BASIC_INFO_POINTS.BATCH_NO;
  if (isNonEmpty(student.student_name)) score += BASIC_INFO_POINTS.STUDENT_NAME;
  if (isNonEmpty(student.email)) score += BASIC_INFO_POINTS.EMAIL;
  const hasMobile = isNonEmpty(student.mobile);
  if (hasMobile) score += BASIC_INFO_POINTS.MOBILE;
  if (hasMobile) score += BASIC_INFO_POINTS.SHOW_MOBILE_PUBLICLY;
  if (isNonEmpty(student.university)) score += BASIC_INFO_POINTS.UNIVERSITY;
  if (isNonEmpty(student.passingYear)) score += BASIC_INFO_POINTS.PASSING_YEAR;
  if (isNonEmpty(student.profession)) score += BASIC_INFO_POINTS.PROFESSION;
  if (isNonEmpty(student.company)) score += BASIC_INFO_POINTS.COMPANY;
  if (isNonEmpty(student.designation)) score += BASIC_INFO_POINTS.DESIGNATION;
  if (isNonEmpty(student.employment?.totalExperience)) score += BASIC_INFO_POINTS.EXPERIENCE_IN_YEARS;
  if (isValidUrl(student.linkedin, "linkedin.com")) score += BASIC_INFO_POINTS.LINKEDIN;
  if (isValidUrl(student.github, "github.com")) score += BASIC_INFO_POINTS.GITHUB;
  return Math.min(score, BASIC_INFO_MAX);
}

function scoreAboutMe(student) {
  return isNonEmpty(student.aboutMe) ? ABOUT_ME_POINTS.PROFESSIONAL_SUMMARY : 0;
}

function scoreSkills(student) {
  const technicalSkills = parseTechnicalSkills(student.skill?.technical_skill).filter(isNonEmpty);
  const softSkills = parseSoftSkills(student.skill?.soft_skill).filter(isNonEmpty);
  const technicalScore = Math.min(
    technicalSkills.length * SKILLS_POINTS.TECHNICAL_SKILL_PER_ITEM,
    SKILLS_POINTS.TECHNICAL_SKILL_MAX_ITEMS
  );
  const softScore = Math.min(
    softSkills.length * SKILLS_POINTS.SOFT_SKILL_PER_ITEM,
    SKILLS_POINTS.SOFT_SKILL_MAX_ITEMS
  );
  return technicalScore + softScore;
}

function scoreProject(project) {
  if (!project) return 0;
  let score = 0;
  if (isNonEmpty(project.projectTitle)) score += PROJECT_POINTS.TITLE;
  if (isNonEmpty(project.description)) score += PROJECT_POINTS.DESCRIPTION;
  if (isValidUrl(project.github_url, "github.com")) score += PROJECT_POINTS.GITHUB_URL;
  return score;
}

function scoreProjects(student) {
  const projects = Array.isArray(student.projects) ? student.projects : [];
  const scores = projects.map(scoreProject).sort((a, b) => b - a);
  const topScoring = scores.slice(0, PROJECTS_MAX_COUNTED);
  return Math.min(topScoring.reduce((sum, s) => sum + s, 0), PROJECTS_MAX);
}

function scoreEmploymentRecord(record) {
  if (!record) return 0;
  let score = 0;
  if (isNonEmpty(record.companyName)) score += EMPLOYMENT_POINTS.COMPANY_NAME;
  if (isNonEmpty(record.designation)) score += EMPLOYMENT_POINTS.DESIGNATION;
  if (isNonEmpty(record.employmentDuration)) score += EMPLOYMENT_POINTS.EMPLOYMENT_DURATION;
  if (isNonEmpty(record.experience)) score += EMPLOYMENT_POINTS.EXPERIENCE_AT_COMPANY;
  if (isNonEmpty(record.jobResponsibility)) score += EMPLOYMENT_POINTS.JOB_RESPONSIBILITY;
  return score;
}

function scoreEmploymentHistory(student) {
  const totalExperienceScore = isNonEmpty(student.employment?.totalExperience) ? EMPLOYMENT_POINTS.TOTAL_EXPERIENCE : 0;
  const records = Array.isArray(student.employment?.company) ? student.employment.company : [];
  const highestRecordScore = records.reduce((max, r) => Math.max(max, scoreEmploymentRecord(r)), 0);
  return Math.min(totalExperienceScore + highestRecordScore, EMPLOYMENT_MAX);
}

function scoreAcademicRecord(record) {
  if (!record) return 0;
  let score = 0;
  if (isNonEmpty(record.examName)) score += ACADEMIC_POINTS.EXAM_NAME;
  if (isNonEmpty(record.institute)) score += ACADEMIC_POINTS.INSTITUTE;
  if (isNonEmpty(record.cgpa)) score += ACADEMIC_POINTS.CGPA;
  if (isNonEmpty(record.year)) score += ACADEMIC_POINTS.YEAR;
  return score;
}

function scoreAcademicInformation(student) {
  const records = Array.isArray(student.education) ? student.education : [];
  const highest = records.reduce((max, r) => Math.max(max, scoreAcademicRecord(r)), 0);
  return Math.min(highest, ACADEMIC_MAX);
}

function scoreTrainingRecord(record) {
  if (!record) return 0;
  let score = 0;
  if (isNonEmpty(record.title)) score += TRAINING_POINTS.TITLE;
  if (isNonEmpty(record.issuingOrganization)) score += TRAINING_POINTS.ISSUING_ORGANIZATION;
  if (isNonEmpty(record.issueDate)) score += TRAINING_POINTS.ISSUE_DATE;
  if (isValidUrl(record.url)) score += TRAINING_POINTS.CERTIFICATE_URL;
  return score;
}

function scoreTrainingAndCertification(student) {
  const records = Array.isArray(student.trainingCertifications) ? student.trainingCertifications : [];
  const highest = records.reduce((max, r) => Math.max(max, scoreTrainingRecord(r)), 0);
  return Math.min(highest, TRAINING_MAX);
}

function scoreJobSeekingAndCtfl(student) {
  // "Are You Looking for a Job?" is worth 0 points but must still be persisted/displayed elsewhere.
  if (student.isISTQBCertified !== "Yes") return 0;
  let score = CTFL_POINTS.ISTQB_CERTIFIED;
  if (isValidUrl(student.istqb_certificate)) score += CTFL_POINTS.ISTQB_CERTIFICATE_URL;
  return Math.min(score, CTFL_MAX);
}

function scoreRoadToSdetCertificate(student) {
  return student.get_certificate ? ROAD_TO_SDET_CERTIFICATE_BONUS : 0;
}

function calculateProfileScore(student) {
  const total =
    scoreBasicInformation(student) +
    scoreAboutMe(student) +
    scoreSkills(student) +
    scoreProjects(student) +
    scoreEmploymentHistory(student) +
    scoreAcademicInformation(student) +
    scoreTrainingAndCertification(student) +
    scoreJobSeekingAndCtfl(student) +
    scoreRoadToSdetCertificate(student);
  return Math.max(0, Math.min(total, TOTAL_MAX_SCORE));
}

module.exports = {
  calculateProfileScore,
  isValidUrl,
  isNonEmpty,
  parseTechnicalSkills,
  parseSoftSkills,
  scoreBasicInformation,
  scoreAboutMe,
  scoreSkills,
  scoreProject,
  scoreProjects,
  scoreEmploymentRecord,
  scoreEmploymentHistory,
  scoreAcademicRecord,
  scoreAcademicInformation,
  scoreTrainingRecord,
  scoreTrainingAndCertification,
  scoreJobSeekingAndCtfl,
  scoreRoadToSdetCertificate,
  // Point-value constants — exported so profileGapHelper.js (and anything else
  // that needs to explain WHY a score is what it is) stays in sync with the
  // actual scoring logic instead of hardcoding a second copy of these numbers.
  BASIC_INFO_MAX,
  ABOUT_ME_MAX,
  SKILLS_MAX,
  PROJECTS_MAX,
  EMPLOYMENT_MAX,
  ACADEMIC_MAX,
  TRAINING_MAX,
  CTFL_MAX,
  TOTAL_MAX_SCORE,
  BASIC_INFO_POINTS,
  ABOUT_ME_POINTS,
  SKILLS_POINTS,
  PROJECT_POINTS,
  PROJECTS_MAX_COUNTED,
  EMPLOYMENT_POINTS,
  ACADEMIC_POINTS,
  TRAINING_POINTS,
  CTFL_POINTS,
  ROAD_TO_SDET_CERTIFICATE_BONUS,
};
