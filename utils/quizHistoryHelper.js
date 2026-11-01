// students.quiz_history is a JSON text column keyed by courseId, each value a LIST of attempts
// (oldest first, newest last):
//   { "<courseId>": [ { quiz_answer: [...], quiz_started_at: "<ISO>|null", archived_at: "<ISO>" }, ... ] }
// It holds the quiz attempts the student had when they were migrated, so they stay viewable
// (and restorable) instead of being destroyed by migrateStudent. A list, not one entry,
// because a same-course migration archives an attempt under the course the student is
// still in, and a later migration away archives another one under the same key.

const parseJson = (raw, fallback) => {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return parsed ?? fallback;
  } catch (err) {
    return fallback;
  }
};

const parseQuizHistory = (raw) => {
  const parsed = parseJson(raw, {});
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
};

const parseAnswers = (raw) => {
  const parsed = parseJson(raw, []);
  return Array.isArray(parsed) ? parsed : [];
};

// The archived attempts for one course as a list. Tolerates a single attempt object.
const attemptsFor = (history, courseId) => {
  const value = history[courseId];
  if (Array.isArray(value)) return value.filter((a) => a && typeof a === "object");
  return value && typeof value === "object" ? [value] : [];
};

/** The NEWEST archived attempt for one course, or null. */
const getArchivedAttempt = (rawHistory, courseId) => {
  const attempts = attemptsFor(parseQuizHistory(rawHistory), courseId);
  return attempts.length > 0 ? attempts[attempts.length - 1] : null;
};

/**
 * What migrateStudent must write to students.{quiz_answer, quiz_started_at, quiz_history}
 * when a student moves from `oldCourseId` to `newCourseId`.
 *
 *  - The quiz attempt the student has now (answers and/or a started clock) is ALWAYS archived
 *    under oldCourseId, appended to that course's list, and the live quiz is cleared, so the
 *    student can take a new quiz in the new batch.
 *  - If the student is moving BACK to a different batch that has archived attempts, the newest
 *    one becomes the live quiz again and leaves the archive (single source of truth).
 *  - Moving to the SAME course (e.g. only the package changes): the attempt is archived and the
 *    quiz cleared so a new one can be taken; nothing is restored (the archive entry just made
 *    is not the student's "other" batch).
 *
 * Pure: no DB access.
 */
function planQuizOnMigration({ oldCourseId, newCourseId, quizAnswer, quizStartedAt, quizHistory, now = new Date() }) {
  const history = parseQuizHistory(quizHistory);
  const answers = parseAnswers(quizAnswer);

  if (oldCourseId && (answers.length > 0 || quizStartedAt)) {
    history[oldCourseId] = [
      ...attemptsFor(history, oldCourseId),
      {
        quiz_answer: answers,
        quiz_started_at: quizStartedAt ? new Date(quizStartedAt).toISOString() : null,
        archived_at: now.toISOString(),
      },
    ];
  }

  let restored = null;
  if (newCourseId && newCourseId !== oldCourseId) {
    const attempts = attemptsFor(history, newCourseId);
    restored = attempts.length > 0 ? attempts[attempts.length - 1] : null;
    if (attempts.length > 1) history[newCourseId] = attempts.slice(0, -1);
    else delete history[newCourseId];
  }

  return {
    quiz_answer: restored && Array.isArray(restored.quiz_answer) && restored.quiz_answer.length > 0
      ? JSON.stringify(restored.quiz_answer)
      : null,
    quiz_started_at: restored && restored.quiz_started_at ? new Date(restored.quiz_started_at) : null,
    quiz_history: Object.keys(history).length > 0 ? JSON.stringify(history) : null,
  };
}

module.exports = { parseQuizHistory, getArchivedAttempt, planQuizOnMigration };
