import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

function signToken(user) {
  const secret = process.env.JWT_SECRET || "dev_jwt_secret_change_me";
  if (!process.env.JWT_SECRET) {
    console.warn("[auth] JWT_SECRET not set; using dev fallback secret.");
  }
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    secret,
    { expiresIn: "7d" }
  );
}

function sanitizeUser(row) {
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

// POST /api/auth/signup
router.post("/signup", (req, res) => {
  try {
    const db = req.app.get("db");
    const { email, password, name, role } = req.body || {};

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: "email, password, name, role are required" });
    }
    if (!["patient", "doctor"].includes(role)) {
      return res.status(400).json({ error: "role must be patient or doctor" });
    }

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
    if (existing) return res.status(409).json({ error: "Email already in use" });

    const userId = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 10);

    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)`
    ).run(userId, email.toLowerCase(), passwordHash, name, role);

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    const token = signToken(user);
    res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Signup failed" });
  }
});

// POST /api/auth/login
router.post("/login", (req, res) => {
  try {
    const db = req.app.get("db");
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email and password are required" });

    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = bcrypt.compareSync(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken(user);
    res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /api/auth/me
router.get("/me", (req, res) => {
  try {
    const db = req.app.get("db");
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;
    if (!token) return res.status(401).json({ error: "Missing auth token" });

    const secret = process.env.JWT_SECRET || "dev_jwt_secret_change_me";

    const payload = jwt.verify(token, secret);
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(payload.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user: sanitizeUser(user) });
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

export default router;

