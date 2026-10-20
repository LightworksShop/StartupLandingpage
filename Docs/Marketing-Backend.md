# Smartwerk Marketing-Backend

Der bestehende Express-Server bietet unter `/marketing` einen eigenen Adminbereich:
Kalender, Beitragsversionen, Medienbibliothek, Bildgestalter, Vorlagen, JPEG-/MP4-Export,
Planung, persönliche Freigaben, Veröffentlichungshistorie und Kontoverwaltung.
Die öffentliche Website und `/api/contact` laufen im selben Prozess weiter.

## Veröffentlichung auf dem bestehenden Server

Die öffentliche Landingpage liegt auf `smartwerk-vps` unter
`/var/www/landingpage`. Bisher wurde dieser Git-Checkout über
`git pull --ff-only origin main` aktualisiert; Nginx liefert die Website statisch
aus. GitHub-Push allein veröffentlicht dort keine Änderungen.

Das Marketing-Backend erhält einen eigenen Checkout außerhalb des öffentlichen
Webverzeichnisses: `/opt/smartwerk/apps/marketing`. Der SSH-Alias `smartwerk`
verwendet lokal eine IPv6-Adresse; beim geprüften Zugriff am 20.10.2026 war
IPv4 mit `ssh -4 -o HostName=82.165.176.219 smartwerk` erreichbar.
Der Git-Checkout auf dem Server verwendet den vorhandenen Deploy-Key über
`core.sshCommand = ssh -i ~/.ssh/startuplandingpage_deploy -o IdentitiesOnly=yes`.

`compose.marketing.production.yml` betreibt PostgreSQL und das Backend getrennt
von den übrigen Anwendungen. Nur `127.0.0.1:3030` ist für Nginx erreichbar;
PostgreSQL hat keinen veröffentlichten Port. Node und FFmpeg sind im Image
enthalten. Datenbank und Medien verwenden eigene dauerhafte Docker-Volumes.
Die private `.env` im Backend-Checkout enthält die Produktionswerte, insbesondere
`MARKETING_DATABASE_URL` mit Host `database`, `MARKETING_DB_PASSWORD` und
`MARKETING_PUBLIC_URL=https://smartwerk-software.de`. Keine lokale `.env` kopieren.

Nach Bereitstellung der privaten Konfiguration im Backend-Checkout:

```sh
docker compose -f compose.marketing.production.yml build app
docker compose -f compose.marketing.production.yml up -d --wait database
docker compose -f compose.marketing.production.yml run --rm --no-deps app npm run db:migrate
docker compose -f compose.marketing.production.yml up -d --wait app
```

Die vorbereitete Nginx-Konfiguration unter `deploy/marketing/nginx.conf` erhält
die statische Website und leitet ausschließlich die Marketing-Pfade an das
Backend weiter. Andere Repository-Dateien werden nicht öffentlich ausgeliefert.
Der vorhandene statische Betrieb hatte keine Weiterleitung für `/api/contact`;
SMTP und eine entsprechende Weiterleitung sind separat einzurichten.

Die einmalige Nginx-Aktivierung benötigt Administratorrechte. Vorher die aktuelle
Konfiguration und den Unterschied zum Vorschlag prüfen, dann deren SHA-256
übergeben:

```sh
sha256sum /etc/nginx/sites-available/smartwerk-software.de
sudo bash deploy/marketing/activate.sh GEPRUEFTER_SHA256
```

Das Skript sichert die bestehende Konfiguration, verhindert das Überschreiben
eines zwischenzeitlich geänderten Stands, prüft `nginx -t`, lädt Nginx neu und
prüft `/marketing` über HTTPS. Bei Fehlern wird die alte Konfiguration
wiederhergestellt. Der erzeugte Adminzugang liegt ausschließlich in
`marketing/var/admin-access.txt` auf dem Server (Modus 600). Veröffentlichung auf
Social-Media-Plattformen bleibt deaktiviert.

Bei späteren Updates zunächst Datenbank, Medien und `.env` gesichert halten,
den Backend-Checkout aktualisieren und die vier Compose-Befehle erneut ausführen.
Die Nginx-Aktivierung ist nur bei Änderungen der Weiterleitungen nötig.
Docker-Volumes beim Update nicht entfernen.

Bei der Produktionsvorbereitung wurden die gemeldeten npm-Sicherheitslücken
durch Aktualisierung auf [React Router 7.18.4](https://github.com/remix-run/react-router/releases/tag/react-router%407.18.4)
und [Nodemailer 10.1.7](https://github.com/nodemailer/nodemailer/releases/tag/v10.1.7)
behoben. Installation/Audit meldeten am 20.10.2026 keine bekannten
Schwachstellen mehr. TypeScript, 65 Unit-/Vertragstests, sechs Datenbanktests,
vier Browsertests und ein lokaler SMTP-Kompatibilitätstest waren erfolgreich.

## Lokale Einrichtung mit Docker

Im Projektverzeichnis ausführen:

```sh
npm run setup:local
npm run db:up
npm run db:migrate
npm start
```

`setup:local` ergänzt die ignorierte Root-`.env` um fehlende lokale Einstellungen,
erzeugt zufällige Datenbank-/Sitzungs-/Verschlüsselungsschlüssel und richtet den
Benutzer `admin` mit einem zufälligen Passwort ein. Bereits gesetzte Werte,
einschließlich SMTP-Konfiguration, werden erhalten. Wiederholtes Ausführen rotiert
keine bestehenden Schlüssel oder Passwörter.

Der erzeugte Zugang steht ausschließlich lokal in `marketing/var/local-access.txt`.
Diese Datei und `.env` sind nur für den lokalen Benutzer lesbar und von Git
ausgeschlossen. Im Backend wird das Adminpasswort ausschließlich als scrypt-Hash
verwendet. Der Adminbereich ist unter `http://localhost:3000/marketing` erreichbar.

`compose.marketing.yml` startet eine eigene PostgreSQL-Instanz auf
`127.0.0.1:55432`. Daten bleiben im Docker-Volume
`smartwerk-marketing-local_postgres-data` erhalten. Mit `npm run db:stop` wird die
Datenbank angehalten; `npm run db:up` startet sie wieder. Das Volume nicht löschen,
wenn Entwürfe, Konten und Sitzungen erhalten bleiben sollen. Lokale Medien bleiben
unter `marketing/var/media`. Docker muss für diese Konfiguration laufen.

Der Versand bleibt deaktiviert. Die LinkedIn-App-Zugangsdaten werden durch die
lokale Einrichtung nicht erzeugt oder ersetzt.

## Einrichtung

Voraussetzungen: Node.js 20.17 oder neuer (empfohlen Node 24), PostgreSQL 17 und
FFmpeg im PATH für MP4. Das npm-Lockfile ist eingecheckt.

1. `npm ci` ausführen.
2. Die Variablen aus `marketing/.env.example` in die bestehende Root-`.env` oder den
   Secret-Store der Laufzeit ergänzen. Bestehende SMTP-Werte erhalten.
3. Eine eigene PostgreSQL-Datenbank und einen eigenen Datenbankbenutzer anlegen;
   `MARKETING_DATABASE_URL` hinterlegen. Für Produktion TLS über die PostgreSQL-
   Verbindungsparameter und ein passendes CA-Zertifikat konfigurieren.
4. Einen persönlichen Admin-Benutzernamen und ein Passwort ab 14 Zeichen festlegen.
   `npm run admin:password` liest das Passwort von stdin und gibt ausschließlich
   den gesalzenen scrypt-Hash aus. Den Hash als `MARKETING_ADMIN_PASSWORD_HASH`
   hinterlegen. Das Passwort nicht als Kommandozeilenargument übergeben.
5. Unabhängige zufällige Schlüssel für `MARKETING_SESSION_SECRET` (mindestens
   32 Zeichen), `MARKETING_CREDENTIALS_KEY` (32 Bytes, Base64) und gegebenenfalls
   `MARKETING_AGENT_TOKEN` erzeugen. Schlüssel serverseitig hinterlegen und sichern.
6. `npm run db:migrate` ausführen. Die versionierten, transaktionalen Migrationen
   legen sieben Marketing-Tabellen, Sitzungsspeicherung und Migrationstabelle an.
   Ein Advisory-Lock schützt parallele Migrationsstarts. Kein Schema-Aufbau beim
   normalen Webserverstart.
7. `npm start` baut den Adminbereich und startet den Server. Lokal ist er unter
   `http://localhost:3000/marketing` erreichbar; Port und Host sind konfigurierbar.
   `npm run dev` baut ebenfalls zuerst. Nach UI-Änderungen erneut bauen/starten.

Ohne Marketing-Konfiguration läuft die Website weiter; der Adminbereich zeigt
den Einrichtungsstatus und die API liefert 503. Es gibt kein Standardpasswort.
Die erste Migration setzt `paused=true`; `MARKETING_PUBLISH_ENABLED=false` bleibt
bis zur ausdrücklichen Live-Abnahme gesetzt.

`MARKETING_PUBLIC_URL` ist die feste öffentliche Origin des Servers, ohne Pfad.
In Produktion ist HTTPS erforderlich. Bei einem Reverse Proxy `HOST=0.0.0.0`
und `TRUST_PROXY_HOPS` passend zur tatsächlichen, vertrauenswürdigen Proxykette
setzen. Ohne Proxy bleibt `TRUST_PROXY_HOPS=0`. Sitzungen liegen in PostgreSQL,
Cookies sind HttpOnly/SameSite=Lax und bei HTTPS Secure. Alle angemeldeten
Schreibzugriffe benötigen Sitzung und CSRF-Token. Derzeit gibt es einen
konfigurierten persönlichen Admin; Mehrbenutzerverwaltung ist kein Bestandteil.
Sitzungen sind an den aktuellen Benutzernamen und Passwort-Hash gebunden. Änderungen
dieser Werte werden nach dem Neustart des Servers wirksam und entwerten bisherige
Anmeldungen. Sitzungen aus älteren Versionen ohne diese Bindung erfordern einmalig
eine erneute Anmeldung.

## LinkedIn: Profil und Unternehmensseiten

Im LinkedIn Developer Portal eine eigene App einrichten, Sign In with LinkedIn
using OpenID Connect freischalten und die nötigen Publishing-Produkte beantragen.
Die exakt zu registrierende Callback-URL lautet:

```text
https://EURE-DOMAIN/custom/marketing-oauth/linkedin
```

`MARKETING_LINKEDIN_CLIENT_ID` und `MARKETING_LINKEDIN_CLIENT_SECRET` gehören
ausschließlich auf den Server. `MARKETING_LINKEDIN_API_VERSION` bleibt
konfigurierbar; Implementierung und Mock-Verträge wurden am 20.10.2026 gegen die
offiziellen Dokumentationsseiten für `202608` geprüft. Vor dem Onboarding die
weiterhin unterstützte Version und die tatsächlichen App-Produkte prüfen.

Mit `MARKETING_LINKEDIN_AUTHOR_TYPE=both` werden `openid`, `profile`,
`w_member_social`, `w_organization_social` und `rw_organization_admin` angefragt.
Unter **Anbindungen → LinkedIn** persönlich anmelden und die bestätigten Ziele
laden. Das Profil wird über `userinfo` ermittelt; Unternehmensseiten werden aus
den genehmigten Seitenrollen des angemeldeten Mitglieds gelesen. Administrator-
und Content-Administrator-Rollen sind zugelassen; reine Anzeigenrollen werden
nicht als Berechtigung für organische Beiträge akzeptiert. Die API-Zugänge für
Unternehmensseiten erfordern LinkedIns Community-Management-Zulassung/App-Prüfung.
Der Code allein schaltet diese Zugänge nicht frei.

Im Beitragseditor kann jeder LinkedIn-Beitrag ein eigenes geprüftes Profil- oder
Unternehmensziel wählen. So können Beiträge für beide Zielarten gleichzeitig in
der Warteschlange stehen. Ohne explizites Beitragsziel gilt das Standardziel aus
den Anbindungen. Eine Kanalversion veröffentlicht auf genau ein Ziel; für den
gleichen Inhalt auf beiden Zielen zwei getrennte Entwürfe anlegen und freigeben.
Ein Kontowechsel oder Wechsel des Standardziels widerruft wartende Freigaben.

Der erste LinkedIn-Vertrag unterstützt Text plus **ein JPEG-/PNG-Bild**:
maximal 3.000 Zeichen Beitragstext, 4.086 Zeichen Alternativtext, weniger als
36.152.320 Pixel und ein anwendungsseitiges Uploadlimit von 15 MiB. Links gehören
in den Beitragstext. Mehrbildbeiträge, Dokumente, reine Textbeiträge und LinkedIn-
Videoveröffentlichung sind nicht Teil dieses Vertrags. MP4 kann im Gestalter
weiterhin erstellt und für die vorhandenen anderen Publisher verwendet werden.

Der Adapter prüft den Medienhash, initialisiert den Upload, speichert die Image-URN,
lädt die Bytes hoch, prüft `AVAILABLE` und den Besitzer, prüft Freigabe/Pause/Ziel
erneut und sendet danach `/rest/posts`. Die Post-ID wird aus `x-restli-id` gelesen;
eine leere 201-Antwort ist gültig. Der Upload wird ausschließlich zur dokumentierten
LinkedIn-Upload-Origin gesendet; Redirects sind gesperrt.

**Images API und Profilzugang:** Laut offizieller Dokumentation sind Tokens mit
`w_member_social` allein für versionierte Image-Statusabfragen nicht ausreichend.
Im Modus `both` werden zusätzlich die Unternehmensberechtigungen angefragt.
Die verfügbaren Lesefähigkeiten müssen beim App-Onboarding tatsächlich geprüft
werden. Zusätzliche bereits freigeschaltete Scopes können über
`MARKETING_LINKEDIN_EXTRA_SCOPES` angefragt werden; eingeschränkte Scopes wie
`r_member_social` lassen sich dadurch nicht eigenständig freischalten.
Bei verweigertem Statuszugriff stoppt der Adapter vor der Veröffentlichung mit
`LINKEDIN_IMAGE_STATUS_PERMISSION_REQUIRED`. Es wird kein Verarbeitungserfolg
angenommen. Der engere Modus `person` ist deshalb nur mit bestätigtem Zugriff auf
die erforderliche Statusabfrage für Bildbeiträge nutzbar.

Eine automatische LinkedIn-Token-Erneuerung wird nicht vorausgesetzt. Ablaufzeiten
werden aus dem Tokenvertrag übernommen; abgelaufene Zugänge müssen persönlich
erneut verbunden werden. OAuth-State ist einmalig, zehn Minuten gültig, an Admin,
Browser-Nonce und App-/Zielkonfiguration gebunden. Tokens werden mit AES-256-GCM
verschlüsselt und erscheinen nicht im Client oder in Fehlermeldungen.

## Betrieb und Freigaben

Jedes Speichern erhöht die Beitragsrevision und widerruft die Freigabe, auch bei
einer reinen Terminänderung. Freigaben binden Inhalt, Termin, unveränderliche Medien
und geprüftes Ziel. Der Scheduler prüft jede Minute; Kontenwartung läuft stündlich.
PostgreSQL-Transaktionen, Row-Locks und `unique(post_id,channel)` verhindern
konkurrierende Claims. Auch nach Upload werden Ziel, Pause und Freigabe geprüft.

Verbindungsabbrüche nach möglichem Versand ergeben `unknown`; solche Vorgänge
werden niemals automatisch wiederholt. Ergebnis auf LinkedIn klären und im Verlauf
mit Plattform-ID und Notiz dokumentieren. Nur eindeutige Fehlschläge können nach
gültiger Freigabe ausdrücklich zur Wiederholung vorgemerkt werden. Unterbrochene
Worker werden nach 15 Minuten als fehlgeschlagen beziehungsweise unklar markiert.
Bei teilweise veröffentlichten Mehrkanal-Beiträgen gilt die erneute Freigabe nur
für noch offene Kanäle. Veröffentlichte oder ohne Wiederholung abgeschlossene
Kanäle benötigen dafür keinen erneuten Kontozugang und werden nicht nochmals
versendet. Aktive oder unklare Versandvorgänge müssen zuerst geklärt werden;
Inhalt und Termin bleiben nach Beginn eines Versandversuchs unveränderlich.

Medien werden unter `MARKETING_MEDIA_DIR` mit zufälligen, unveränderlichen Dateinamen
gespeichert. Das Verzeichnis muss über Deployments erhalten und gemeinsam mit
Datenbank und Verschlüsselungsschlüssel gesichert werden. `/marketing-media/<UUID>`
liefert diese zur Veröffentlichung bestimmten Dateien öffentlich aus; Schreibzugriff
und Metadatenverwaltung erfordern Anmeldung. Dateien werden nicht als Arbeitsdateien
überschrieben. Andere Projektdateien und das Exportarchiv werden nicht ausgeliefert.
Externe Medienabrufe behalten HTTPS-Allowlist, DNS-/IP-Prüfung, Socket-Pinning,
Redirectsperre sowie Größen-/Zeitlimits; eigene gespeicherte Medien werden direkt
aus dem kontrollierten Speicher gelesen. Mehrere App-Instanzen brauchen denselben
Medien-Speicher oder einen gemeinsamen Storage-Adapter.

## Agenten-API und Modulgrenzen

`/api/marketing-agent/:resource` verwendet `x-marketing-agent-token` mit mindestens
32 Zeichen. Erlaubt sind Entwürfe, Medien, Historie, Planung und Gestalterfunktionen.
Kontoverwaltung, Einstellungen, Freigaben und Versandwiederherstellung sind gesperrt.
Ein Agentenschlüssel ersetzt keine persönliche Admin-Anmeldung.

`marketing/lib/marketing/` enthält die übernommenen, entkoppelten Verträge, Szenen,
Persistenz, OAuth- und Providerfunktionen. `marketing/admin/` enthält React-Editor
und Host-Navigation; `marketing/server/host.ts` definiert DB-, Storage-, Katalog-
und Logger-Schnittstellen. Der Katalog ist optional und standardmäßig leer.
Shop, Medusa-Laufzeit, Studio-Renderer, Redis und Merchant-Feeds werden nicht benötigt.

`marketing/adapters/medusa.ts` bietet einen dünnen Adapter für einen späteren
Lightworks-Verbraucher. Er übernimmt dessen native persönliche Authentifizierung
und verlangt explizite Host-Services. Die Grenzen wurden lokal getestet; eine
Integration oder Installation im laufenden Lightworks-System wurde nicht durchgeführt.
Für einen gemeinsamen privaten Paket-Release müssen diese Quellen in das gewünschte
Modul-Repository übernommen, als versioniertes Paket gebaut und in beiden Projekten
auf eine geprüfte Version gepinnt werden. Ein externes Repository oder Registry-Release
wurde in diesem Arbeitsauftrag nicht angelegt.

Quellbasis: Export vom 19.10.2026, Lightworks-Commit
`3d01f1307c8386552b0b0e828d396d72774ade32`. Die mitgelieferten Fontdateien und
OFL-Lizenzen bleiben unter `marketing/admin/assets/marketing-fonts/`; der Renderer
lädt sie relativ zum Modul statt relativ zum Arbeitsverzeichnis. Smartwerk-Palette
und Navigation ersetzen die Quellmarke. Die Landingpage behält ihre Gestaltung.

## Prüfung und Live-Abnahme

```sh
npm run typecheck:marketing
npm run build:marketing
npm run test:marketing
# Nur eine eigene, entbehrliche Testdatenbank verwenden: Diese Tests löschen Tabellen!
MARKETING_TEST_DATABASE_URL=postgresql://.../smartwerk_marketing_test npm run test:marketing-db
# Eine zweite, getrennte Testdatenbank für den Browserlauf:
MARKETING_TEST_DATABASE_URL=postgresql://.../smartwerk_marketing_ui_test npm run test:marketing-ui
```

Beide DB-Testbefehle akzeptieren ausschließlich Datenbanknamen mit `_test` am Ende.
Browsertests benötigen den zu Playwright passenden Chromium-Browser.
Tests prüfen reale JPEG-/MP4-Ausgaben, Freigaben, Nebenläufigkeit, Session/CSRF,
OAuth-State, Kontoziele, Uploadfehler, Header-Post-ID und unklare Zustellung.
LinkedIn-Netzwerkaufrufe sind im automatisierten Test simuliert.

Die echte App-Anmeldung, Rollen/Scopes, Statusabfrage und ein einzelner freigegebener
Testbeitrag je Zielart müssen mit den tatsächlichen LinkedIn-Zugängen abgenommen
werden. Erst danach `MARKETING_PUBLISH_ENABLED=true` setzen und die Veröffentlichung
im Adminbereich fortsetzen. Es wurden keine echten Konten verbunden oder Beiträge
veröffentlicht.

Offizielle Referenzen:

- [Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2026-08)
- [Images API und Berechtigungen](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api?view=li-lms-2026-08)
- [OAuth Authorization Code Flow](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow)
- [OpenID Connect / userinfo](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2)
- [Seitenrollen](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-access-control-by-role?view=li-lms-2026-08)
