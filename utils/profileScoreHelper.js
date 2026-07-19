// Student profile completion scoring (TASK-33)
// See srs/20. profile-score-calculation.md for the full spec this implements.

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
  if (isNonEmpty(student.photo)) score += 5;
  if (isNonEmpty(student.StudentId)) score += 1;
  if (isNonEmpty(student.batch_no)) score += 1;
  if (isNonEmpty(student.student_name)) score += 1;
  if (isNonEmpty(student.email)) score += 1;
  const hasMobile = isNonEmpty(student.mobile);
  if (hasMobile) score += 1; // Mobile
  if (hasMobile) score += 1; // Show Mobile Publicly — tied to Mobile being set, not the privacy flag itself
  if (isNonEmpty(student.university)) score += 1;
  if (isNonEmpty(student.passingYear)) score += 1;
  if (isNonEmpty(student.profession)) score += 1;
  if (isNonEmpty(student.company)) score += 1;
  if (isNonEmpty(student.designation)) score += 1;
  if (isNonEmpty(student.employment?.totalExperience)) score += 1;
  if (isValidUrl(student.linkedin, "linkedin.com")) score += 5;
  if (isValidUrl(student.github, "github.com")) score += 5;
  return Math.min(score, 27);
}

function scoreAboutMe(student) {
  return isNonEmpty(student.aboutMe) ? 5 : 0;
}

function scoreSkills(student) {
  const technicalSkills = parseTechnicalSkills(student.skill?.technical_skill).filter(isNonEmpty);
  const softSkills = parseSoftSkills(student.skill?.soft_skill).filter(isNonEmpty);
  const technicalScore = Math.min(technicalSkills.length, 8);
  const softScore = Math.min(softSkills.length, 3);
  return technicalScore + softScore;
}

function scoreProject(project) {
  if (!project) return 0;
  let score = 0;
  if (isNonEmpty(project.projectTitle)) score += 1;
  if (isNonEmpty(project.description)) score += 2;
  if (isValidUrl(project.github_url, "github.com")) score += 5;
  return score;
}

function scoreProjects(student) {
  const projects = Array.isArray(student.projects) ? student.projects : [];
  const scores = projects.map(scoreProject).sort((a, b) => b - a);
  const topThree = scores.slice(0, 3);
  return Math.min(topThree.reduce((sum, s) => sum + s, 0), 24);
}

function scoreEmploymentRecord(record) {
  if (!record) return 0;
  let score = 0;
  if (isNonEmpty(record.companyName)) score += 1;
  if (isNonEmpty(record.designation)) score += 1;
  if (isNonEmpty(record.employmentDuration)) score += 1;
  if (isNonEmpty(record.experience)) score += 1;
  if (isNonEmpty(record.jobResponsibility)) score += 3;
  return score;
}

function scoreEmploymentHistory(student) {
  const totalExperienceScore = isNonEmpty(student.employment?.totalExperience) ? 1 : 0;
  const records = Array.isArray(student.employment?.company) ? student.employment.company : [];
  const highestRecordScore = records.reduce((max, r) => Math.max(max, scoreEmploymentRecord(r)), 0);
  return Math.min(totalExperienceScore + highestRecordScore, 8);
}

function scoreAcademicRecord(record) {
  if (!record) return 0;
  let score = 0;
  if (isNonEmpty(record.examName)) score += 2;
  if (isNonEmpty(record.institute)) score += 1;
  if (isNonEmpty(record.cgpa)) score += 1;
  if (isNonEmpty(record.year)) score += 1;
  return score;
}

function scoreAcademicInformation(student) {
  const records = Array.isArray(student.education) ? student.education : [];
  const highest = records.reduce((max, r) => Math.max(max, scoreAcademicRecord(r)), 0);
  return Math.min(highest, 5);
}

function scoreTrainingRecord(record) {
  if (!record) return 0;
  let score = 0;
  if (isNonEmpty(record.title)) score += 1;
  if (isNonEmpty(record.issuingOrganization)) score += 1;
  if (isNonEmpty(record.issueDate)) score += 1;
  if (isValidUrl(record.url)) score += 10;
  return score;
}

function scoreTrainingAndCertification(student) {
  const records = Array.isArray(student.trainingCertifications) ? student.trainingCertifications : [];
  const highest = records.reduce((max, r) => Math.max(max, scoreTrainingRecord(r)), 0);
  return Math.min(highest, 13);
}

function scoreJobSeekingAndCtfl(student) {
  // "Are You Looking for a Job?" is worth 0 points but must still be persisted/displayed elsewhere.
  if (student.isISTQBCertified !== "Yes") return 0;
  let score = 2;
  if (isValidUrl(student.istqb_certificate)) score += 5;
  return Math.min(score, 7);
}

// Bonus: Road to SDET course-completion certificate (distinct from ISTQB/CTFL
// certification above). Not part of the ticket's 8 sections/100-point
// structure — an extra 5 points on top, capped by the overall 100 ceiling.
function scoreRoadToSdetCertificate(student) {
  return student.get_certificate ? 5 : 0;
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
  return Math.max(0, Math.min(total, 100));
}

module.exports = {
  calculateProfileScore,
  isValidUrl,
  isNonEmpty,
  scoreBasicInformation,
  scoreAboutMe,
  scoreSkills,
  scoreProjects,
  scoreEmploymentHistory,
  scoreAcademicInformation,
  scoreTrainingAndCertification,
  scoreJobSeekingAndCtfl,
  scoreRoadToSdetCertificate,
};
