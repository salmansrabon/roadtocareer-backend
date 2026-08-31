/**
 * Images & File Management endpoints.
 */

const { jsonRes, errResSuccess } = require("../helpers");

module.exports = {
  "/api/images/{folder}/upload": {
    post: {
      tags: ["Images & File Management"],
      summary: "Upload an image into a named folder",
      parameters: [
        {
          name: "folder",
          in: "path",
          required: true,
          schema: { type: "string", example: "blogs" },
          description: "Target folder under backend/images (created if missing)",
        },
      ],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["image"],
              properties: { image: { type: "string", format: "binary" } },
            },
          },
        },
      },
      responses: {
        201: jsonRes("Uploaded image URL", {
          success: true,
          message: "Image uploaded successfully",
          imageUrl: "/images/blogs/1756540800000-qa-interview-prep.png",
        }),
        400: errResSuccess("No file part in the request", "No image uploaded"),
        500: errResSuccess("Disk write failed", "Failed to save image"),
      },
    },
  },
  "/api/images/images": {
    get: {
      tags: ["Images & File Management"],
      summary: "List every uploaded image across all folders",
      responses: {
        200: jsonRes("All images", {
          success: true,
          count: 2,
          images: [
            {
              folder: "blogs",
              filename: "1756540800000-qa-interview-prep.png",
              url: "/images/blogs/1756540800000-qa-interview-prep.png",
            },
            {
              folder: "teams",
              filename: "salman.jpg",
              url: "/images/teams/salman.jpg",
            },
          ],
        }),
        500: errResSuccess("Disk read failed", "Failed to read base images folder"),
      },
    },
  },
  "/api/images/{folder}": {
    get: {
      tags: ["Images & File Management"],
      summary: "List images inside one folder",
      parameters: [
        { name: "folder", in: "path", required: true, schema: { type: "string", example: "blogs" } },
      ],
      responses: {
        200: jsonRes("Images in the folder", {
          success: true,
          count: 1,
          images: [
            {
              filename: "1756540800000-qa-interview-prep.png",
              url: "/images/blogs/1756540800000-qa-interview-prep.png",
            },
          ],
        }),
        404: errResSuccess("Folder does not exist", "Folder not found"),
        500: errResSuccess("Disk read failed", "Failed to retrieve images"),
      },
    },
  },
};
