const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "nexcare_dev_secret";
const signToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: "7d" });

router.post("/signup", async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name || !role) return res.status(400).json({ error: "All fields required" });
    if (!["patient", "doctor"].includes(role)) return res.status(400).json({ error: "Invalid role" });
    const db = req.app.get("db");
    if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) {
      return res.status(409).json({ error: "Email already in use" });
    }
    const id = uuidv4();
    db.prepare("INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)")
      .run(id, email.toLowerCase(), await bcrypt.hash(password, 10), name, role);
    res.json({ token: signToken(id), user: { id, email: email.toLowerCase(), name, role } });
  } catch (err) { console.error(err); res.status(500).json({ error: "Signup failed" }); }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    const db = req.app.get("db");
    const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());
    if (!row || !(await bcrypt.compare(password, row.password_hash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const user = { id: row.id, email: row.email, name: row.name, role: row.role };
    res.json({ token: signToken(row.id), user });
  } catch (err) { console.error(err); res.status(500).json({ error: "Login failed" }); }
});

router.get("/me", authMiddleware, (req, res) => res.json({ user: req.user }));

module.exports = router;
