// sessionRoutes.js
import express from "express";
import { sessionMiddleware } from "../../middleware/sessionMiddleware.js";
import csrfProtection from "../../UI/libs/csurfProtection.js";
import dotenv from "dotenv";
import { BadRequestError } from "../../utils/error.js";

dotenv.config();

const sessionRoute = (app) => {
  const router = express.Router();
  app.use("/LDAP/v1/session", router);

  // SESSION CHECK ROUTE
  router.get("/check", csrfProtection, sessionMiddleware, (req, res) => {
    console.warn(
      `Session for user: ${req.user.username} & sessionID: ${req.sessionID}`
    );
    console.log("Session data:", req.session);
    res.status(200).json({
      status: "success",
      sessionId: req.sessionID,
      message: "Session is active",
      user: req.user,
    });
  });

  router.post("/logout", (req, res) => {
    if (req.session) {
      if (req.session?.user?.authMethod === "SAML") {
        console.warn(
          `User "${req.session?.user?.username}" logging out from SAML auth`
        );

        // IdP logout URL with RelayState
        const idpLogoutUrl =
          "https://sso.cybernexa.com/adfs/ls/?wa=wsignout1.0";
        const relayState = encodeURIComponent(process.env.APP_LOGIN_URL);

        const logoutUrlWithRelayState = `${idpLogoutUrl}&RelayState=${relayState}`;

        console.warn(
          `Redirecting user to SAML logout URL: ${logoutUrlWithRelayState}`
        );

        // Clear SP session
        req.session.destroy((err) => {
          if (err) {
            console.error("Error destroying session:", err);
            return res
              .status(500)
              .json({ status: "error", message: "Failed to logout from SP" });
          }

          // Clear session cookies
          res.clearCookie("sessionID");

          // Return the IdP logout URL to the frontend
          return res.status(200).json({
            status: "success",
            message: "Redirecting to SAML IdP logout",
            logoutUrl: logoutUrlWithRelayState,
          });
        });
      } else {
        // Handle non-SAML logout
        req.session.destroy((err) => {
          if (err) {
            console.error("Error destroying session:", err);
            return res
              .status(500)
              .json({ status: "error", message: "Failed to logout" });
          }

          // Clear session cookies
          res.clearCookie("sessionID");

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
      }
    } else {
      // No active session
      res
        .status(200)
        .json({ status: "success", message: "No active session to logout" });
    }
  });

  // Route to handle selection of authType (LDAP/AD)
  router.post("/auth/select", (req, res) => {
    const { authType } = req.body;
    console.log("Checking authType:", authType);

    if (!authType) {
      throw new BadRequestError("Authentication type not provided.");
    }

    // Store the selected authType in session
    req.session.method = {
      authType,
    };

    res.status(200).json({ status: "success" });
  });
};

export default sessionRoute;
