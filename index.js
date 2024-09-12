import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

/* Import routes */
import userRoutes from "./modules/routes/userRoutes.js";
import groupRoutes from "./modules/routes/groupRoutes.js";
import organizationRoutes from "./modules/routes/organizationRoutes.js";
import errorHandling from "./middleware/errorMiddleware.js";
import { connectToLDAP } from "./config/ldapconfig.js";
import { TooManyRequestsError } from "./utils/error.js";

dotenv.config();
const app = express();

/* MIDDLEWARES */
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms")
);
app.use(helmet());
app.disable("x-powered-by");

/* RATE LIMITER  -> Brute force attack */
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 05 minutes
  max: 5,
  handler: () => {
    throw new TooManyRequestsError(
      "Too many requests, please try again after 1 minute."
    );
  },
});

/* ROUTES */
userRoutes(app, apiLimiter);
groupRoutes(app);
organizationRoutes(app);

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
