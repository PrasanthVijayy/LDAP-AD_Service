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
      user: req.user,
    });
  });

  router.post("/logout", (req, res) => {
    if (req.session) {
      if (req.session?.user?.authMethod === "SAML") {
        console.warn(
          `User "${req.session?.user?.username}" logging out from SAML auth`
        );

        const idpLogoutUrl =
          "https://sso.cybernexa.com/adfs/ls/?wa=wsignout1.0";
        const relayState = encodeURIComponent("https://192.168.0.145/");

        const logoutUrlWithRelayState = `${idpLogoutUrl}&RelayState=${relayState}`;
        console.warn(
          `Redirecting user to SAML logout URL: ${logoutUrlWithRelayState}`
        );

        // Clear SP session
        req.session?.destroy((err) => {
          if (err) {
            console.error("Error destroying session:", err);
            return res
              .status(500)
              .json({ status: "error", message: "Failed to logout" });
          }

          res.clearCookie("sessionID");

          // Inform client to redirect to IdP logout
          return res.status(200).json({
            status: "success",
            message: "Redirecting to SAML IdP logout",
            logoutUrl: logoutUrlWithRelayState, // Send the URL with RelayState to the frontend
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
      res
        .status(200)
        .json({ status: "success", message: "No active session to logout" });
    }
  });
};

export default sessionRoute;
