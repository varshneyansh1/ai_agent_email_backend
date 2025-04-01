import { getUserByEmail } from "../models/userModel.js";

/**
 * Middleware to check if a user is authenticated
 * Looks for email in query parameters or request body
 */
export const isAuthenticated = async (req, res, next) => {
  try {
    // Get email from query params or request body
    const email = req.query.email || req.body.senderEmail || req.body.email;

    if (!email) {
      return res
        .status(401)
        .json({ error: "Authentication required. Email not provided." });
    }

    // Get user from database
    const user = await getUserByEmail(email);

    if (!user || !user.access_token) {
      return res
        .status(401)
        .json({ error: "User not authenticated or token missing" });
    }

    // Add user to request object for use in route handlers
    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ error: "Authentication error: " + error.message });
  }
};
