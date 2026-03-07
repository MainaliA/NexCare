const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

const db = require("./db");
app.set("db", db);

app.use("/api/auth", require("./routes/auth"));
app.use("/api/patient", require("./routes/patient"));
app.use("/api/patient", require("./routes/symptoms"));
app.use("/api/doctor", require("./routes/doctor"));
app.use("/api/doctor/patients", require("./routes/daily-report"));
app.use("/api/chat", require("./routes/chat"));

app.get("/api/health", (_, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`NexCare server running on http://localhost:${PORT}`));
