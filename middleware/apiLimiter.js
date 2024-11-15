"use strict"; // Using strict mode

//API Rate Limiter to stop BRUTE FORCE ATTACKS.

import rateLimit from "express-rate-limit";
import { TooManyRequestsError } from "../utils/error.js";

const apiLimiter = (n) => {
  const limit = n || 100; // If no limit is provided, default to 100 requests per minute

  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes waiting window
    max: limit,
    handler: () => {
      throw new TooManyRequestsError(
        "You have exceeded the maximum number of requests. Please wait before trying again."
      );
    },
    standardHeaders: false, // Disable the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });
};

export default apiLimiter;
