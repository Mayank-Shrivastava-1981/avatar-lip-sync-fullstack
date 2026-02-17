import { config } from "../config/index.js";

const DID_API_BASE = "https://api.d-id.com";

function getAuthHeader(): string {
  return `Basic ${Buffer.from(config.did.apiKey).toString("base64")}`;
}

interface CreateAgentOptions {
  preview_name?: string;
  presenter?: {
    type?: string;
    presenter_id?: string;
    voice?: {
      type?: string;
      voice_id?: string;
    };
  };
  llm?: {
    provider?: string;
    model?: string;
    instructions?: string;
  };
}

export async function createAgent(options: CreateAgentOptions = {}) {
  const body = {
    preview_name: options.preview_name || "AI Teacher",
    presenter: {
      type: options.presenter?.type || "clip",
      presenter_id:
        options.presenter?.presenter_id ||
        "v2_public_Amber@0zSz8kflCN",
      voice: {
        type: options.presenter?.voice?.type || "microsoft",
        voice_id:
          options.presenter?.voice?.voice_id ||
          "en-US-JennyMultilingualV2Neural",
      },
    },
    llm: {
      provider: options.llm?.provider || "openai",
      model: options.llm?.model || "gpt-4.1-mini",
      instructions: options.llm?.instructions || config.systemPrompt,
    },
  };

  const res = await fetch(`${DID_API_BASE}/agents`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`D-ID create agent failed (${res.status}): ${err}`);
  }

  return res.json();
}

export async function getAgent(id: string) {
  const res = await fetch(`${DID_API_BASE}/agents/${id}`, {
    headers: {
      Authorization: getAuthHeader(),
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`D-ID get agent failed (${res.status}): ${err}`);
  }

  return res.json();
}
