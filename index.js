"use strict";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import hpp from "hpp";
import compression from "compression";
import cookieParser from "cookie-parser";
import session from "express-session";
import CryptoJS from "crypto-js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import https from "https";
import passport from "passport";
import { Strategy as SamlStrategy } from "@node-saml/passport-saml";
import { v4 as uuidv4 } from "uuid";

/* ---------- IMPORT FILES ---------- */
import userRoutes from "./modules/routes/userRoutes.js";
import groupRoutes from "./modules/routes/groupRoutes.js";
import organizationRoutes from "./modules/routes/organizationRoutes.js";
import domainRoutes from "./modules/routes/domainRoutes.js";
import sessionRoute from "./modules/routes/sessionRoute.js";
import errorHandling from "./middleware/errorMiddleware.js";
import { connectToLDAP } from "./config/ldapconfig.js";
import apiLimiter from "./middleware/apiLimiter.js";
import csrfProtection from "./UI/libs/csurfProtection.js";
import { samlConfig } from "./config/samlConfig.js";

dotenv.config();
const app = express(); // Create express app

/* ---------- SSL SETUP ---------- */
const privateKey = fs.readFileSync(
  "Certificates/SSL_certificate/private.key",
  "utf8"
);
const certificate = fs.readFileSync(
  "Certificates/SSL_certificate/certificate.crt",
  "utf8"
);
const credentials = { key: privateKey, cert: certificate };

/* ---------- SETUP DIRECTORIES ---------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ---------- MIDDLEWARE SETUP ---------- */
app.use(express.json()); // Body parser middleware
app.use(express.urlencoded({ extended: true }));
// app.use(
//   morgan(":method :url :status :res[content-length] - :response-time ms")
// );

app.use((req, res, next) => {
  res.locals.nonce = CryptoJS.lib.WordArray.random(16).toString(
    CryptoJS.enc.Hex
  ); // Generates a random nonce
  next();
});

app.use(
  helmet.hsts({
    maxAge: 31536000, // 1 year
    includeSubDomains: true, // Apply to all subdomains
    preload: true, // Add to HSTS preload list
  })
);

app.use(helmet.xssFilter()); // XSS Protection
app.use(helmet.noSniff()); // No MIME sniffing
app.use(helmet.frameguard({ action: "deny" })); // Clickjacking guard
app.use(helmet.referrerPolicy({ policy: "no-referrer" })); // Referrer policy
app.use(helmet.dnsPrefetchControl({ allow: false })); // Disable DNS prefetch
app.use(helmet.permittedCrossDomainPolicies({ permittedPolicies: "none" })); // No cross-domain policies
app.disable("x-powered-by"); // Hide tech stack
app.use(hpp()); // Prevent param pollution
app.use(compression()); // Compress responses
app.use(cookieParser()); // Parse cookies

/* --------- CORS SETUP --------- */
const corsOptions = {
  origin: ["*"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "X-Requested-With"],
  credentials: true,
};

app.use(cors(corsOptions)); // Enabling CORS with specified options

app.use((req, res, next) => {
  // Set security headers
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Origin-Agent-Cluster", "?0");
  res.setHeader(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate"
  );
  res.setHeader("Expires", "-1");
  res.setHeader("Pragma", "no-cache");

  // Custom CSP Header - instead using in Helmet (This works)
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self'; " +
      "style-src 'self'; " +
      "img-src 'self' data:; " +
      "font-src 'self'; " +
      "connect-src 'self'; "
  );
  next();
});

/* --------- SAML SSO SETUP --------- */

passport.use(
  "saml",
  new SamlStrategy(
    {
      entryPoint: samlConfig.entryPoint,
      issuer: samlConfig.issuer,
      callbackUrl: samlConfig.callbackUrl,
      idpCert: samlConfig.idpCert,
      identifierFormat: samlConfig.identifierFormat,
      algorithm: "sha256",
      debug: true,
      acceptedClockSkewMs: 0,
      wantAuthnResponseSigned: false,
      // validateInResponseTo: "never",
    },
    (profile, done) => {
      console.log("SAML Profile:", profile); // For debugging

      const surname =
        profile.attributes[
          "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"
        ];
      let userRole = "user"; // Default role is user

      // If surname is EMP001, set role as admin
      if (surname === "EMP001") {
        userRole = "admin";
      }

      // Attach the role to the user profile
      profile.role = userRole;
      return done(null, profile);
    }
  )
);

/* --------- SESSION SETUP --------- */

const sessionSecret = CryptoJS.lib.WordArray.random(64).toString(
  CryptoJS.enc.Hex
);

app.use(
  session({
    name: "sessionID",
    secret: process.env.SESSION_SECRET || sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      path: "/",
      maxAge: 1 * 60 * 1000, // 1 minutes
    },
  })
);

/* Middleware to manage `logged_in` cookie */
app.use((req, res, next) => {
  // console.log("Ensuring `logged_in` cookie is set...");

  const isUserLoggedIn = req.session && req.session.user;
  const loggedInValue = isUserLoggedIn ? "yes" : "no";

  if (req.cookies?.logged_in !== loggedInValue) {
    console.log(`Setting 'logged_in' cookie to '${loggedInValue}'`);
    res.cookie("logged_in", loggedInValue, {
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
      path: "/",
      maxAge: 31536000,
    });
  }

  next();
});

/* --------- EJS ENGINE SETUP --------- */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* --------- STATIC FILES --------- */
// This is your existing static file setup
app.use(express.static(path.join(__dirname, "UI")), (req, res, next) => {
  console.log(
    `Serving static file: ${req.protocol}://${req.get("host")}${req.url}`
  );
  next();
});

/* ---------- UI RENDERING SETUP ---------- */

app.get("/", apiLimiter(), (req, res) => {
  res.render("index"); // Renders the index
});

app.get(
  "/saml/login",
  apiLimiter(),
  passport.authenticate("saml", {
    failureRedirect: "/",
  })
);

// SAML callback handler
app.post(
  "/login/callback",
  apiLimiter(), // Rate limiter middleware
  passport.authenticate("saml", {
    failureRedirect: "/saml/login", // Redirect if authentication fails
  }),
  function (req, res) {
    // Access the user role from req.user (added in the SAML strategy)
    const userRole = req.user && req.user.role;

    // Redirect based on the role
    if (userRole === "admin") {
      console.warn("Redirecting to adminDashboard");
      return res.redirect("/adminDashboard");
    } else if (userRole === "user") {
      console.warn("Redirecting to userDashboard");
      return res.redirect("/userDashboard");
    } else {
      return res.redirect("/"); // Default if no role is found
    }
  }
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((id, done) => {
  done(null, id);
});

app.get("/adminDashboard", apiLimiter(), csrfProtection, (req, res) => {
  res.render("adminDashboard", { csrfToken: req.csrfToken() }); // Renders the adminDashboard
});

app.get("/userDashboard", apiLimiter(), csrfProtection, (req, res) => {
  res.render("userDashboard", { csrfToken: req.csrfToken() }); // Renders the userDashboard
});

app.get("/createUser", apiLimiter(), csrfProtection, (req, res) => {
  res.render("Pages/createUser", { csrfToken: req.csrfToken() }); // Renders the createUser
});

app.get("/listUsers", apiLimiter(), csrfProtection, (req, res) => {
  res.render("Pages/listUsers", { csrfToken: req.csrfToken() }); // Renders the listUsers
});

app.get("/listOrganizations", apiLimiter(), csrfProtection, (req, res) => {
  res.render("Pages/listOrganizations", { csrfToken: req.csrfToken() }); // Renders the listOrganizations
});

app.get("/createGroup", apiLimiter(), csrfProtection, (req, res) => {
  res.render("Pages/createGroup", { csrfToken: req.csrfToken() }); // Renders the createGroup
});

// file deepcode ignore NoRateLimitingForExpensiveWebOperation: <please specify a reason of ignoring this>
app.get("/resetPassword", apiLimiter(), csrfProtection, (req, res) => {
  res.render("Pages/resetPassword", { csrfToken: req.csrfToken() });
});

app.get("/editUser", apiLimiter(), csrfProtection, (req, res) => {
  res.render("Pages/editUser", { csrfToken: req.csrfToken() }); // Renders the editUser
});

app.get("/changePassword", apiLimiter(), csrfProtection, (req, res) => {
  res.render("Pages/chpwd", { csrfToken: req.csrfToken() }); // Renders the changePassword
});

app.get("/searchUser", apiLimiter(), csrfProtection, (req, res) => {
  res.render("Pages/userSearch", { csrfToken: req.csrfToken() }); // Renders the resetPassword
});
/* ---------- API ROUTES SETUP  ----------*/
userRoutes(app);
groupRoutes(app);
organizationRoutes(app);
domainRoutes(app);
sessionRoute(app);

/* ------------ ERROR HANDLING ------------ */
app.use(errorHandling);

// Expecting LDAP to start before server starts
connectToLDAP()
  .then(() => {
    const PORT = 443;
    const HOST = "0.0.0.0";
    // Use HTTPS to create the server
    https.createServer(credentials, app).listen(PORT, HOST, () => {
      console.warn(`Server started and listening on https://localhost:${PORT}`);
      console.warn(`Server running with machine IP: https://192.168.0.145/`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to LDAP. Server not started.", err);
  });
