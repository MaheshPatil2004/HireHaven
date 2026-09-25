import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { getChatHistory, sendMessage, startNewChat } from "../controllers/copilot.controller.js";

const router = express.Router();

router.route("/job/:jobId/history").get(isAuthenticated, getChatHistory);
router.route("/job/:jobId/send").post(isAuthenticated, sendMessage);

// NEW ROUTE
router.route("/job/:jobId/new").post(isAuthenticated, startNewChat);

export default router;