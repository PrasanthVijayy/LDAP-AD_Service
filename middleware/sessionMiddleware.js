"use strict"; // Using strict mode

import { UnauthorizedError } from "../utils/error.js";

// Helper function to check if a session is expired
// const isSessionExpired = (session) => Date.now() > session.expiry;

// sessionMiddleware.js
export const sessionMiddleware = (req, res, next) => {
  console.log("Session Middleware: Checking session...");
  console.log("Session data:", req.session);
  const loggedInStatus = req.cookies?.logged_in;

  if (!req.session || !req.session.user || loggedInStatus === "no") {
    console.error("No active session or session user data found.");
    throw new UnauthorizedError(
      "Session expired or invalid. Please login again."
    );
  }

  // Attach session user data to `req.user`
  req.user = req.session.user;
  console.log("User authenticated:", req?.user);
  next();
};
