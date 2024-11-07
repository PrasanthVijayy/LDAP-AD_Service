"use strict";
import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
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
app.use(bodyParser.json()); // Body parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms")
); // Morgan middleware to log requests in mentioned format
app.use(helmet()); //Helmet security
app.disable("x-powered-by"); // Reduce Fingerprinting
app.use(hpp()); // HTTP Parameter pollution
app.use(compression()); // Enable compression for all API responses
app.use(cookieParser()); // Cookie parser middleware

/* --------- CORS SETUP --------- */
const corsOptions = {
  origin: process.env.ALLOWED_ORIGIN,
  methods: process.env.ALLOWED_METHODS.split(","),
  allowedHeaders: process.env.ALLOWED_HEADERS.split(","),
  credentials: process.env.ALLOWED_CREDENTIALS === "true",
};

app.use(cors(corsOptions)); // Enabling CORS with specified options

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

app.get('/', (req, res) => {
  res.render('index');
});


/* --------- STATIC FILES --------- */
app.use(express.static(path.join(__dirname, "UI")));

/* ---------- ROUTES SETUP  ----------*/
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
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server started and listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to LDAP. Server not started.", err);
  });
