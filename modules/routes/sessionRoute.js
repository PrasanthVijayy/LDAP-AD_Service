// sessionRoutes.js
import express from "express";
import { sessionMiddleware } from "../../middleware/sessionMiddleware.js";
import csrfProtection from "../../UI/libs/csurfProtection.js";

const sessionRoute = (app) => {
  const router = express.Router();
  app.use("/LDAP/v1/session", router);

  // SESSION CHECK ROUTE
  router.get("/check", csrfProtection, sessionMiddleware, (req, res) => {
    console.warn(
      `Session for user: ${req.user.username} & sessionID: ${req.sessionID}`
    );
    res.status(200).json({
      status: "success",
      sessionId: req.sessionID,
      message: "Session is active",
      user: { ...req.user, expiry: undefined },
    });
  });

  router.post("/logout", sessionMiddleware, (req, res) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
          return res
            .status(500)
            .json({ status: "error", message: "Failed to logout" });
        }

        // Clear session cookie
        res.clearCookie("sessionID");

        // Update `logged_in` cookie
        res.cookie("logged_in", "no", {
          httpOnly: false,
          secure: false,
          sameSite: "Lax",
          path: "/",
          maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        });

        return res.status(200).json({
          status: "success",
          message: "User logged out successfully",
        });
      });
    } else {
      res
        .status(200)
        .json({ status: "success", message: "No active session to logout" });
    }
  });
};

export default sessionRoute;
