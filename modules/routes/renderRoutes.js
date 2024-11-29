/* ---------- RENDER ROUTES SETUP START----------*/

"use strict"; // Strict mode enabled
import passport from "passport";
import logger from "../../config/logger.js";
import apiLimiter from "../../middleware/apiLimiter.js";
import csrfProtection from "../../UI/libs/csurfProtection.js";

export const renderRoutes = (app) => {
  // Render index page
  app.get("/", apiLimiter(), (req, res) => {
    res.render("index");
  });

  // Render admin dashboard
  app.get("/adminDashboard", apiLimiter(), csrfProtection, (req, res) => {
    res.render("adminDashboard", { csrfToken: req.csrfToken() });
  });

  // Render user dashboard
  app.get("/userDashboard", apiLimiter(), csrfProtection, (req, res) => {
    res.render("userDashboard", { csrfToken: req.csrfToken() });
  });

  // Render createUser page
  app.get("/createUser", apiLimiter(), csrfProtection, (req, res) => {
    res.render("Pages/createUser", { csrfToken: req.csrfToken() });
  });

  // Render listUsers page
  app.get("/listUsers", apiLimiter(), csrfProtection, (req, res) => {
    res.render("Pages/listUsers", { csrfToken: req.csrfToken() });
  });

  // Render listOrganizations page
  app.get("/listOrganizations", apiLimiter(), csrfProtection, (req, res) => {
    res.render("Pages/listOrganizations", { csrfToken: req.csrfToken() });
  });

  // Render createGroup page
  app.get("/createGroup", apiLimiter(), csrfProtection, (req, res) => {
    res.render("Pages/createGroup", { csrfToken: req.csrfToken() });
  });

  // Render resetPassword page
  app.get("/resetPassword", apiLimiter(), csrfProtection, (req, res) => {
    res.render("Pages/resetPassword", { csrfToken: req.csrfToken() });
  });

  // Render editUser page
  app.get("/editUser", apiLimiter(), csrfProtection, (req, res) => {
    res.render("Pages/editUser", { csrfToken: req.csrfToken() });
  });

  // Render changePassword page
  app.get("/changePassword", apiLimiter(), csrfProtection, (req, res) => {
    res.render("Pages/chpwd", { csrfToken: req.csrfToken() });
  });

  // Render userSearch page
  app.get("/searchUser", apiLimiter(), csrfProtection, (req, res) => {
    res.render("Pages/userSearch", { csrfToken: req.csrfToken() });
  });

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
    apiLimiter(), // Apply rate-limiting
    passport.authenticate("saml", {
      failureRedirect: "/saml/login", // Redirect to login on failure
    }),
    (req, res) => {
      try {
        if (!req.user) {
          console.error("SAML authentication failed.");
          return res.redirect("/"); // Redirect to home on failure
        }

        console.log("SAML Authentication Successful:", req.user);

        // Extract raw assertion XML
        const rawAssertionXml = req.user.getAssertionXml();
        if (!rawAssertionXml) {
          console.error("SAML assertion is missing.");
          return res.redirect("/"); // Handle missing assertion
        }

        // Parse `NotOnOrAfter` from the `<Conditions>` tag
        let notOnOrAfter;
        const conditionsStart = rawAssertionXml.indexOf("<Conditions");
        if (conditionsStart !== -1) {
          const conditionsEnd = rawAssertionXml.indexOf(">", conditionsStart);
          const conditionsTag = rawAssertionXml.substring(
            conditionsStart,
            conditionsEnd
          );

          // Look for `NotOnOrAfter` attribute
          const notOnOrAfterMatch = conditionsTag.match(
            /NotOnOrAfter="([^"]+)"/
          );
          if (notOnOrAfterMatch && notOnOrAfterMatch[1]) {
            notOnOrAfter = notOnOrAfterMatch[1];
            console.log("Extracted NotOnOrAfter:", notOnOrAfter);
          }
        }

        // Validate and set session expiration
        let sessionMaxAge;
        if (notOnOrAfter) {
          const expiryDate = new Date(notOnOrAfter);
          const currentDate = new Date();

          if (expiryDate > currentDate) {
            sessionMaxAge = expiryDate - currentDate; // Calculate remaining validity
            console.log(
              `Session will expire in ${sessionMaxAge / 1000} seconds.`
            );
          } else {
            console.warn("SAML session has already expired.");
            return res.redirect("/saml/login"); // Redirect if session is invalid
          }
        }

        // Set session user information
        req.session.user = {
          username: req.user.nameID,
          userType: req.user.role,
          OU: null, // SAML users may not have OU
          authMethod: "SAML",
        };

        // Update session expiration dynamically
        if (sessionMaxAge) {
          req.session.cookie.maxAge = sessionMaxAge;
        }

        // Redirect based on user role
        if (req.user.role === "admin") {
          return res.redirect("/adminDashboard");
        } else if (req.user.role === "user") {
          return res.redirect("/userDashboard");
        } else {
          return res.redirect("/");
        }
      } catch (error) {
        console.error("Error during SAML callback processing:", error);
        return res.redirect("/saml/login"); // Redirect on error
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
