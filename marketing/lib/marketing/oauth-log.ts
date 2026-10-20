import type { NextFunction } from "express";
import type { MarketingRequest, MarketingResponse } from "../../server/host";

// Host request loggers may read originalUrl/referrer when the response finishes.
// Retain req.url/query for routing and OAuth validation, but never log the code/state.
export function redactOauthLog(req: MarketingRequest, _res: MarketingResponse, next: NextFunction) {
  req.originalUrl = (req.originalUrl || req.url).split("?")[0];
  for (const header of ["referer", "referrer"]) {
    if (req.headers[header]) req.headers[header] = "[redacted]";
  }
  next();
}
