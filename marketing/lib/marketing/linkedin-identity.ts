import { AccountError, accountRequest, type TokenSet } from "./account-provider";
import { linkedinAuthor, linkedinScopes } from "./linkedin-contract";

export function linkedinConfig() {
  const apiVersion = process.env.MARKETING_LINKEDIN_API_VERSION || "";
  if (!/^20\d{2}(0[1-9]|1[0-2])$/.test(apiVersion)) throw new AccountError("LINKEDIN_API_VERSION_MISSING", 503);
  const authorType = process.env.MARKETING_LINKEDIN_AUTHOR_TYPE || "both";
  if (!["person", "organization", "both"].includes(authorType)) throw new AccountError("LINKEDIN_AUTHOR_INVALID", 503);
  const organization = process.env.MARKETING_LINKEDIN_ORGANIZATION_URN || "";
  if (authorType === "organization" && !/^urn:li:organization:[0-9]+$/.test(organization)) throw new AccountError("LINKEDIN_AUTHOR_INVALID", 503);
  return { apiVersion, authorType, organization };
}
export function linkedinHeaders(token: string, apiVersion = linkedinConfig().apiVersion) {
  return { Authorization: `Bearer ${token}`, "Linkedin-Version": apiVersion, "X-Restli-Protocol-Version": "2.0.0", "Content-Type": "application/json" };
}
export async function exchangeLinkedin(code: string, clientId: string, clientSecret: string, redirectUri: string, fetcher: typeof fetch, now: Date): Promise<TokenSet> {
  const raw = await accountRequest("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri }).toString(),
  }, fetcher);
  const seconds = Number(raw.expires_in);
  if (typeof raw.access_token !== "string" || !raw.access_token || raw.access_token.length > 16000 || !Number.isFinite(seconds) || seconds <= 0 || seconds > 400 * 86400) throw new AccountError("ACCOUNT_INVALID_RESPONSE", 502);
  // Never invent consent when the token response omits scopes.
  const scopes = typeof raw.scope === "string" ? raw.scope.split(/[ ,]+/).filter(Boolean) : [];
  if (linkedinScopes().some(scope => !scopes.includes(scope))) throw new AccountError("ACCOUNT_PERMISSIONS_MISSING");
  return { access_token: raw.access_token, expires_at: new Date(now.getTime() + seconds * 1000).toISOString(), issued_at: now.toISOString(), refresh_expires_at: null, scopes };
}
export async function probeLinkedin(tokens: TokenSet, fetcher: typeof fetch = fetch) {
  const config = linkedinConfig();
  if (tokens.expires_at && Date.parse(tokens.expires_at) <= Date.now()) throw new AccountError("TOKEN_EXPIRED");
  if (linkedinScopes().some(scope => !tokens.scopes.includes(scope))) throw new AccountError("ACCOUNT_PERMISSIONS_MISSING");
  const profile = await accountRequest("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` } }, fetcher);
  if (typeof profile.sub !== "string" || !/^[A-Za-z0-9_-]+$/.test(profile.sub)) throw new AccountError("ACCOUNT_INVALID_RESPONSE", 502);
  const person = linkedinAuthor.parse(`urn:li:person:${profile.sub}`);
  const target = config.authorType === "organization" ? config.organization : person;
  if (config.authorType === "organization") {
    let permitted = false;
    for (let start = 0; start < 10000; start += 100) {
      const roles = await accountRequest(`https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&state=APPROVED&start=${start}&count=100`, { headers: linkedinHeaders(tokens.access_token) }, fetcher);
      if (!Array.isArray(roles.elements)) throw new AccountError("ACCOUNT_INVALID_RESPONSE", 502);
      permitted = roles.elements.some((role: Record<string, unknown>) =>
        (role.organization || role.organizationTarget) === target && role.roleAssignee === person && role.state === "APPROVED" && ["ADMINISTRATOR", "CONTENT_ADMINISTRATOR", "CONTENT_ADMIN"].includes(String(role.role)));
      if (permitted || roles.elements.length < 100) break;
    }
    if (!permitted) throw new AccountError("LINKEDIN_ORGANIZATION_ROLE_REQUIRED", 403);
  }
  return { account_id: person, target_id: target, username: String(profile.name || profile.sub).slice(0, 200), scopes: tokens.scopes };
}

export async function linkedinTargets(tokens: TokenSet, fetcher: typeof fetch = fetch) {
  const profile = await probeLinkedin(tokens, fetcher);
  const config = linkedinConfig();
  const targets: { id: string; name: string }[] = config.authorType === "organization" ? [] : [{ id: profile.account_id, name: `${profile.username} · Persönliches Profil` }];
  if (config.authorType !== "person") {
    for (let start = 0; start < 10000; start += 100) {
      const raw = await accountRequest(`https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&state=APPROVED&start=${start}&count=100`, { headers: linkedinHeaders(tokens.access_token) }, fetcher);
      if (!Array.isArray(raw.elements)) throw new AccountError("ACCOUNT_INVALID_RESPONSE", 502);
      for (const role of raw.elements) {
        const id = role.organization || role.organizationTarget;
        if (role.roleAssignee === profile.account_id && role.state === "APPROVED" && ["ADMINISTRATOR", "CONTENT_ADMINISTRATOR", "CONTENT_ADMIN"].includes(role.role) && /^urn:li:organization:[0-9]+$/.test(id) && (config.authorType !== "organization" || id === config.organization) && !targets.some(t => t.id === id)) targets.push({ id, name: `Unternehmensseite · ${id}` });
      }
      if (raw.elements.length < 100) return { profile, targets };
    }
    throw new AccountError("LINKEDIN_TARGET_LIMIT", 400);
  }
  return { profile, targets };
}
export async function verifyLinkedinTarget(tokens: TokenSet, target: string, fetcher: typeof fetch = fetch) {
  const { profile, targets } = await linkedinTargets(tokens, fetcher);
  if (!targets.some(item => item.id === target)) throw new AccountError("LINKEDIN_ORGANIZATION_ROLE_REQUIRED", 403);
  return profile;
}
