import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import morgan from "morgan";

/* Import routes */
import userRoutes from "./modules/routes/userRoutes.js";


import errorHandling from "./middleware/errorMiddleware.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("dev"));

/* ROUTES */
userRoutes(app);
// Use other routes similarly

/* ERROR HANDLING */
app.use(errorHandling);

const server = app.listen(process.env.PORT || 3001, () => {
  console.log("Listening on port " + server.address().port);
});
