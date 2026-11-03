// Who may appear on the public /qa-talent page. One definition shared by the default listing
// (studentController.getQaTalent) and both search endpoints (qaTalentController), so a search can
// never surface a student the default listing hides.
const { Op } = require("sequelize");

const MIN_SCORE_THRESHOLD = 70; // Minimum profile score to appear on the public QA talent page

const qaTalentGate = () => ({
  isEnrolled: 1,
  profile_score: { [Op.gte]: MIN_SCORE_THRESHOLD },
  lookingForJob: "Yes",
});

module.exports = { MIN_SCORE_THRESHOLD, qaTalentGate };
