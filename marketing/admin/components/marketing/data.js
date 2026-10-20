import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const queryKey = ["smartwerk", "marketing"];
const emptyHistory = { publications: [], audit: [] };
const options = {
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  refetchOnWindowFocus: false,
  retry: false,
};

export { sessionRequest as request } from "../../session";
import { sessionRequest as request } from "../../session";

async function allPages(resource, signal) {
  const records = [];
  for (let offset = 0; offset < 50000; offset += 100) {
    const data = await request(
      `${resource}?offset=${offset}`,
      undefined,
      signal,
    );
    records.push(...data[resource]);
    if (data[resource].length < 100 || records.length >= data.count)
      return records;
  }
  throw new Error("Zu viele Datensätze für diese Ansicht.");
}

export function useMarketingData(
  section,
  { editor, editingDesign, uploading, mediaEditor, historyPage },
) {
  const client = useQueryClient();
  const settings = useQuery({
    ...options,
    queryKey: [...queryKey, "settings"],
    queryFn: ({ signal }) => request("settings", undefined, signal),
  });
  const needsPosts = ["calendar", "design", "history"].includes(section);
  const needsMedia = ["calendar", "media", "design"].includes(section);
  const needsProducts = ["products", "design"].includes(section);
  const posts = useQuery({
    ...options,
    queryKey: [...queryKey, "posts"],
    enabled: needsPosts || !!editor,
    queryFn: ({ signal }) => allPages("posts", signal),
  });
  const media = useQuery({
    ...options,
    queryKey: [...queryKey, "media"],
    enabled: needsMedia || !!editor,
    queryFn: ({ signal }) => allPages("media", signal),
  });
  const products = useQuery({
    ...options,
    queryKey: [...queryKey, "products"],
    enabled: needsProducts || !!editingDesign || uploading || !!mediaEditor,
    queryFn: ({ signal }) => allPages("products", signal),
  });
  const history = useQuery({
    ...options,
    queryKey: [...queryKey, "history", historyPage],
    enabled: section === "history",
    queryFn: ({ signal }) =>
      request(`history?offset=${historyPage * 100}`, undefined, signal),
  });
  const versions = useQuery({
    ...options,
    queryKey: [...queryKey, "post-versions", editor?.id],
    enabled: !!editor?.id,
    queryFn: ({ signal }) =>
      request(
        `posts?id=${encodeURIComponent(editor.id)}&versions=1`,
        undefined,
        signal,
      ),
  });
  const required = [
    settings,
    ...(needsPosts ? [posts] : []),
    ...(needsMedia ? [media] : []),
    ...(needsProducts ? [products] : []),
    ...(section === "history" ? [history] : []),
  ];
  const active = [
    ...required,
    ...(editor ? [posts, media] : []),
    ...(uploading || mediaEditor || editingDesign ? [products] : []),
  ];
  const load = useCallback(
    () => client.invalidateQueries({ queryKey }, { throwOnError: true }),
    [client],
  );
  return {
    data: required.every((query) => query.data !== undefined)
      ? {
          settings: settings.data,
          posts: posts.data || [],
          media: media.data || [],
          products: products.data || [],
        }
      : null,
    error: active.find((query) => query.error)?.error?.message || "",
    editorLoading: !!editor && [posts, media].some((q) => q.isPending),
    productsLoading: products.isPending,
    productsError: !!products.error,
    editorError: !!editor && [posts, media].some((q) => q.error),
    versions: versions.data?.versions || [],
    versionsLoading: !!editor?.id && versions.isPending,
    versionsError: versions.error?.message || "",
    history: history.data || emptyHistory,
    load,
  };
}
