import type { Request, Response, NextFunction } from "express";
import { config } from "../config/index.js";
import { createAgent } from "../services/didService.js";

export async function handleGetConfig(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!config.did.agentId || !config.did.clientKey) {
      res.status(500).json({
        error: "D-ID agent ID or client key not configured on server",
      });
      return;
    }

    res.json({
      agentId: config.did.agentId,
      clientKey: config.did.clientKey,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleCreateAgent(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!config.did.apiKey) {
      res.status(500).json({ error: "D-ID API key not configured on server" });
      return;
    }

    const agent = await createAgent(req.body);
    res.json(agent);
  } catch (err) {
    next(err);
  }
}
