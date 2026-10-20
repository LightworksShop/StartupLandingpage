import type { MarketingHost, MarketingRequest, MarketingResponse } from "../server/host";
import { handle } from "../lib/marketing/http";
import { handleAccounts, handleOauthCallback } from "../lib/marketing/account-http";
import { dispatchDue } from "../lib/marketing/publishing";

// The consumer supplies native DB, file and catalog services. This adapter never
// elevates an API key or agent credential into a personal admin session.
export function medusaAdapter(resolveHost: (nativeScope: unknown) => MarketingHost) {
  const request = (req: MarketingRequest) => ({ ...req, scope: resolveHost(req.scope) }) as MarketingRequest;
  return {
    admin: (req: MarketingRequest, res: MarketingResponse, resource: string) => handle(request(req), res, resource),
    agent: (req: MarketingRequest, res: MarketingResponse, resource: string) => handle(request(req), res, resource, true),
    accounts: (req: MarketingRequest, res: MarketingResponse, resource = "accounts") => handleAccounts(request(req), res, resource),
    callback: (req: MarketingRequest, res: MarketingResponse) => handleOauthCallback(request(req), res),
    publish: (nativeScope: unknown) => dispatchDue(resolveHost(nativeScope)),
  };
}
