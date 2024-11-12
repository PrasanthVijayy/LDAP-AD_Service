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

//app.use(helmet()); //Helmet security
app.use((req, res, next) => {
  res.locals.nonce = CryptoJS.lib.WordArray.random(16).toString(
    CryptoJS.enc.Hex
  ); // Generates a random nonce
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://stackpath.bootstrapcdn.com",
        ],
        styleSrc: [
          "'self'",
          "https://stackpath.bootstrapcdn.com",
          (req, res) => `'nonce-${res.locals.nonce}'`,
        ],
        imgSrc: ["'self'", "data:"],
      },
    },
  })
);

app.disable("x-powered-by"); // Reduce Fingerprinting
app.use(hpp()); // HTTP Parameter pollution
app.use(compression()); // Enable compression for all API responses
app.use(cookieParser()); // Cookie parser middleware

/* --------- CORS SETUP --------- */
const corsOptions = {
  origin: "*", // Allow all origins (you can limit this to your IP if needed)
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "X-Requested-With"],
  credentials: true,
};

app.use(cors(corsOptions)); // Enabling CORS with specified options

app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
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
      maxAge: 10 * 60 * 1000, // 10 minutes
    },
  })
);

/* --------- EJS ENGINE SETUP --------- */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.get("/", (req, res) => {
  res.render("index");
});

/* ---------- UI RENDERING SETUP ---------- */

app.get("/", (req, res) => {
  res.render("index"); // Renders the index
});

app.get("/adminDashboard", (req, res) => {
  res.render("adminDashboard"); // Renders the adminDashboard
});

app.get("/userDashboard", (req, res) => {
  res.render("userDashboard"); // Renders the userDashboard
});

app.get("/createUser", (req, res) => {
  res.render("Pages/createUser"); // Renders the createUser
});

app.get("/listUsers", (req, res) => {
  res.render("Pages/listUsers"); // Renders the listUsers
});

app.get("/listOrganizations", (req, res) => {
  res.render("Pages/listOrganizations"); // Renders the listOrganizations
});

app.get("/createGroup", (req, res) => {
  res.render("Pages/createGroup"); // Renders the createGroup
});

app.get("/resetPassword", (req, res) => {
  res.render("Pages/resetPassword"); // Renders the resetPassword
});

app.get("/editUser", (req, res) => {
  res.render("Pages/editUser"); // Renders the editUser
});

app.get("/changePassword", (req, res) => {
  res.render("Pages/chpwd"); // Renders the changePassword
});

app.get("/searchUser", (req, res) => {
  res.render("Pages/userSearch"); // Renders the resetPassword
});

/* --------- STATIC FILES --------- */
app.use(express.static(path.join(__dirname, "UI")), (req, res, next) => {
  console.log("Request URL:", req.url); // Log the requested URL
  next();
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
