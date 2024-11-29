/* ---------- RENDER ROUTES SETUP START----------*/

"use strict"; // Strict mode enabled
import passport from "passport";
import logger from "../../config/logger.js";
import apiLimiter from "../../middleware/apiLimiter.js";
import csrfProtection from "../../UI/libs/csurfProtection.js";
import { search } from "../../utils/ldapUtils.js";
import { samlConfig } from "../../config/samlConfig.js";

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

        // Extract employeeNumber from SAML response
        const employeeNumber = req.user?.empID;

        if (!employeeNumber) {
          logger.warn("Employee number not found in SAML response.");
          return res.redirect("/saml/login");
        }

        // Query OpenLDAP for the employee number
        const ldapResults = await search(
          process.env.LDAP_BASE_DN,
          `(employeeNumber=${employeeNumber})`
        );

        if (ldapResults.length === 0) {
          logger.error(
            `Employee number ${employeeNumber} not found in OpenLDAP.`
          );

          // Destroy SP session
          req.session.destroy((err) => {
            if (err) {
              logger.error("Failed to destroy SP session:", err);
            }
          });
          logger.info(`API URL:, ${process.env.APP_LOGIN_URL}`); // Getting correct URL
          // Redirect to IdP logout endpoint
          const idpLogoutUrl = `${
            samlConfig.logoutURL
          }&RelayState=${encodeURIComponent(process.env.APP_LOGIN_URL || "/")}`;
          logger.info(`saml logout url: ${samlConfig.logoutURL}`); // Getting correct URL
          logger.info(`WITH RELAY PARTY: ${idpLogoutUrl}`); // Getting correct URL
  
          return res.redirect(idpLogoutUrl);
        }

        // Employee exists in OpenLDAP - Proceed with setting session
        const ldapUser = ldapResults[0];
        logger.info("ldap user check", ldapUser);

        req.session.user = {
          username: ldapUser?.cn,
          employeeNumber: employeeNumber,
          mail: ldapUser?.mail,
          userType: ldapUser?.title,
          OU: ldapUser?.ou || null,
          authMethod: "SAML",
        };

        // Set session expiration dynamically based on SAML assertion
        const rawAssertionXml = req.user.getAssertionXml();
        const expiryDateMatch = rawAssertionXml.match(/NotOnOrAfter="([^"]+)"/);
        if (expiryDateMatch && expiryDateMatch[1]) {
          const expiryDate = new Date(expiryDateMatch[1]);
          req.session.cookie.maxAge = expiryDate - new Date();
        } else {
          req.session.cookie.maxAge = 30 * 60 * 1000; // Default to 30 minutes
        }

        // Redirect to user dashboard based on role
        if (req.session?.user?.role === "admin") {
          return res.redirect("/directoryManagement/admin");
        } else {
          return res.redirect("/directoryManagement/user");
        }
      } catch (error) {
        logger.error("Error during SAML callback processing:", error);
        res.redirect("/saml/login");
      }
    }
  );

  // Logout
  app.post("/logout", apiLimiter(), (req, res) => {
    logger.info("Redirected to index after IdP logout");

    req.session?.destroy((err) => {
      if (err) {
        logger.error("Session destroy error:", err);
        res.redirect("/");
      }
    });
    res.redirect("/");
  });
};

/* ---------- RENDER ROUTES SETUP END ----------*/
