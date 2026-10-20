import type { MarketingHost } from "../../server/host";
import { MarketingError, type Settings } from "./schema";

export type Product = {
  id: string;
  title: string;
  handle: string;
  description: string;
  images: { url: string }[];
  thumbnail: string | null;
  status: string;
  variants?: {
    id: string;
    prices?: {
      amount: number;
      currency_code: string;
      price_list_id?: string | null;
    }[];
  }[];
};
export async function products(
  scope: MarketingHost,
  offset = 0,
  ids?: string[],
) {
  const result = scope.catalog ? await scope.catalog(offset, ids) : { products: [], count: 0 };
  return { ...result, offset, limit: 100 };
}
export async function assertProducts(
  scope: MarketingHost,
  ids: string[],
  config: Settings,
) {
  if (!ids.length) return;
  const found: { products: Product[] } = { products: [] };
  for (let offset = 0; offset < ids.length; offset += 100)
    found.products.push(
      ...(await products(scope, 0, ids.slice(offset, offset + 100))).products,
    );
  for (const id of ids)
    if (
      config.preferences[id] === "exclude" ||
      !found.products.some((p) => p.id === id)
    )
      throw new MarketingError(
        "Ein gewähltes Produkt ist ausgeschlossen oder nicht mehr veröffentlicht.",
      );
}
