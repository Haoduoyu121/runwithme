const KEY = "runwithme_ai_persona_v1";

export type UserPersona = {
  name: string;
  description: string;
};

export function loadPersona(): UserPersona {
  if (typeof window === "undefined")
    return { name: "你", description: "" };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      name:
        typeof raw.name === "string" && raw.name.trim()
          ? raw.name.trim()
          : "你",
      description:
        typeof raw.description === "string"
          ? raw.description
          : "",
    };
  } catch {
    return { name: "你", description: "" };
  }
}

export function savePersona(p: UserPersona) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function buildPersonaBlock(p: UserPersona): string {
  const parts: string[] = [];
  if (p.description.trim()) {
    parts.push(`[用户信息]\n${p.description.trim()}`);
  }
  return parts.join("\n");
}