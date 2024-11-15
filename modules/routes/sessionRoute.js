// sessionRoutes.js
import express from "express";
import { sessionMiddleware } from "../../middleware/sessionMiddleware.js";

const sessionRoute = (app) => {
  const router = express.Router();
  app.use("/LDAP/v1/session", router);

  // SESSION CHECK ROUTE
  router.get("/check", sessionMiddleware, (req, res) => {
    // console.warn(`Session for user: ${req.user.username} & sessionID: ${req.sessionID}`);
    res.status(200).json({
      status: "success",
      sessionId: req.sessionID,
      message: "Session is active",
      user: { ...req.user, expiry: undefined },
    });
  });
};

export default sessionRoute;
