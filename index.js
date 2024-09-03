import express from "express";
import ldap from "ldapjs";
import bodyParser from "body-parser";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import userRoutes from "./routes/userRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import domainRoutes from "./routes/domainRoutes.js";
import mfaRoutes from "./routes/mfaRoutes.js";
import organizationRoutes from "./routes/organizationRoutes.js";
import errorHandling from "./middleware/errorHandling.js";

/* CONFIG */
dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("dev"));

/* ROUTES */
app.use("/api/users", userRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/domains", domainRoutes);
app.use("/api/mfa", mfaRoutes);
app.use("/api/organizations", organizationRoutes);

/* ERROR HANDLING */
app.use(errorHandling);

const server = app.listen(process.env.PORT || 3001, () => {
  console.log("Listening on port " + server.address().port);
});
