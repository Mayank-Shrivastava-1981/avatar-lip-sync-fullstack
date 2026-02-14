import { Router } from "express";
import {
  handleChat,
  handleGetHistory,
  handleGetSessions,
  handleNewSession,
} from "../controllers/chatController.js";

const router = Router();

router.post("/new", handleNewSession);
router.get("/sessions", handleGetSessions);
router.get("/:sessionId", handleGetHistory);
router.post("/", handleChat);

export default router;
