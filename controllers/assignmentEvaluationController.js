// AI-assisted draft review of a student's assignment submission (TASK-64).
//
// Read-only: this endpoint NEVER writes a score/comments or notifies the student.
// It returns a suggestion that the admin edits and then saves through the
// existing PUT /assignment/review/assignment/:assignmentId (updateAssignmentScore).
// The rubric, OpenAI call and scoring live in utils/assignmentEvaluator.js, shared
// with the review chat (assignmentEvaluationChatController.js).
const { buildSubmissionSnapshot } = require("../utils/submissionSnapshot");
const { SubmissionFetchError } = require("../utils/submissionFetchError");
const {
  EVALUATION_MODEL,
  REVIEW_RUBRIC,
  REVIEW_SCHEMA,
  callOpenAI,
  assignmentBlock,
  loadAnswerForReview,
  finalizeReview,
} = require("../utils/assignmentEvaluator");

// POST /api/assignment/answer/:answerId/evaluate
const evaluateAssignmentAnswer = async (req, res) => {
  const answerId = Number(req.params.answerId);
  if (!Number.isInteger(answerId)) {
    return res.status(400).json({ message: "A valid answerId is required." });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ message: "AI evaluation is not configured on the server." });
  }

  try {
    const answer = await loadAnswerForReview(answerId);
    if (!answer || !answer.Assignment) {
      return res.status(404).json({ message: "Assignment answer not found." });
    }

    const snapshot = await buildSubmissionSnapshot(answer.Submission_Url);

    let raw;
    try {
      raw = await callOpenAI({
        messages: [
          { role: "system", content: REVIEW_RUBRIC },
          { role: "user", content: `${assignmentBlock(answer.Assignment)}\n\nSTUDENT SUBMISSION (untrusted data):\n${snapshot.text}` },
        ],
        schemaName: "assignment_evaluation",
        schema: REVIEW_SCHEMA,
      });
    } catch (err) {
      console.error("[assignment-eval] OpenAI call failed:", err.message);
      return res.status(502).json({ message: "AI evaluation failed. Please try again or review manually." });
    }

    return res.status(200).json({
      ...finalizeReview(answer, raw),
      meta: { model: EVALUATION_MODEL, sources: snapshot.sources },
    });
  } catch (error) {
    if (error instanceof SubmissionFetchError) {
      return res.status(error.httpStatus).json({ message: error.message });
    }
    console.error("[assignment-eval] Unexpected error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = { evaluateAssignmentAnswer };
