/**
 * Google Drive endpoints.
 */

const { jsonRes, errResSuccess, UNAUTHORIZED, FORBIDDEN_ADMIN } = require("../helpers");

module.exports = {
  "/api/googledrive/list-folder": {
    get: {
      tags: ["Google Drive"],
      summary: "List the contents of a course's Google Drive folder",
      description: "On success the response is a **bare array** of Drive file objects, with no envelope.",
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: "parentId",
          in: "query",
          required: true,
          schema: { type: "string", example: "1AbCdEfGhIjKlMnOpQrStUvWxYz01234" },
        },
        { name: "sharedDriveId", in: "query", schema: { type: "string" } },
      ],
      responses: {
        200: jsonRes("Drive files (bare array)", [
          {
            id: "1XyZaBcDeFgHiJkLmNoPqRsTuVwX56789",
            name: "Class 12 - Explicit Waits.mp4",
            mimeType: "video/mp4",
            webViewLink: "https://drive.google.com/file/d/1XyZaBcDeFgHiJkLmNoPqRsTuVwX56789/view",
            createdTime: "2026-08-23T15:40:00.000Z",
            size: "734003200",
          },
        ]),
        400: jsonRes("parentId missing", {
          success: false,
          error: "parentId query parameter is required.",
        }),
        401: UNAUTHORIZED,
        500: jsonRes("Drive API failure", { success: false, error: "Internal server error." }),
      },
    },
  },
  "/api/googledrive/list": {
    get: {
      tags: ["Google Drive"],
      summary: "Get the public gallery of Google Drive video links",
      responses: {
        200: jsonRes("Gallery items ordered by position", {
          success: true,
          count: 1,
          data: [
            {
              id: 15,
              title: "Class 12 - Explicit Waits",
              description: "Deep dive into WebDriverWait and ExpectedConditions.",
              gdrive_link: "https://drive.google.com/file/d/1XyZaBcDeFgHiJkLmNoPqRsTuVwX56789/view",
              thumbnail: "/images/gallery/class-12.png",
              position: 1,
              createdAt: "2026-08-23T16:00:00.000Z",
              updatedAt: "2026-08-23T16:00:00.000Z",
            },
          ],
        }),
        500: errResSuccess("Unexpected server error", "Internal server error"),
      },
    },
  },
  "/api/googledrive/create": {
    post: {
      tags: ["Google Drive"],
      summary: "Add a Google Drive video link to the gallery",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["title", "gdrive_link"],
              properties: {
                title: { type: "string", example: "Class 12 - Explicit Waits" },
                description: { type: "string", example: "Deep dive into WebDriverWait." },
                gdrive_link: {
                  type: "string",
                  example: "https://drive.google.com/file/d/1XyZaBcDeFgHiJkLmNoPqRsTuVwX56789/view",
                },
                thumbnail: { type: "string", example: "/images/gallery/class-12.png" },
              },
            },
          },
        },
      },
      responses: {
        201: jsonRes("Gallery item added", {
          success: true,
          message: "Gallery item added successfully",
          data: {
            id: 15,
            title: "Class 12 - Explicit Waits",
            description: "Deep dive into WebDriverWait and ExpectedConditions.",
            gdrive_link: "https://drive.google.com/file/d/1XyZaBcDeFgHiJkLmNoPqRsTuVwX56789/view",
            thumbnail: "/images/gallery/class-12.png",
            position: 1,
            createdAt: "2026-08-23T16:00:00.000Z",
            updatedAt: "2026-08-23T16:00:00.000Z",
          },
        }),
        400: errResSuccess("Validation error", "title and gdrive_link are required"),
        401: UNAUTHORIZED,
        500: errResSuccess("Unexpected server error", "Internal server error"),
      },
    },
  },
  "/api/googledrive/upload-video/init": {
    post: {
      tags: ["Google Drive"],
      summary: "Start a chunked class-resource video upload (Admin)",
      description:
        "Chunked flow: `init` → repeated `chunk` → `complete` (or `abort`). Chunks land on disk first, then stream to Drive on completion.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["fileName", "fileSize", "totalChunks", "folderId"],
              properties: {
                fileName: { type: "string", example: "Class 12 - Explicit Waits.mp4" },
                fileSize: { type: "integer", example: 734003200 },
                totalChunks: { type: "integer", example: 140 },
                folderId: { type: "string", example: "1AbCdEfGhIjKlMnOpQrStUvWxYz01234" },
              },
            },
          },
        },
      },
      responses: {
        200: jsonRes("Upload session created", {
          success: true,
          uploadId: "8f14e45fceea167a5a36dedd4bea2543",
          totalChunks: 140,
        }),
        400: errResSuccess("Validation error", "fileName, fileSize, totalChunks and folderId are required"),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        500: errResSuccess("Unexpected server error", "Failed to initialise upload"),
      },
    },
  },
  "/api/googledrive/upload-video/complete": {
    post: {
      tags: ["Google Drive"],
      summary: "Finalise a chunked upload and push the file to Google Drive (Admin)",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["uploadId"],
              properties: {
                uploadId: { type: "string", example: "8f14e45fceea167a5a36dedd4bea2543" },
              },
            },
          },
        },
      },
      responses: {
        200: jsonRes("Upload finished", {
          success: true,
          message: "Video uploaded successfully",
          file: {
            id: "1XyZaBcDeFgHiJkLmNoPqRsTuVwX56789",
            name: "Class 12 - Explicit Waits.mp4",
            webViewLink: "https://drive.google.com/file/d/1XyZaBcDeFgHiJkLmNoPqRsTuVwX56789/view",
          },
        }),
        400: errResSuccess("Unknown or incomplete upload session", "Upload session not found"),
        401: UNAUTHORIZED,
        403: FORBIDDEN_ADMIN,
        500: errResSuccess("Drive upload failed", "Failed to upload video to Google Drive"),
      },
    },
  },
};
