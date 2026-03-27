export interface WebMedicalEntry {
  title: string;
  url: string;
  snippet: string;
  source: "web";
}

const MEDLINEPLUS_SEARCH_ENDPOINT =
  "https://wsearch.nlm.nih.gov/ws/query?db=healthTopics&retmax=3&term=";

const ALLOWED_WEB_HOSTS = new Set([
  "medlineplus.gov",
  "www.cdc.gov",
  "cdc.gov",
  "www.who.int",
  "who.int",
  "www.nih.gov",
  "nih.gov",
  "www.nice.org.uk",
  "nice.org.uk",
  "www.nlm.nih.gov",
  "nlm.nih.gov",
]);

const WEB_CACHE_TTL_MS = 10 * 60 * 1000;

type CacheItem = {
  timestamp: number;
  entries: WebMedicalEntry[];
};

function sanitizeText(value: string): string {
  return value
    .replaceAll(/<!\[CDATA\[|\]\]>/g, "")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function parseMedlinePlusXml(xml: string): WebMedicalEntry[] {
  const docs = [...xml.matchAll(/<document\b[^>]*>([\s\S]*?)<\/document>/g)];

  return docs
    .map((match): WebMedicalEntry | null => {
      const body = match[1];
      const titleMatch = body.match(
        /<content\s+name="title"[^>]*>([\s\S]*?)<\/content>/,
      );
      const urlMatch = body.match(
        /<content\s+name="url"[^>]*>([\s\S]*?)<\/content>/,
      );
      const snippetMatch = body.match(
        /<content\s+name="FullSummary"[^>]*>([\s\S]*?)<\/content>/,
      );

      const title = sanitizeText(titleMatch?.[1] ?? "");
      const url = sanitizeText(urlMatch?.[1] ?? "");
      const snippet = sanitizeText(snippetMatch?.[1] ?? "").slice(0, 700);

      if (!title || !url || !snippet) return null;

      return {
        title,
        url,
        snippet,
        source: "web",
      };
    })
    .filter((entry): entry is WebMedicalEntry => entry !== null)
    .filter((entry) => {
      try {
        const host = new URL(entry.url).hostname.toLowerCase();
        return ALLOWED_WEB_HOSTS.has(host);
      } catch {
        return false;
      }
    });
}

export class WebFallbackService {
  private readonly cache = new Map<string, CacheItem>();

  async searchMedicalReferences(
    query: string,
    opts: { timeoutMs?: number } = {},
  ): Promise<WebMedicalEntry[]> {
    const cacheKey = query.trim().toLowerCase();
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp <= WEB_CACHE_TTL_MS) {
      return cached.entries;
    }

    const timeoutMs = opts.timeoutMs ?? 5000;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        `${MEDLINEPLUS_SEARCH_ENDPOINT}${encodeURIComponent(query)}`,
        {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        },
      );

      if (!response.ok) {
        console.warn(
          `[WebFallbackService] MedlinePlus request failed: ${response.status}`,
        );
        return [];
      }

      const xml = await response.text();
      const entries = parseMedlinePlusXml(xml);
      this.cache.set(cacheKey, {
        timestamp: Date.now(),
        entries,
      });
      return entries;
    } catch (error) {
      console.warn("[WebFallbackService] Medical web fallback failed:", error);
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }

  formatForPrompt(entries: WebMedicalEntry[]): string {
    if (entries.length === 0) return "";

    const sections = entries.map(
      (entry) =>
        `### ${entry.title}\nSource: ${entry.source} (${entry.url})\n${entry.snippet}`,
    );

    return [
      "## Web Medical References (general information only)",
      "Use these only as supplemental references. Prioritize patient records for patient-specific facts.",
      "Allowlisted sources: WHO, CDC, NIH/NLM, NICE, MedlinePlus.",
      "",
      ...sections,
    ].join("\n\n");
  }
}

export const webFallbackService = new WebFallbackService();
