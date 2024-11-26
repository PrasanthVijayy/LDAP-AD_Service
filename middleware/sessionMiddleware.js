"use strict"; // Using strict mode

import { UnauthorizedError } from "../utils/error.js";

// Middleware to check session validity and manage `logged_in` cookie
export const sessionMiddleware = (req, res, next) => {
  console.log("Session Middleware: Checking session...");
  // console.log("Session data:", req.session);

  const loggedInStatus = req.cookies?.logged_in;

  // Check if session exists and has valid user data
  if (!req.session || !req.session.user) {
    console.error("No active session or session user data found.");

    // Ensure the `logged_in` cookie is set to "no"
    res.cookie("logged_in", "no", {
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
      path: "/",
      maxAge: 31536000, // 1 year
    });

    // Throw unauthorized error
    throw new UnauthorizedError(
      "Session expired or invalid. Please login again."
    );
  }

  // Check if the session has expired based on maxAge
  const now = Date.now();
  const sessionExpiryTime = req.session.cookie.expires;

  // console.warn("Session expiry time:", sessionExpiryTime);
  if (sessionExpiryTime && now > sessionExpiryTime) {
    console.error("Session has expired.");

    // Clear the session and set `logged_in` cookie to "no"
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
      }
    });

    res.cookie("logged_in", "no", {
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
      path: "/",
      maxAge: 31536000, // 1 year
    });

    // Throw unauthorized error if the session has expired
    throw new UnauthorizedError("Session expired. Please login again.");
  }

  // Sync `logged_in` cookie with session state if not already "yes"
  if (loggedInStatus !== "yes") {
    res.cookie("logged_in", "yes", {
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
      path: "/",
      maxAge: 31536000, // 1 year
    });
  }

  // Attach session user data to `req.user` for downstream use
  req.user = req.session.user;
  console.log("User authenticated:", req?.user);
  next();
};
