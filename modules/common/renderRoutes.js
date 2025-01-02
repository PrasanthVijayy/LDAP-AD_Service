"use strict";

import passport from "passport";
import logger from "../../config/logger.js";
import apiLimiter from "../../middleware/apiLimiter.js";
import csrfProtection from "../../UI/libs/csurfProtection.js";
import { samlUtils } from "../../utils/samlUtils.js";
import { connectRoutes } from "./routesConnector.js";
import { connectDirectory } from "../../utils/directoryConnector.js";

export const renderRoutes = (app) => {
  // Render index page
  app.get("/", apiLimiter(), (req, res) => {
    res.render("index");
  });

  // Render admin dashboard
  app.get(
    "/directoryManagement/admin",
    apiLimiter(),
    csrfProtection,
    (req, res) => {
      res.render("adminDashboard", { csrfToken: req.csrfToken() });
    }
  );

  // Render user dashboard
  app.get(
    "/directoryManagement/user",
    apiLimiter(),
    csrfProtection,
    (req, res) => {
      res.render("userDashboard", { csrfToken: req.csrfToken() });
    }
  );

  // Render createUser page
  app.get(
    "/directoryManagement/createUser",
    apiLimiter(),
    csrfProtection,
    (req, res) => {
      res.render("Pages/createUser", { csrfToken: req.csrfToken() });
    }
  );

  // Render listUsers page
  app.get(
    "/directoryManagement/listUsers",
    apiLimiter(),
    csrfProtection,
    (req, res) => {
      res.render("Pages/listUsers", { csrfToken: req.csrfToken() });
    }
  );

  // Render listOrganizations page
  app.get(
    "/directoryManagement/listOrganizations",
    apiLimiter(),
    csrfProtection,
    (req, res) => {
      res.render("Pages/listOrganizations", { csrfToken: req.csrfToken() });
    }
  );

  // Render createGroup page
  app.get(
    "/directoryManagement/createGroup",
    apiLimiter(),
    csrfProtection,
    (req, res) => {
      res.render("Pages/createGroup", { csrfToken: req.csrfToken() });
    }
  );

  // Render resetPassword page
  app.get(
    "/directoryManagement/resetPassword",
    apiLimiter(),
    csrfProtection,
    (req, res) => {
      res.render("Pages/resetPassword", { csrfToken: req.csrfToken() });
    }
  );

  // Render editUser page
  app.get(
    "/directoryManagement/editUser",
    apiLimiter(),
    csrfProtection,
    (req, res) => {
      res.render("Pages/editUser", { csrfToken: req.csrfToken() });
    }
  );

  // Render changePassword page
  app.get(
    "/directoryManagement/changePassword",
    apiLimiter(),
    csrfProtection,
    (req, res) => {
      res.render("Pages/chpwd", { csrfToken: req.csrfToken() });
    }
  );

  // Render userSearch page
  app.get(
    "/directoryManagement/searchUser",
    apiLimiter(),
    csrfProtection,
    (req, res) => {
      res.render("Pages/userSearch", { csrfToken: req.csrfToken() });
    }
  );

  /* --------- SAML Routes --------- */
  // SAML Login
  app.get(
    "/saml/login",
    apiLimiter(),
    passport.authenticate("saml", {
      failureRedirect: "/",
    })
  );

  // SAML Callback
  app.post(
    "/login/callback",
    apiLimiter(),
    passport.authenticate("saml", {
      failureRedirect: "/saml/login",
    }),
    async (req, res) => {
      try {
        if (!req.user) {
          logger.error("SAML Authentication failed: No user data received.");
          return res.redirect("/saml/login");
        }

        const authType = "ad"; // Set authType to LDAP for SAML users
        req.session.method = { authType };

        try {
          await connectDirectory(authType);
          await connectRoutes(app, authType);
          logger.success(`Dynamic routes loaded for authType: ${authType}`);
        } catch (routeError) {
          logger.error("Failed to load dynamic routes:", routeError);
          return res.redirect("/saml/login");
        }

        const empID = req?.user?.empID || "Unknown";

        if (empID === "Unknown") {
          logger.warn("Employee ID not found in SAML profile.");
          req.session.destroy((err) => {
            if (err) {
              logger.error("Failed to destroy session:", err);
            }
          });
          logger.info(`API URL:, ${process.env.APP_LOGIN_URL}`); // Getting correct URL
          // Redirect to IdP logout endpoint
          const idpLogoutUrl = `${
            samlUtils?.logoutURL
          }&RelayState=${encodeURIComponent(process.env.APP_LOGIN_URL)}`;
          return res.redirect(idpLogoutUrl);
        }

        // Set session for the user
        req.session.user = {
          email: req?.user?.email,
          username: req?.user?.username,
          empID: req?.user?.empID,
          authType: authType,
          authMethod: "SAML",
          userType: req?.user?.role,
          OU: req?.user?.userOU || req.user?.userCN,
          isAdmin: req?.user?.role === "admin" ? true : false,
        };

        req.session.ldap = {
          authType: authType,
          userDN: req?.user?.userDN,
          [req.user?.userIdent]: req?.user?.userOU || req?.user?.userCN, // Fetch either OU / CN from SAML user profile
          dnKey: req?.user?.userIdent, // Fetch either OU / CN from SAML user profile
        };

        // Set session expiration dynamically based on SAML assertion
        const rawAssertionXml = req?.user?.getAssertionXml();
        const expiryDateMatch = rawAssertionXml?.match(
          /NotOnOrAfter="([^"]+)"/
        );
        if (expiryDateMatch && expiryDateMatch[1]) {
          const expiryDate = new Date(expiryDateMatch[1]);
          req.session.cookie.maxAge = expiryDate - new Date();
        } else {
          req.session.cookie.maxAge = 30 * 60 * 1000; // Default to 30 minutes
        }
        // Redirect user based on role
        if (req?.user?.role === "admin") {
          logger.warn("Redirecting to admin dashboard");
          return res.redirect("/directoryManagement/admin");
        } else if (req?.user?.role === "user") {
          logger.warn("Redirecting to user dashboard");
          return res.redirect("/directoryManagement/user");
        } else {
          logger.warn("Role not found in SAML profile.");
          const idpLogoutUrl = `${
            samlUtils?.logoutURL
          }&RelayState=${encodeURIComponent(process.env.APP_LOGIN_URL)}`;
          console.log("url", idpLogoutUrl);
          logger.warn("Redirecting to IdP logout endpoint");
          return res.redirect(idpLogoutUrl);
        }
      } catch (error) {
        logger.error(`Error during SAML callback processing: ${error}`);
        req.session.destroy((err) => {
          if (err) {
            logger.error(
              `Failed to destroy session during error handling: ${err}`
            );
          }
        });
        return res.redirect("/saml/login");
      }
    }
  );

  // Logout
  app.post("/logout", apiLimiter(), (req, res) => {
    logger.info("Redirected to index after IdP logout");

    if (req.session?.user?.authMethod === "SAML") {
      const idpLogoutUrl = `${
        samlUtils?.logoutURL
      }&RelayState=${encodeURIComponent(process.env.APP_LOGIN_URL)}`;
      return res.redirect(idpLogoutUrl);
    } else {
      console.warn("Logging out from local session");
      req.session?.destroy((err) => {
        if (err) {
          logger.error("Session destroy error:", err);
          return res.redirect("/"); // Ensure response is sent only once
        }
        res.clearCookie("sessionID");
        return res.redirect("/"); // Ensure response is sent only once
      });
    }
  });
};
