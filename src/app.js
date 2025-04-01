import express from "express";
import dotenv from "dotenv";
import session from "express-session";
import passport from "./config/auth.js";
import authRoutes from "./routes/authRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";

dotenv.config();
const app = express();

// Parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Register routes
app.use("/auth", authRoutes); // Authentication routes
app.use("/email", emailRoutes); // Email-related routes

// Basic route for testing
app.get("/", (req, res) => {
  res.json({ message: "Email AI Backend API" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

export default app;
