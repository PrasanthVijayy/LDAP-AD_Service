"use strict";
import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import hpp from "hpp";
import compression from "compression";

/* Import routes */
import userRoutes from "./modules/routes/userRoutes.js";
import groupRoutes from "./modules/routes/groupRoutes.js";
import organizationRoutes from "./modules/routes/organizationRoutes.js";
import domainRoutes from "./modules/routes/domainRoutes.js";
import errorHandling from "./middleware/errorMiddleware.js";
import { connectToLDAP } from "./config/ldapconfig.js";

dotenv.config();
const app = express(); // Create express app

/* MIDDLEWARES */
app.use(cors()); // CORS middleware
app.use(bodyParser.json()); // Body parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms")
); // Morgan middleware to log requests in mentioned format
app.use(helmet());  //Helmet security
app.disable("x-powered-by"); // Reduce Fingerprinting
app.use(hpp()); // HTTP Parameter pollution
app.use(compression()); // Enable compression for all API responses

/* ROUTES */
userRoutes(app);
groupRoutes(app);
organizationRoutes(app);
domainRoutes(app);

/* ERROR HANDLING */
app.use(errorHandling);

// Waiting for LDAP connection before starting the server
connectToLDAP()
  .then(() => {
    const server = app.listen(process.env.PORT || 3001, () => {
      console.log("Listening on port " + server.address().port);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to LDAP. Server not started.", err);
  });
