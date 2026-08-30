require("dotenv").config();
process.env.TZ = "UTC"; // ✅ Pin the process clock to UTC so date/time logic (e.g. attendance windows) is identical no matter which country the server is deployed in

const app = require("./app");
const { runSeeders } = require("./scripts/seed");
const { registerCronJobs } = require("./cron");

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server running on port ${PORT}`);
    await runSeeders();
    await registerCronJobs();
});
