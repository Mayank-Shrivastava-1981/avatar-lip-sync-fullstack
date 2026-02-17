import { Router } from "express";
import {
  handleGetConfig,
  handleCreateAgent,
} from "../controllers/didController.js";

const router = Router();

router.get("/config", handleGetConfig);
router.post("/agent", handleCreateAgent);

export default router;
