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
import { connectRoutes } from "./modules/common/routesConnector.js";
import sessionRoute from "./modules/common/sessionRoute.js";
import errorHandling from "./middleware/errorMiddleware.js";
import logger from "./config/logger.js";
import { renderRoutes } from "./modules/common/renderRoutes.js";
import { corsOptions, securityHeaders } from "./config/securityHeaders.js";
import { setupPassport } from "./config/passportConfig.js";

dotenv.config();
const app = express();

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

app.use(morgan(":method :url :status - :response-time ms"));

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

/* Middleware to manage logged_in cookie */
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
sessionRoute(app);
renderRoutes(app);

app.use(async (req, res, next) => {
  const authType = req.session?.method?.authType;

  if (authType) {
    const sessionDetails = req.session;
    console.warn(sessionDetails);

    logger.success(
      `AuthType "${authType.toUpperCase()}" found in session. Loading respective routes.`
    );
    try {
      console.warn("LOADING DYNAMIC ROUTES");
      // Waiting for the routes to load dynamically
      await connectRoutes(app, authType);
      app.use(errorHandling);
      logger.success(`Routes loaded for authType: ${authType}`);
      next(); // Proceed to the next middleware
    } catch (error) {
      return next(error);
    }
  } else {
    logger.error("No authType found in session, skipping route loading!.");
    return next();
  }
});

/* ------------ ERROR HANDLING ------------ */
app.use(errorHandling);

/* ------------ SERVER START ------------ */
const PORT = 443;
const HOST = "0.0.0.0";
// Use HTTPS to create the server
https.createServer(credentials, app).listen(PORT, HOST, () => {
  logger.info(`Server started and listening on https://localhost:${PORT}`);
  logger.warn(`Server running with machine IP: ${process.env.APP_LOGIN_URL}`);
});
