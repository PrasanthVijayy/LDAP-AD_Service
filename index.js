"use strict";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import session from "express-session";
import CryptoJS from "crypto-js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import https from "https";
import passport from "passport";

/* ---------- IMPORT FILES ---------- */
import userRoutes from "./modules/openLdap/routes/userRoutes.js";
import groupRoutes from "./modules/routes/groupRoutes.js";
import organizationRoutes from "./modules/routes/organizationRoutes.js";
import domainRoutes from "./modules/routes/domainRoutes.js";
import sessionRoute from "./modules/routes/sessionRoute.js";
import errorHandling from "./middleware/errorMiddleware.js";
import { connectToLDAP } from "./config/ldapconfig.js";
import { connectToAD } from "./config/adConfig.js";
import logger from "./config/logger.js";
import { renderRoutes } from "./modules/routes/renderRoutes.js";
import { corsOptions, securityHeaders } from "./config/securityHeaders.js";
import { setupPassport } from "./config/passportConfig.js";

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
app.use(cors(corsOptions)); // Enabling CORS
securityHeaders(app); // Enabling Security headers

app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms")
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
    },
  })
);

/* Middleware to manage `logged_in` cookie */
app.use((req, res, next) => {
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
app.use(
  "/directoryManagement",
  express.static(path.join(__dirname, "UI"), {
    fallthrough: true,
    maxAge: "1d", // Cache files for 1 day
    etag: true, // Enable ETag header for better caching
  }),
  (req, res, next) => {
    logger.info(
      `Serving static file: ${req.protocol}://${req.get("host")}${req.url}`
    );
    next();
  }
);

/* ---------- PASSPORT SETUP ---------- */
setupPassport();
app.use(passport.initialize());
app.use(passport.session());

/* ---------- API ROUTES SETUP  ----------*/
userRoutes(app);
groupRoutes(app);
organizationRoutes(app);
domainRoutes(app);
sessionRoute(app);
renderRoutes(app);

/* ------------ ERROR HANDLING ------------ */
app.use(errorHandling);

// Expecting LDAP to start before server starts
connectToLDAP()
  .then(() => {
    const PORT = 443;
    const HOST = "0.0.0.0";
    // Use HTTPS to create the server
    https.createServer(credentials, app).listen(PORT, HOST, () => {
      logger.info(`Server started and listening on https://localhost:${PORT}`);
      logger.warn(
        `Server running with machine IP: ${process.env.APP_LOGIN_URL}`
      );
    });
  })
  .catch((err) => {
    console.error("Failed to connect to LDAP. Server not started.", err);
  });
