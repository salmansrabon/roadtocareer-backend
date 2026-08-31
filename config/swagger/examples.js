/**
 * Dummy entities reused by more than one paths/ module.
 *
 * Fixtures used by a single module stay inline in that module, next to the
 * responses that read them. Keep these aligned with the real Sequelize models
 * and with what the controllers actually return.
 */

const EX_USER = {
  id: 214,
  username: "RTS-JAD-2601",
  email: "jane.doe@example.com",
  role: "student",
  isValid: 1,
  createdAt: "2026-01-12T06:30:00.000Z",
  updatedAt: "2026-08-20T11:05:00.000Z",
};

const EX_COURSE = {
  courseId: 7,
  batch_no: "Batch-07",
  course_title: "SDET Automation Masterclass",
  course_initial: "SDET",
  drive_folder_id: "1AbCdEfGhIjKlMnOpQrStUvWxYz01234",
  short_description: "Java, Selenium, Playwright and CI/CD for aspiring SDETs.",
  is_enabled: true,
  is_latest: true,
  enrollment: true,
  enrollment_start_date: "2026-07-01",
  enrollment_end_date: "2026-08-25",
  orientation_date: "2026-09-05",
  class_start_date: "2026-09-07",
  class_days: ["Friday", "Saturday"],
  class_time: "20:00:00",
  course_image: "/images/courses/sdet-masterclass.png",
  total_class: 32,
  createdAt: "2026-06-20T09:00:00.000Z",
  updatedAt: "2026-08-25T10:12:00.000Z",
};

const EX_STUDENT_LIST_ITEM = {
  id: 214,
  StudentId: "RTS-JAD-2601",
  student_name: "Jane Doe",
  salutation: "Ms.",
  email: "jane.doe@example.com",
  mobile: "+8801700000000",
  CourseId: 7,
  courseTitle: "SDET Automation Masterclass",
  batch_no: "Batch-07",
  previous_batch_no: "Batch-06",
  previous_course_id: 6,
  isMigrated: true,
  package: "Premium",
  university: "University of Dhaka",
  company: "Tech Corp",
  designation: "Junior QA Engineer",
  isEnrolled: true,
  due: 5000,
  profile_score: 86,
  get_certificate: true,
  remark: "2026-08-12: Migrated from Batch-06 on request.",
  createdAt: "2026-01-12T06:30:00.000Z",
  updatedAt: "2026-08-20T11:05:00.000Z",
};

const EX_STUDENT_PROFILE = {
  ...EX_STUDENT_LIST_ITEM,
  profession: "Software Engineer",
  passingYear: "2023",
  experience: "2",
  employment: [
    {
      company: "Tech Corp",
      designation: "Junior QA Engineer",
      startDate: "2024-02-01",
      endDate: null,
      isCurrent: true,
    },
  ],
  education: [
    { degree: "BSc in CSE", institute: "University of Dhaka", passingYear: "2023" },
  ],
  skill: ["Selenium", "Playwright", "Java", "REST Assured", "Jenkins"],
  projects: [
    {
      title: "E-commerce Test Automation Suite",
      url: "https://github.com/janedoe/ecom-automation",
      description: "Playwright + TypeScript regression suite with GitHub Actions CI.",
    },
  ],
  trainingCertifications: [
    { title: "ISTQB Foundation Level (CTFL)", year: "2025" },
  ],
  lookingForJob: "Yes",
  isISTQBCertified: true,
  istqb_certificate: "/images/certificates/istqb-RTS-JAD-2601.png",
  address: "Mirpur DOHS, Dhaka",
  certificate: "/images/certificates/RTS-JAD-2601.png",
  photo: "/images/students/RTS-JAD-2601.jpg",
  facebook: "https://facebook.com/janedoe",
  whatsapp: "+8801700000000",
  linkedin: "https://linkedin.com/in/janedoe",
  github: "https://github.com/janedoe",
  isMobilePublic: false,
  isEmailPublic: true,
  isLinkedInPublic: true,
  isGithubPublic: true,
  knowMe: "Facebook Group",
  opinion: "Looking forward to switching into automation full time.",
  aboutMe: "Manual QA moving into automation, strong on API testing.",
  google_access_id: "jane.doe@gmail.com",
  remarks: [
    { date: "2026-08-12", text: "Migrated from Batch-06 on request.", by: "admin" },
  ],
  courseFee: 25000,
};

const EX_PAYMENT = {
  id: 512,
  courseId: 7,
  packageId: 3,
  studentId: "RTS-JAD-2601",
  studentName: "Jane Doe",
  installmentNumber: 2,
  installmentAmount: 10000,
  paidAmount: 10000,
  dueAdjustmentType: "Discount",
  dueAdjustmentAmount: 0,
  remainingBalance: 5000,
  month: "August",
  remarks: "2nd installment via bKash",
  paymentDateTime: "2026-08-30T10:15:00.000Z",
  createdAt: "2026-08-30T10:15:02.000Z",
  updatedAt: "2026-08-30T10:15:02.000Z",
};

const EX_PACKAGE = {
  id: 3,
  courseId: 7,
  packageName: "Premium",
  discountedFee: 25000,
  regularFee: 30000,
  installment: { "1": 10000, "2": 10000, "3": 5000 },
  createdAt: "2026-06-20T09:05:00.000Z",
  updatedAt: "2026-06-20T09:05:00.000Z",
};

module.exports = {
  EX_USER,
  EX_COURSE,
  EX_STUDENT_LIST_ITEM,
  EX_STUDENT_PROFILE,
  EX_PAYMENT,
  EX_PACKAGE,
};
