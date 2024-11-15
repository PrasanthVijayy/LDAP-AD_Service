"use strict"; // Using strict mode

import { UnauthorizedError } from "../utils/error.js";

// const sessions = {};

// Function to create a new session
// export const createSession = (username, userType, OU) => {
//   const sessionId = uuidv4(); // Generate a new unique session ID
//   const expiryTime = Date.now() + 10 * 60 * 1000; // Set expiry time (10 minutes)

//   sessions[sessionId] = {
//     username,
//     userType,
//     OU,
//     expiry: expiryTime,
//   };

//   console.info(`Session Created: ${sessionId}`);
//   console.info(
//     `Session Data: ${JSON.stringify({
//       ...sessions[sessionId],
//       expiry: new Date(expiryTime).toLocaleString(),
//     })}`
//   );

//   return sessionId;
// };

// Helper function to check if a session is expired
// const isSessionExpired = (session) => Date.now() > session.expiry;

// sessionMiddleware.js
export const sessionMiddleware = (req, res, next) => {
  // console.log("Session Middleware: Checking session...");
  // console.log("Session data:", req.session);

  // if (!req.session || !req.session.user) {
  //   console.error("No active session or session user data found.");
  //   throw new UnauthorizedError(
  //     "Session expired or invalid. Please login again."
  //   );
  // }

  // // Attach session user data to `req.user`
  // req.user = req.session.user;
  console.log("Session Middleware: User authenticated:", req?.user);
  next();
};
