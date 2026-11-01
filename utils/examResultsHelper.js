/**
 * One row per exam the student has submitted, newest first, for the "My Exam Results" list.
 *
 * Reads students.exam_answer. Each stored submission carries exam_id, exam_title, course_id,
 * batch_no, submission_time, answers[].max_score, total_score and is_evaluated; an older
 * entry that lacks the title, course or batch falls back to the exam's own config.
 *
 * @param {Array} submissions - students.exam_answer
 * @param {string} currentCourseId - the student's current CourseId (marks "current" vs "previous")
 * @param {Map<number, object>} [configById] - ExamConfig rows (with Course) keyed by id
 */
function summarizeExamSubmissions(submissions, currentCourseId, configById = new Map()) {
  if (!Array.isArray(submissions)) return [];

  return submissions
    .filter((sub) => sub && sub.exam_id != null)
    .map((sub) => {
      const config = configById.get(Number(sub.exam_id));
      const courseId = sub.course_id || config?.courseId || null;
      const answers = Array.isArray(sub.answers) ? sub.answers : [];
      const evaluated = !!sub.is_evaluated;
      return {
        examId: Number(sub.exam_id),
        examTitle: sub.exam_title || config?.exam_title || `Exam ${sub.exam_id}`,
        courseId,
        batch_no: sub.batch_no ?? config?.Course?.batch_no ?? null,
        isCurrentBatch: courseId !== null && courseId === currentCourseId,
        submittedAt: sub.submission_time || null,
        evaluated,
        totalScore: evaluated ? Number(sub.total_score) || 0 : null,
        maxScore: answers.reduce((sum, a) => sum + (Number(a.max_score) || 0), 0),
      };
    })
    .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
}

module.exports = { summarizeExamSubmissions };
