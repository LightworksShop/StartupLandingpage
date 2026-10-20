import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { resolve, join } from "node:path";
import { MarketingError } from "../lib/marketing/schema";

export function localStorage(directory: string, origin: string) {
  const root = resolve(directory);
  const filename = (id: string) => {
    if (!/^[a-f0-9-]{36}\.(jpeg|png|webp|mp4)$/.test(id)) throw new MarketingError("Datei nicht gefunden.", 404);
    return join(root, id);
  };
  return {
    async put(bytes: Buffer, extension: string) {
      const id = `${randomUUID()}.${extension}`;
      const target = filename(id);
      await mkdir(root, { recursive: true, mode: 0o700 });
      await writeFile(target, bytes, { flag: "wx", mode: 0o600 });
      return { id, url: `${origin}/marketing-media/${id}` };
    },
    async remove(id: string) { await unlink(filename(id)); },
    async read(id: string) { return readFile(filename(id)); },
    // Only exact, immutable local objects can bypass the external DNS fetcher.
    async readURL(raw: string): Promise<Buffer | null> {
      const url = new URL(raw);
      if (url.origin !== origin || url.search || url.hash || url.username || url.password || !url.pathname.startsWith("/marketing-media/")) return null;
      return this.read(url.pathname.slice("/marketing-media/".length));
    },
  };
}
