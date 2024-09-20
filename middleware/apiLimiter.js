//API Rate Limiter to stop BRUTE FORCE ATTACKS.

import rateLimit from "express-rate-limit";
import { TooManyRequestsError } from "../utils/error.js";

const apiLimiter = (n) => {
  return rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes waiting window
    max: n,
    handler: () => {
      throw new TooManyRequestsError(
        "Too many requests, please try again after 05 minutes."
      );
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

export default apiLimiter;
