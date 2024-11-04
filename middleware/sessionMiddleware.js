// sessionMiddleware.js
import { v4 as uuidv4 } from "uuid";
import { UnauthorizedError } from "../utils/error.js"; // Adjust the import path as necessary

const sessions = {};

// Function to create a new session
export const createSession = (username, userType, OU) => {
  const sessionId = uuidv4(); // Generate a new unique session ID
  sessions[sessionId] = {
    username,
    userType,
    OU,
    expiry: Date.now() + 10 * 60 * 1000, // Set expiry time (10 minutes)
  };
  console.warn(`Session Created: ${sessionId}`);
  const expiryDateTime = new Date(sessions[sessionId].expiry).toLocaleString();
  console.warn(`Session Data: ${JSON.stringify({...sessions[sessionId], expiry: expiryDateTime})}`);
  return sessionId; // Return the session ID
};

// Middleware to manage sessions
export const sessionMiddleware = (req, res, next) => {
  try {
    const sessionId = req.cookies.sessionId;

    // Check if a session ID is present and valid
    if (sessionId && sessions[sessionId]) {
      const sessionData = sessions[sessionId];

      // Check if the session is still valid (not expired)
      if (Date.now() < sessionData.expiry) {
        req.user = sessionData; // Attach user data to the request object for later use
        return next(); // Proceed to the next middleware/route
      }
    }

    // Throwing the error if the session is not valid
    throw new UnauthorizedError(
      "Session expired or invalid. Please log in again."
    );
  } catch (error) {
    next(error);
  }
};
