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

/* Import routes */
import userRoutes from "./modules/routes/userRoutes.js";
import groupRoutes from "./modules/routes/groupRoutes.js";
import organizationRoutes from "./modules/routes/organizationRoutes.js";
import domainRoutes from "./modules/routes/domainRoutes.js";
import sessionRoute from "./modules/routes/sessionRoute.js";
import errorHandling from "./middleware/errorMiddleware.js";
import { connectToLDAP } from "./config/ldapconfig.js";
import apiLimiter from "./middleware/apiLimiter.js";

dotenv.config();
const app = express(); // Create express app

// Setup __dirname for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ---------- MIDDLEWARE SETUP ---------- */
app.use(express.json()); // Body parser middleware
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms")
);

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
      maxAge: 1 * 60 * 1000, // 10 minutes
    },
  })
);

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

app.get("/adminDashboard", apiLimiter(), (req, res) => {
  res.render("adminDashboard"); // Renders the adminDashboard
});

app.get("/userDashboard", apiLimiter(), (req, res) => {
  res.render("userDashboard"); // Renders the userDashboard
});

app.get("/createUser", apiLimiter(), (req, res) => {
  res.render("Pages/createUser"); // Renders the createUser
});

app.get("/listUsers", apiLimiter(), (req, res) => {
  res.render("Pages/listUsers"); // Renders the listUsers
});

app.get("/listOrganizations", apiLimiter(), (req, res) => {
  res.render("Pages/listOrganizations"); // Renders the listOrganizations
});

app.get("/createGroup", apiLimiter(), (req, res) => {
  res.render("Pages/createGroup"); // Renders the createGroup
});

// file deepcode ignore NoRateLimitingForExpensiveWebOperation: <please specify a reason of ignoring this>
app.get("/resetPassword", apiLimiter(), (req, res) => {
  res.render("Pages/resetPassword"); // Renders the resetPassword
});

app.get("/editUser", apiLimiter(), (req, res) => {
  res.render("Pages/editUser"); // Renders the editUser
});

app.get("/changePassword", apiLimiter(), (req, res) => {
  res.render("Pages/chpwd"); // Renders the changePassword
});

app.get("/searchUser", apiLimiter(), (req, res) => {
  res.render("Pages/userSearch"); // Renders the resetPassword
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
    const PORT = process.env.PORT || 3001;
    const HOST = "0.0.0.0";
    app.listen(PORT, HOST, () => {
      console.log(`App is running at ${HOST} on port ${PORT}`);
      console.log(`Server started and listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to LDAP. Server not started.", err);
  });
