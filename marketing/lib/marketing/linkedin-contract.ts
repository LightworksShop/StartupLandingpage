import { z } from "zod";

export const linkedinAuthor = z.string().max(200).regex(/^urn:li:(person:[A-Za-z0-9_-]+|organization:[0-9]+)$/);
export const linkedinImage = z.string().max(200).regex(/^urn:li:image:[A-Za-z0-9_-]+$/);
export const linkedinPost = z.string().max(200).regex(/^urn:li:(share|ugcPost):[0-9]+$/);
export function linkedinScopes() {
  const kind = process.env.MARKETING_LINKEDIN_AUTHOR_TYPE || "both";
  return [...new Set(["openid", "profile", ...(kind === "both" ? ["w_member_social", "w_organization_social", "rw_organization_admin"] : kind === "organization"
    ? ["w_organization_social", "rw_organization_admin"]
    : ["w_member_social"] ), ...(process.env.MARKETING_LINKEDIN_EXTRA_SCOPES || "").split(/[ ,]+/).filter(Boolean)])];
}
