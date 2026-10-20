import { MarketingError, type Settings } from "./schema";
import type { Product } from "./catalog";
import { berlinInstant } from "./berlin-time";
// The calendar editor and agent planning use the same Berlin wall-time contract.
export function berlinTime(date: string, time: string) {
  try {
    return berlinInstant(`${date}T${time}`)!;
  } catch {
    throw new MarketingError(
      "Wochenplatz liegt in einer Zeitumstellungslücke.",
    );
  }
}
export function proposeWeek(
  start: string,
  config: Settings,
  catalog: Product[],
  history: {
    content: { product_ids: string[] };
    scheduled_at: string | null;
  }[],
) {
  const base = new Date(`${start}T12:00:00Z`);
  if (base.getUTCDay() !== 1)
    throw new MarketingError("Wochenbeginn muss ein Montag sein.");
  const recent = new Map<string, number[]>();
  for (const post of history)
    if (post.scheduled_at)
      for (const id of post.content.product_ids)
        recent.set(id, [
          ...(recent.get(id) || []),
          new Date(post.scheduled_at).getTime(),
        ]);
  const candidates = catalog
    .filter((p) => config.preferences[p.id] !== "exclude")
    .sort(
      (a, b) =>
        Number(config.preferences[b.id] === "prefer") -
          Number(config.preferences[a.id] === "prefer") ||
        a.id.localeCompare(b.id),
    );
  return [...config.slots]
    .sort(
      (a, b) =>
        a.day - b.day ||
        a.time.localeCompare(b.time) ||
        a.channel.localeCompare(b.channel),
    )
    .map((slot) => {
      const date = new Date(base.getTime() + (slot.day - 1) * 86400000)
        .toISOString()
        .slice(0, 10);
      const scheduled_at = berlinTime(date, slot.time);
      const stamp = Date.parse(scheduled_at);
      const product = candidates.find(
        (p) =>
          !(recent.get(p.id) || []).some(
            (previous) =>
              Math.abs(stamp - previous) < config.repeat_days * 86400000,
          ),
      );
      if (product)
        recent.set(product.id, [...(recent.get(product.id) || []), stamp]);
      const season = config.seasons
        .filter((s) => s.from <= date && s.to >= date)
        .map((s) => s.name)
        .join(", ");
      return {
        content: {
          topic: `${slot.topic}${season ? ` · ${season}` : ""}`,
          notes: product
            ? "Regelbasierter Vorschlag; Texte und Medien ergänzen."
            : "Freier Werkstattbeitrag; kein Produkt innerhalb des Wiederholungsabstands verfügbar.",
          product_ids: product ? [product.id] : [],
          versions: [
            {
              channel: slot.channel,
              title: "",
              text: "",
              alt: "",
              media_id: null,
              cover_media_id: null,
              link: "",
            },
          ],
        },
        scheduled_at,
      };
    });
}
