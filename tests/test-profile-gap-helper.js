/**
 * Manual verification for profileGapHelper.js's core invariant:
 *   sum(section.missingItems[].pointsAvailable) === section.sectionMaxAchievable - section.currentSectionScore
 * for every section, on every fixture. This is what guarantees the gap list
 * shown to a student can never disagree with their actual profile_score —
 * re-run this after any future point-value tuning in profileScoreHelper.js.
 *
 * Run with: node tests/test-profile-gap-helper.js
 */
const { calculateProfileScore } = require("../utils/profileScoreHelper");
const { getProfileGapAnalysis, detectEmploymentStatus } = require("../utils/profileGapHelper");

const baseFields = {
  StudentId: "X", batch_no: "14", student_name: "Test Student", email: "x@x.com",
};

const fixtures = {
  "Empty profile (score ~0)": {
    ...baseFields,
    photo: null, mobile: null, university: null, passingYear: null, profession: null,
    company: null, designation: null, linkedin: null, github: null, aboutMe: null,
    employment: null, skill: null, projects: null, education: null, trainingCertifications: null,
    isISTQBCertified: "No", istqb_certificate: null, get_certificate: false,
  },
  "Near threshold (68ish), fresher": {
    ...baseFields,
    photo: "https://example.com/p.jpg", mobile: "017x", university: "BUP", passingYear: "2024",
    profession: "Fresh Graduate", company: "", designation: "",
    employment: null,
    linkedin: "https://linkedin.com/in/x", github: "https://github.com/x",
    aboutMe: "Summary",
    skill: { technical_skill: JSON.stringify(["a", "b", "c", "d", "e", "f", "g"]), soft_skill: "a,b,c" },
    projects: [
      { projectTitle: "P1", description: "desc", github_url: "https://github.com/x/p1" },
      { projectTitle: "P2", description: "desc", github_url: "https://github.com/x/p2" },
    ],
    education: [{ examName: "BSc", institute: "BUP", cgpa: "3.8", year: "2024" }],
    trainingCertifications: null,
    isISTQBCertified: "No", istqb_certificate: null, get_certificate: false,
  },
  "Job holder missing only ISTQB": {
    ...baseFields,
    photo: "https://example.com/p.jpg", mobile: "017x", university: "BUP", passingYear: "2024",
    profession: "QA Engineer", company: "Acme Corp", designation: "QA Engineer",
    employment: { totalExperience: "2", company: [{ companyName: "Acme Corp", designation: "QA Engineer", employmentDuration: "2yr", experience: "good", jobResponsibility: "testing" }] },
    linkedin: "https://linkedin.com/in/x", github: "https://github.com/x",
    aboutMe: "Summary",
    skill: { technical_skill: JSON.stringify(["a", "b", "c", "d", "e", "f", "g", "h"]), soft_skill: "a,b,c,d" },
    projects: [
      { projectTitle: "P1", description: "desc", github_url: "https://github.com/x/p1" },
      { projectTitle: "P2", description: "desc", github_url: "https://github.com/x/p2" },
      { projectTitle: "P3", description: "desc", github_url: "https://github.com/x/p3" },
    ],
    education: [{ examName: "BSc", institute: "BUP", cgpa: "3.8", year: "2024" }],
    trainingCertifications: [{ title: "Cert", issuingOrganization: "Org", issueDate: "2024", url: "https://cert.example.com/x" }],
    isISTQBCertified: "No", istqb_certificate: null, get_certificate: true,
  },
  "Fresher missing everything non-basic": {
    ...baseFields,
    photo: "https://example.com/p.jpg", mobile: "017x", university: "BUP", passingYear: "2024",
    profession: "Student", company: "", designation: "",
    employment: null,
    linkedin: null, github: null,
    aboutMe: null,
    skill: null, projects: null, education: null, trainingCertifications: null,
    isISTQBCertified: "No", istqb_certificate: null, get_certificate: false,
  },
  "Invalid URLs (present but wrong domain)": {
    ...baseFields,
    photo: "https://example.com/p.jpg", mobile: "017x", university: "BUP", passingYear: "2024",
    profession: "QA Engineer", company: "Acme", designation: "QA",
    employment: { totalExperience: "1", company: [{ companyName: "Acme", designation: "QA", employmentDuration: "1yr", experience: "ok", jobResponsibility: "testing" }] },
    linkedin: "https://facebook.com/not-linkedin", github: "https://gitlab.com/not-github",
    aboutMe: "Summary",
    skill: { technical_skill: JSON.stringify(["a", "b"]), soft_skill: "a" },
    projects: [{ projectTitle: "P1", description: "desc", github_url: "https://gitlab.com/x/p1" }],
    education: [{ examName: "BSc", institute: "BUP", cgpa: "3.8", year: "2024" }],
    trainingCertifications: [{ title: "Cert", issuingOrganization: "Org", issueDate: "2024", url: "not-a-url" }],
    isISTQBCertified: "Yes", istqb_certificate: "not-a-url", get_certificate: false,
  },
};

let allPassed = true;

Object.entries(fixtures).forEach(([name, student]) => {
  const gap = getProfileGapAnalysis(student, 70);
  const directScore = calculateProfileScore(student);
  const employmentStatus = detectEmploymentStatus(student);

  console.log(`\n=== ${name} ===`);
  console.log(`currentScore: ${gap.currentScore} (calculateProfileScore direct: ${directScore}) | employmentStatus: ${employmentStatus} | pointsToThreshold: ${gap.pointsToThreshold} | pointsToMax: ${gap.pointsToMax}`);

  if (gap.currentScore !== directScore) {
    console.error(`  ❌ MISMATCH: gap.currentScore (${gap.currentScore}) !== calculateProfileScore() (${directScore})`);
    allPassed = false;
  }

  gap.sections.forEach((section) => {
    const sumMissing = section.missingItems.reduce((s, i) => s + i.pointsAvailable, 0);
    const expected = section.sectionMaxAchievable - section.currentSectionScore;
    const ok = sumMissing === expected;
    if (!ok) allPassed = false;
    console.log(
      `  ${ok ? "✅" : "❌"} ${section.section}: current=${section.currentSectionScore}/${section.sectionMaxAchievable}, missing sum=${sumMissing} (expected ${expected})`
    );
    section.missingItems.forEach((item) => console.log(`      - ${item.label} (+${item.pointsAvailable}${item.optional ? ", optional" : ""})`));
  });
});

console.log(`\n${allPassed ? "✅ All invariant checks passed." : "❌ Some invariant checks FAILED — see above."}`);
process.exit(allPassed ? 0 : 1);
