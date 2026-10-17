// Thrown by the submission fetchers (GitHub, Google Docs/Sheets) for failures the
// admin can act on. `httpStatus` is the status the API should answer with.
class SubmissionFetchError extends Error {
  constructor(httpStatus, message) {
    super(message);
    this.httpStatus = httpStatus;
  }
}

module.exports = { SubmissionFetchError };
