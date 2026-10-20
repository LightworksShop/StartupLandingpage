import type { Content, Media, Post, Settings } from "./schema";

// Active/uncertain delivery must be resolved first. Completed channels stay closed.
export function approvableVersions(
  content: Content,
  publications: { channel: string; state: string }[] = [],
) {
  if (publications.some((p) => !["failed", "pending", "published", "abandoned"].includes(p.state)))
    return [];
  return content.versions.filter((version) => !publications.some(
    (p) => p.channel === version.channel && ["published", "abandoned"].includes(p.state),
  ));
}

export function automaticProductIds(content: Content, media: Media[]) {
  const ids = content.versions
    .flatMap((v) => [v.media_id, v.cover_media_id])
    .filter(Boolean);
  if (!ids.length) return [...new Set(content.product_ids)];
  return [
    ...new Set(
      media
        .filter((m) => ids.includes(m.id))
        .flatMap((m) => [
          ...(m.product_ids || []),
          ...(m.composition?.product_id ? [m.composition.product_id] : []),
        ]),
    ),
  ];
}

export function feedExclusions(
  config: Pick<Settings, "preferences" | "feed_exclusions">,
) {
  // Existing exclusions retain their feed effect until explicitly separated.
  return (
    config.feed_exclusions ??
    Object.entries(config.preferences)
      .filter(([, value]) => value === "exclude")
      .map(([id]) => id)
  );
}

export const postStatusLabels = {
  draft: "Entwurf",
  approved: "Freigegeben",
  published: "Veröffentlicht",
  failed: "Fehlgeschlagen",
  unknown: "Ergebnis offen",
  active: "Wird veröffentlicht",
  pending: "Wiederholung vorgemerkt",
  partial: "Teilweise veröffentlicht",
  abandoned: "Abgeschlossen",
};
export function postStatus(
  post: Pick<Post, "approved"> & {
    publications?: { state: string; channel: string }[];
    content?: Content;
  },
) {
  const publications = post.publications || [];
  if (publications.some((p) => p.state === "unknown")) return "unknown";
  if (publications.some((p) => p.state === "failed")) return "failed";
  if (publications.some((p) => ["preparing", "dispatching"].includes(p.state)))
    return "active";
  if (publications.some((p) => p.state === "pending")) return "pending";
  if (publications.some((p) => p.state === "published"))
    return post.content?.versions.every((v) =>
      publications.some(
        (p) => p.channel === v.channel && p.state === "published",
      ),
    )
      ? "published"
      : "partial";
  if (publications.length) return "abandoned";
  return post.approved ? "approved" : "draft";
}
