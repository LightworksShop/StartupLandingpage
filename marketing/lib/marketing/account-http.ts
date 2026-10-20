import { linkedinAuthor } from "./linkedin-contract";
import type {
  AuthenticatedRequest,
  MarketingRequest,
  MarketingResponse,
} from "../../server/host";
import { z } from "zod";
import { humanActor } from "./http";
import { database, audit } from "./repository";
import { MarketingError } from "./schema";
import { AccountError, accountChannel, publicOrigin } from "./account-provider";
import {
  accountBoards,
  accountLinkedinTargets,
  selectLinkedinTarget,
  accountInstagramTargets,
  selectInstagramTarget,
  accountSummaries,
  disconnectAccount,
  ensureSameOrigin,
  finishOauth,
  refreshAccount,
  selectBoard,
  startOauth,
  verifyAccount,
} from "./accounts";
function safeError(error: unknown) {
  return error instanceof AccountError
    ? error.code
    : error instanceof z.ZodError
      ? "INPUT_INVALID"
      : "ACCOUNT_OPERATION_FAILED";
}
export async function handleAccounts(
  req: MarketingRequest,
  res: MarketingResponse,
  resource = "accounts",
) {
  res.setHeader("Cache-Control", "private, no-store");
  let actor = "";
  try {
    actor = humanActor(req as AuthenticatedRequest);
    const db = database(req.scope);
    if (req.method === "GET") {
      if (resource === "linkedin-targets") return res.json(await accountLinkedinTargets(db));
      if (resource === "instagram-targets") {
        const { after } = z
          .object({ after: z.string().max(2000).optional() })
          .parse(req.query);
        return res.json(await accountInstagramTargets(db, after));
      }
      if (resource === "boards") {
        const { bookmark } = z
          .object({ bookmark: z.string().max(2000).optional() })
          .parse(req.query);
        return res.json(await accountBoards(db, bookmark));
      }
      return res.json({ accounts: await accountSummaries(db) });
    }
    ensureSameOrigin(req.headers.origin);
    const input = z
      .object({
        channel: accountChannel,
        action: z.enum([
          "connect",
          "verify",
          "refresh",
          "disconnect",
          "board",
          "instagram_target",
          "linkedin_target",
        ]),
        target_id: linkedinAuthor.optional(),
        revision: z.number().int().min(0).optional(),
        page_id: z
          .string()
          .regex(/^\d{1,30}$/)
          .optional(),
        board_id: z
          .string()
          .regex(/^\d{1,30}$/)
          .optional(),
      })
      .strict()
      .parse(req.body);
    if (input.action === "connect") {
      const { url, nonce } = await startOauth(db, input.channel, actor);
      res.cookie(`mk_oauth_${input.channel}`, nonce, {
        httpOnly: true,
        sameSite: "lax",
        secure: publicOrigin().startsWith("https:"),
        path: `/custom/marketing-oauth/${input.channel}`,
        maxAge: 600000,
      });
      return res.json({ authorization_url: url });
    }
    if (input.revision === undefined)
      throw new AccountError("REVISION_REQUIRED");
    if (input.action === "disconnect")
      await disconnectAccount(db, input.channel, input.revision, actor);
    if (input.action === "verify")
      await verifyAccount(db, input.channel, input.revision, actor);
    if (input.action === "refresh") {
      const current = await refreshAccount(
        db,
        input.channel,
        actor,
        true,
        fetch,
        new Date(),
        input.revision,
      );
      if (current.value.error) throw new AccountError(current.value.error);
    }
    if (input.action === "linkedin_target") {
      if (input.channel !== "linkedin" || !input.target_id) throw new AccountError("LINKEDIN_AUTHOR_INVALID");
      await selectLinkedinTarget(db, input.revision, input.target_id, actor);
    }
    if (input.action === "instagram_target") {
      if (input.channel !== "instagram" || !input.page_id)
        throw new AccountError("INSTAGRAM_TARGET_INVALID");
      await selectInstagramTarget(db, input.revision, input.page_id, actor);
    }
    if (input.action === "board") {
      if (input.channel !== "pinterest" || !input.board_id)
        throw new AccountError("BOARD_INVALID");
      await selectBoard(db, input.revision, input.board_id, actor);
    }
    return res.json({ accounts: await accountSummaries(db) });
  } catch (error) {
    const code = safeError(error);
    if (actor)
      await audit(
        database(req.scope),
        actor,
        "account.operation_failed",
        "accounts",
        { code },
      ).catch(() => {});
    return res
      .status(
        error instanceof MarketingError
          ? error.status
          : error instanceof z.ZodError
            ? 400
            : 503,
      )
      .json({ message: accountMessage(code), code });
  }
}
export function accountMessage(code: string) {
  return (
    (
      {
        LINKEDIN_API_VERSION_MISSING: "Bitte eine unterstützte LinkedIn-API-Version auf dem Server einstellen.",
        LINKEDIN_AUTHOR_INVALID: "LinkedIn-Zielart oder Unternehmens-URN fehlt oder ist ungültig.",
        LINKEDIN_ORGANIZATION_ROLE_REQUIRED: "Für diese LinkedIn-Unternehmensseite fehlt die bestätigte Veröffentlichungsberechtigung.",
        APP_CREDENTIALS_MISSING:
          "App-ID und App-Geheimnis müssen auf dem Server hinterlegt werden.",
        LOGIN_CONFIG_MISSING:
          "Die Konfigurations-ID für Facebook Login for Business fehlt auf dem Server.",
        INSTAGRAM_TARGET_INVALID:
          "Bitte ein zugängliches professionelles Instagram-Konto mit Veröffentlichungsberechtigung auswählen.",
        API_VERSION_MISSING:
          "Bitte eine unterstützte Instagram-API-Version auf dem Server einstellen.",
        CREDENTIALS_KEY_MISSING:
          "Der Server benötigt einen Schlüssel für die verschlüsselte Kontoverwaltung.",
        CREDENTIALS_DECRYPTION_FAILED:
          "Gespeicherter Zugang kann nicht entschlüsselt werden. Serversicherheit prüfen.",
        PUBLIC_URL_MISSING:
          "Bitte die öffentliche Backend-Adresse auf dem Server einstellen.",
        PUBLIC_URL_INVALID: "Die öffentliche Backend-Adresse ist ungültig.",
        ACCOUNT_CHANGED:
          "Die Anbindung wurde inzwischen geändert. Bitte neu laden.",
        ACCOUNT_NOT_CONNECTED: "Bitte zuerst das Konto verbinden.",
        ACCOUNT_PERMISSIONS_MISSING:
          "Erforderliche Berechtigungen fehlen. Bitte das Konto erneut verbinden.",
        OAUTH_STATE_INVALID:
          "Der Anmeldevorgang ist abgelaufen oder gehört zu einer anderen Sitzung. Bitte neu starten.",
        OAUTH_DENIED: "Die Kontoanmeldung wurde abgebrochen.",
        TOKEN_EXPIRED:
          "Der Zugang ist abgelaufen. Bitte das Konto erneut verbinden.",
        REFRESH_TOKEN_EXPIRED:
          "Der Erneuerungszugang ist abgelaufen. Bitte das Konto erneut verbinden.",
        TOKEN_TOO_RECENT:
          "Instagram-Zugänge können erst nach 24 Stunden erneuert werden.",
        REAUTH_REQUIRED: "Bitte das Konto erneut verbinden.",
        ACCOUNT_IDENTITY_CHANGED:
          "Die Kontoidentität hat sich geändert. Bitte erneut verbinden.",
        BOARD_NOT_ORGANIC_PUBLIC:
          "Bitte ein öffentliches Board für organische Pins auswählen.",
        ORIGIN_INVALID:
          "Die Anfrage stammt nicht von der eingerichteten Admin-Adresse.",
      } as Record<string, string>
    )[code] ||
    "Die Kontoanbindung konnte nicht geprüft oder aktualisiert werden. Bitte Einrichtung und Berechtigungen prüfen."
  );
}
export async function handleOauthCallback(
  req: MarketingRequest,
  res: MarketingResponse,
) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  let actor = "",
    channel = "",
    code = "";
  try {
    actor = humanActor(req as AuthenticatedRequest);
    channel = accountChannel.parse(req.params.channel);
    const query = z
      .object({
        state: z.string().max(100),
        code: z.string().max(4096).optional(),
        error: z.string().max(200).optional(),
      })
      .parse(req.query);
    const nonce = req.cookies?.[`mk_oauth_${channel}`] || "";
    await finishOauth(
      database(req.scope),
      accountChannel.parse(channel),
      actor,
      { state: query.state, nonce, code: query.code, denied: !!query.error },
    );
  } catch (error) {
    code = safeError(error);
    if (actor)
      await audit(
        database(req.scope),
        actor,
        "account.oauth_failed",
        channel || "accounts",
        { code },
      ).catch(() => {});
  }
  let origin: string;
  try {
    origin = publicOrigin();
  } catch (error) {
    const reason = safeError(error);
    return res
      .status(503)
      .json({ message: accountMessage(reason), code: reason });
  }
  if (channel)
    res.clearCookie(`mk_oauth_${channel}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: origin.startsWith("https:"),
      path: `/custom/marketing-oauth/${channel}`,
    });
  // Always return to a fixed same-origin Admin page; never forward provider code/error/token.
  return res.redirect(
    303,
    `${origin}/marketing/settings?tab=connections&oauth=${code ? "error" : "success"}${code ? `&reason=${encodeURIComponent(code)}` : ""}`,
  );
}
