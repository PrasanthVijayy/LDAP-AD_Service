"use strict"; // Using strict mode
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

/* --------- CORS SETUP --------- */
const corsOptions = {
  origin: process.env.ALLOWED_ORIGIN,
  methods: process.env.ALLOWED_METHODS,
  allowedHeaders: process.env.ALLOWED_HEADERS,
  credentials: true,
};

app.use(cors(corsOptions)); // Enabling CORS with specified options

/* --------- SESSION SETUP --------- */

const sessionSecret = CryptoJS.lib.WordArray.random(64).toString(
  CryptoJS.enc.Hex
);

app.use(
  session({
    name: "sessionID",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      maxAge: 1 * 60 * 1000,
    },
  })
);

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
    const server = app.listen(process.env.PORT || 3001, () => {
      console.log("Listening on port " + server.address().port);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to LDAP. Server not started.", err);
  });
