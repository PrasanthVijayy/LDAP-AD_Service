import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import morgan from "morgan";

/* Import routes */
import userRoutes from "./modules/routes/userRoutes.js";
import groupRoutes from "./modules/routes/groupRoutes.js";
import organizationRoutes from "./modules/routes/organizationRoutes.js";
import errorHandling from "./middleware/errorMiddleware.js";
import { connectToLDAP } from "./config/ldapconfig.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("dev"));

/* ROUTES */
userRoutes(app); groupRoutes(app); organizationRoutes(app);

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
