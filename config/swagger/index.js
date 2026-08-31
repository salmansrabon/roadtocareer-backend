/**
 * OpenAPI 3.0 Specification for Road to SDET / Road to Career Backend API
 *
 * Assembled from one module per Swagger tag under ./paths. `app.js` requires
 * this folder as `./config/swagger`, which resolves here.
 *
 * Adding an endpoint:
 *   1. add it to the paths/ module matching its tag (create one + register it
 *      below if the tag is new, and add the tag to ./tags.js),
 *   2. document the response with a dummy payload via the ./helpers builders,
 *   3. verify against routes/*.js and the controller's real `res.json(...)`
 *      shape — response envelopes are deliberately inconsistent across this
 *      API (`{ message, data }`, `{ success, ... }`, bare arrays).
 *
 * Nothing generates this from the route files, so it only stays accurate if it
 * is updated in the same change as the route.
 */

const tags = require("./tags");
const components = require("./components");

// One entry per tag, in the order the sections should appear in Swagger UI.
const pathModules = [
  require("./paths/auth"),
  require("./paths/users"),
  require("./paths/students"),
  require("./paths/qaTalent"),
  require("./paths/courses"),
  require("./paths/modules"),
  require("./paths/packages"),
  require("./paths/payments"),
  require("./paths/assignments"),
  require("./paths/exams"),
  require("./paths/mcq"),
  require("./paths/books"),
  require("./paths/jobs"),
  require("./paths/resume"),
  require("./paths/chatbotAiVoice"),
  require("./paths/blogsEvents"),
  require("./paths/notifications"),
  require("./paths/teamsReviews"),
  require("./paths/images"),
  require("./paths/googleDrive"),
];

// Merge, refusing to let one module silently overwrite another's path. Two
// modules legitimately share a path only when they document different methods
// on it, so same-path collisions are merged per method and only a genuine
// duplicate method throws.
const paths = {};
for (const mod of pathModules) {
  for (const [route, operations] of Object.entries(mod)) {
    if (!paths[route]) {
      paths[route] = operations;
      continue;
    }
    for (const [method, operation] of Object.entries(operations)) {
      if (paths[route][method]) {
        throw new Error(`Duplicate Swagger operation: ${method.toUpperCase()} ${route}`);
      }
      paths[route][method] = operation;
    }
  }
}

const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Road to SDET - REST API Documentation",
    version: "1.0.0",
    description:
      "Comprehensive REST API documentation for the Road to SDET Learning Management & Career Placement Platform. Supports authentication, student lifecycle, courses, exams, assignments, interactive books, AI tools, and financial management.\n\nEvery operation below documents its response body with a sample payload. Response envelopes are **not** uniform across the API — some endpoints return `{ message, data }`, others `{ success, ... }`, and a few return a bare array — so check each example rather than assuming a shape.",
    contact: {
      name: "Road to SDET Engineering Team",
      url: "https://roadtocareer.net",
    },
  },
  servers: [
    {
      url: "http://localhost:5000",
      description: "Local Development Server",
    },
    {
      url: "https://courses.roadtocareer.net",
      description: "Production Server",
    },
  ],
  tags,
  components,
  paths,
};

module.exports = swaggerDocument;
