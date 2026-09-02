export const PROJECT_FIELD_TYPES = [
  "text",
  "textarea",
  "email",
  "url",
  "number",
  "date",
  "select",
] as const;

export type ProjectFieldType = (typeof PROJECT_FIELD_TYPES)[number];

export const PROJECT_FIELD_TYPE_LABELS: Record<ProjectFieldType, string> = {
  text: "Tekst",
  textarea: "Lang tekst",
  email: "E-post",
  url: "Lenke",
  number: "Tall",
  date: "Dato",
  select: "Nedtrekksliste",
};

export type ProjectField = {
  key: string;
  label: string;
  type: ProjectFieldType;
  required: boolean;
  options?: string[];
};

export type ProjectTypeSummary = {
  id: string;
  name: string;
  fields: ProjectField[];
  checklist: string[];
  sortOrder: number;
};

export function isProjectFieldType(value: string): value is ProjectFieldType {
  return (PROJECT_FIELD_TYPES as readonly string[]).includes(value);
}

/** Derives a stable snake_case storage key from a human label. */
export function fieldKeyFromLabel(label: string): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .replaceAll("æ", "ae")
    .replaceAll("ø", "oe")
    .replaceAll("å", "aa")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized.length > 0 ? normalized.slice(0, 60) : "felt";
}

/** Tolerant of hand-edited or legacy jsonb — never throws on bad shapes. */
export function parseFieldSchema(value: unknown): ProjectField[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const fields: ProjectField[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    const raw = entry as Record<string, unknown>;
    const key = typeof raw.key === "string" ? raw.key.trim() : "";
    const label = typeof raw.label === "string" ? raw.label.trim() : "";
    if (!key || !label || seen.has(key)) {
      continue;
    }
    const type =
      typeof raw.type === "string" && isProjectFieldType(raw.type)
        ? raw.type
        : "text";
    const options = Array.isArray(raw.options)
      ? raw.options
          .filter((option): option is string => typeof option === "string")
          .map((option) => option.trim())
          .filter((option) => option.length > 0)
      : undefined;
    seen.add(key);
    fields.push({
      key,
      label,
      type,
      required: raw.required === true,
      ...(type === "select" && options && options.length > 0
        ? { options }
        : {}),
    });
  }
  return fields;
}

export function parseChecklistTemplate(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function parseCustomFields(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") {
      result[key] = entry;
    } else if (typeof entry === "number" || typeof entry === "boolean") {
      result[key] = String(entry);
    }
  }
  return result;
}

/**
 * Reads submitted values for a type's schema. Returns a validation error
 * message instead of throwing so callers can redirect with feedback.
 */
export function collectCustomFields(
  fields: ProjectField[],
  read: (key: string) => string
): { values: Record<string, string> } | { error: string } {
  const values: Record<string, string> = {};
  for (const field of fields) {
    const value = read(field.key).trim();
    if (value.length === 0) {
      if (field.required) {
        return { error: `${field.label} må fylles ut.` };
      }
      continue;
    }
    if (field.type === "email" && !value.includes("@")) {
      return { error: `${field.label} må være en gyldig e-post.` };
    }
    if (field.type === "number" && !Number.isFinite(Number(value))) {
      return { error: `${field.label} må være et tall.` };
    }
    if (
      field.type === "select" &&
      field.options &&
      !field.options.includes(value)
    ) {
      return { error: `${field.label} har en ugyldig verdi.` };
    }
    values[field.key] = value;
  }
  return { values };
}

/** Picks the field most likely to name the client, for list/summary views. */
export function customerLabel(values: Record<string, string>): string | null {
  const candidate =
    values.customer_name ?? values.kunde ?? values.customer ?? "";
  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const SHARED_DEFAULT_FIELDS: ProjectField[] = [
  { key: "customer_name", label: "Kunde (firma)", type: "text", required: true },
  { key: "contact_name", label: "Kontaktperson", type: "text", required: false },
  {
    key: "contact_email",
    label: "Kontakt-e-post",
    type: "email",
    required: false,
  },
  {
    key: "old_website_url",
    label: "Gammel nettside",
    type: "url",
    required: false,
  },
  { key: "domain", label: "Domene", type: "text", required: false },
  {
    key: "production_domain",
    label: "Produksjonsdomene",
    type: "text",
    required: false,
  },
];

/** Mirrors the seed in migration 0011, for workspaces created afterwards. */
export const DEFAULT_PROJECT_TYPES: Array<{
  name: string;
  fields: ProjectField[];
  checklist: string[];
}> = [
  {
    name: "Custom nettside",
    fields: SHARED_DEFAULT_FIELDS,
    checklist: [
      "Har kunden bilder/logo?",
      "Lager kunden innhold selv?",
      "Skal kunden ha Trafikk (SEO-produkt)?",
      "Skriver kunden tekst selv?",
      "Har kunden domeneinnlogging?",
      "Kundeuttalelse etterspurt?",
    ],
  },
  {
    name: "Landingsside",
    fields: SHARED_DEFAULT_FIELDS,
    checklist: [
      "Har kunden bilder/logo?",
      "Skriver kunden tekst selv?",
      "Har kunden domeneinnlogging?",
      "Kundeuttalelse etterspurt?",
    ],
  },
  {
    name: "Grafisk",
    fields: SHARED_DEFAULT_FIELDS,
    checklist: [
      "Har kunden bilder/logo?",
      "Lager kunden innhold selv?",
      "Er filformater og leveranse avklart?",
      "Kundeuttalelse etterspurt?",
    ],
  },
  {
    name: "Annet",
    fields: SHARED_DEFAULT_FIELDS,
    checklist: [
      "Er omfanget avklart med kunden?",
      "Kundeuttalelse etterspurt?",
    ],
  },
];
