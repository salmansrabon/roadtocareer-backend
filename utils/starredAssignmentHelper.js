const AssignmentQuestion = require("../models/AssignmentQuestion");
const AssignmentAnswer = require("../models/AssignmentAnswer");
const { Op } = require("sequelize");

// A starred assignment only counts once reviewed with at least this share of its TotalScore.
const STARRED_PASS_PERCENT = 50;

const isPassingScore = (score, totalScore) =>
  totalScore > 0 ? score * 100 >= totalScore * STARRED_PASS_PERCENT : true;

/**
 * Certificate gate for starred assignments, scoped to one course.
 * A starred assignment is passed when the student submitted it, an admin reviewed it
 * (Score not null) and Score >= STARRED_PASS_PERCENT of TotalScore.
 *
 * @returns {Promise<{starredTotal:number, pendingStarred:Array, starredGateMet:boolean}>}
 *   pendingStarred items: { id, title, reason: "not_submitted"|"awaiting_review"|"failed", score, totalScore }
 */
const getStarredAssignmentStatus = async (studentId, courseId) => {
  if (!courseId) return { starredTotal: 0, pendingStarred: [], starredGateMet: true };

  const starred = await AssignmentQuestion.findAll({
    where: { courseId, is_starred: true },
    attributes: ["id", "Assignment_Title", "TotalScore"],
    order: [["id", "ASC"]],
  });
  if (starred.length === 0) return { starredTotal: 0, pendingStarred: [], starredGateMet: true };

  const answers = await AssignmentAnswer.findAll({
    where: { StudentId: studentId, AssignmentId: { [Op.in]: starred.map((a) => a.id) } },
    attributes: ["AssignmentId", "Score"],
  });

  // One answer per student per assignment is the norm (resubmission updates in place);
  // if duplicates ever exist, the best-scored one wins.
  const answerByAssignment = new Map();
  for (const answer of answers) {
    const current = answerByAssignment.get(answer.AssignmentId);
    const better =
      !current ||
      (answer.Score !== null && (current.Score === null || answer.Score > current.Score));
    if (better) answerByAssignment.set(answer.AssignmentId, answer);
  }

  const pendingStarred = [];
  for (const assignment of starred) {
    const answer = answerByAssignment.get(assignment.id);
    const base = {
      id: assignment.id,
      title: assignment.Assignment_Title,
      score: answer ? answer.Score : null,
      totalScore: assignment.TotalScore,
    };
    if (!answer) {
      pendingStarred.push({ ...base, reason: "not_submitted" });
    } else if (answer.Score === null || answer.Score === undefined) {
      pendingStarred.push({ ...base, reason: "awaiting_review" });
    } else if (!isPassingScore(answer.Score, assignment.TotalScore)) {
      pendingStarred.push({ ...base, reason: "failed" });
    }
  }

  return {
    starredTotal: starred.length,
    pendingStarred,
    starredGateMet: pendingStarred.length === 0,
  };
};

module.exports = { getStarredAssignmentStatus, STARRED_PASS_PERCENT };
