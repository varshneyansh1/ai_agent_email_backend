import express from "express";
import passport from "../config/auth.js";
import { getUserByEmail, deleteUser } from "../models/userModel.js";

const router = express.Router();

// Get user profile if authenticated
router.get("/profile", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await getUserByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return user profile without sensitive information
    res.json({
      email: user.email,
      name: user.name,
      id: user.id,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Redirect to Google OAuth login
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email", "https://mail.google.com/"],
  })
);

// Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/login-failed" }),
  (req, res) => {
    res.json({ message: "Login successful", user: req.user });
  }
);

// Login failed route
router.get("/login-failed", (req, res) => {
  res.status(401).json({ error: "Login failed" });
});

// Logout route
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Logged out successfully" });
  });
});

// Delete account
router.delete("/account", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    await deleteUser(req.user.email);
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: "Account deleted successfully" });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
