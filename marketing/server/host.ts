import type { Request, Response } from "express";
import type { Database } from "../lib/marketing/repository";
import type { Product } from "../lib/marketing/catalog";

// The shared module depends only on these host capabilities. No shop runtime.
export interface MarketingHost {
  db: Database;
  storage: {
    put(bytes: Buffer, extension: string): Promise<{ id: string; url: string }>;
    remove(id: string): Promise<void>;
  };
  catalog?: (offset: number, ids?: string[]) => Promise<{ products: Product[]; count: number }>;
  logger: { error(message: string): void };
}
export type MarketingRequest = Request & {
  scope: MarketingHost;
  auth_context?: { actor_type: string; actor_id: string; auth_identity_id?: string };
};
export type AuthenticatedRequest = MarketingRequest;
export type MarketingResponse = Response;
