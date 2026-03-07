import "dotenv/config";
import express from "express";
import cors from "cors";

import { db, initSchema } from "./db.js";

import authRouter from "./routes/auth.js";
import patientRouter from "./routes/patient.js";
import doctorRouter from "./routes/doctor.js";
import chatRouter from "./routes/chat.js";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

initSchema();
app.set("db", db);

app.use(express.json({ limit: "1mb" }));

// If you use Vite proxy, this CORS config is mostly irrelevant,
// but keeping it helps when hitting the API directly.
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/patient", patientRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/chat", chatRouter);

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});

