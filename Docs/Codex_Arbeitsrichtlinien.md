# Codex Projektleitfaden

Dieses Dokument dient als technische und organisatorische Uebergabe fuer den naechsten Entwickler oder den naechsten Codex-Chat. Es beschreibt nicht nur Arbeitsregeln, sondern auch den aktuellen Projektstand, wichtige Entscheidungen und bekannte Besonderheiten.

## Zweck

- Kontextverluste zwischen Sessions vermeiden
- wiederkehrende Projektentscheidungen dokumentieren
- typische Fehlerquellen und Sonderfaelle sichtbar machen
- eine konsistente Weiterentwicklung der Landingpage sicherstellen

## Verbindliche Arbeitsregeln

1. Nach jeder inhaltlichen Umsetzung auf einen Prompt soll Codex eine passende Commit-Message auf Englisch vorschlagen.
2. Commit-Messages sollen kurz, praezise und in einem professionellen Stil formuliert sein.
3. Wenn eine Aenderung mehrere Bereiche betrifft, soll die Commit-Message den wichtigsten fachlichen Schwerpunkt priorisieren.
4. Vor groesseren Layout-, Struktur- oder Styling-Aenderungen soll zuerst der aktuelle Stand der betroffenen Dateien geprueft werden.
5. Vor Dateiedits soll kurz kommuniziert werden, was angepasst wird.
6. Bei Uebernahmen oder Rueckbauten von Aenderungen soll bestehender Nutzerwunsch priorisiert werden, auch wenn fruehere Entscheidungen technisch anders gedacht waren.
7. Der Nutzer arbeitet iterativ und visuell. Viele Aenderungen sind bewusst fein granular. Keine groesseren Sammelrefactorings ohne klaren Bedarf.
8. Wenn moeglich, keine unnötigen neuen Abhaengigkeiten einfuehren.

## Format fuer Commit-Message-Vorschlaege

Bevorzugtes Format:

```text
type: short description
```

Beispiele:

```text
feat: add interactive module showcase section
fix: remove obsolete module detail label
style: align module showcase width with global section container
copy: update module integration options
```

## Projektuebersicht

Projekt: Landingpage fuer `Flow`

Relevante Hauptdateien:

- `index.html`
- `styles.css`
- `app.js`
- `content.js`
- `server.js`
- `impressum.html`
- `datenschutz.html`

Weitere Hilfsdateien:

- `git-sync.sh`
- `robots.txt`
- `sitemap.xml`
- `.env.example`
- `Docs/Seitenstruktur.md`
- `Docs/Inhalt und Entwicklung`

## Technische Architektur

Die Seite ist aktuell kein Framework-Projekt, sondern eine statische Frontend-Struktur mit JS-Rendering fuer inhaltsgetriebene Bereiche.

### Frontend

- `index.html` enthaelt die Hauptstruktur.
- `content.js` enthaelt konfigurierbare Inhalte fuer mehrere Sektionen.
- `app.js` rendert datengetriebene Bereiche aus `content.js` und steuert Interaktionen.
- `styles.css` enthaelt das gesamte Styling inklusive responsiver Anpassungen.

### Backend / Formular

- `server.js` stellt den Mail-Endpoint bereit.
- Formularversand laeuft ueber `smtpRelayUrl` aus `content.js`.
- Aktuell ist `smtpRelayUrl` auf `"/api/contact"` gesetzt.
- Der Mailversand ist ohne Datenbank vorbereitet, aber spaeter erweiterbar.

## Deployment- und Runtime-Hinweise

### SMTP / Backend

Relevante Stellen:

- `content.js`: `flowContent.form.smtpRelayUrl`
- `server.js`: Mailversand und Absicherung
- `.env.example`: Beispiel fuer benoetigte Umgebungsvariablen

Server-seitig bereits umgesetzt:

- `helmet`
- `compression`
- CORS-Whitelist ueber `ALLOWED_ORIGINS` bzw. `ALLOWED_ORIGIN`
- Rate-Limiting
- einfaches Hardening des Formularendpunkts

### CORS / Environment

Relevante Variable:

- `ALLOWED_ORIGINS`

Beispiel:

```text
ALLOWED_ORIGINS=http://localhost:4173,http://localhost:3000
```

## Asset-Stand

### Logo / Favicon

- Hauptlogo: `assets/images/logo.svg`
- Favicon: `assets/images/favicon.svg`
- Favicon basiert auf `assets/images/favicon-base.svg`

### Bilder

Aktuell relevante Bilder:

- `assets/images/business-values-1-1800.jpg`
- `assets/images/business-values-2-1800.jpg`
- `assets/images/Render4.jpg`
- `assets/images/team-benjamin-512.jpg`
- `assets/images/team-yannis-512.jpg`
- `assets/images/hero-mockup.svg` als technischer Fallback

Wichtig:

- In der Modul-Sektion werden derzeit Platzhalterbilder genutzt.
- Die frueheren internen JS-Mockups fuer die Modul-Sektion wurden entfernt.
- Alte `mockup`-Daten in `content.js` wurden bewusst bereinigt.

## Aktuelle Designentscheidungen

### Typografie

- globaler Font: `Barlow`
- Font-Smoothing aktiv

Relevante Stellen:

- `index.html`: Google Fonts Einbindung
- `styles.css`: `font-family`, `-webkit-font-smoothing`, `-moz-osx-font-smoothing`

### Farbwelt

Aktuelle Leitfarben:

- Hauptfarbe / Anthrazit: `#1F2937`
- Akzentfarbe / Orange: `#F97316`
- heller Hintergrund: `#F3F4F6`
- Sekundaertext: `#6B7280`

Wichtig:

- Die Landingpage wurde mehrfach auf diese Farbwelt umgestellt.
- Nicht versehentlich alte Petrol-/Coral-Palette wieder einfuehren.

### Containerbreite

- globale Containerbreite: `1360px`
- relevante Variable in `styles.css`: `--container: 1360px`

Wichtig:

- Es gab wiederholt Rueckfragen, wenn einzelne Sektionen davon abwichen.
- Sonderbreiten nur bewusst einsetzen und begruenden.

### Ecken / Look

- kein starkes Rounded-Corner-Design
- eher eckig bzw. sehr kleine Radien

## Sprach- und Tonalitaetsvorgaben

### Ansprache

Wunsch des Nutzers:

- grundsaetzlich rheinische / direkte Ansprache
- `ihr`, `euch`, `euer`
- keine formelle `Sie`-Ansprache
- auch keine Mischansprache mit `du/dein`

Wichtig:

- Dieser Punkt wurde erst spaet explizit angefordert.
- Es ist sehr wahrscheinlich, dass im Projekt noch weitere Stellen mit `Sie` oder `dein` verblieben sind.
- Bei kuenftigen Textaenderungen immer auf konsistente Ansprache achten.

### Sprache im Code / Copy

- UI- und Marketingtexte koennen Umlaute enthalten
- technische Kommentare oder Konfigurationswerte koennen weiterhin ASCII bleiben

## Interaktions- und JS-Stand

### Bestehende Interaktionen in `app.js`

- Bild-Fallbacks: `setupImageFallbacks()`
- FAQ-Accordion
- mobiles Menue
- Header-Shrink
- Anker-Offset fuer Sticky-Header
- Solution-Scroll-Effekt
- Praxis-Tile-Reveal
- Prozess-Fortschrittslinie / Schrittaktivierung
- Modul-Sektion mit dynamischem Detailwechsel

### Wichtig fuer Folgesessions

- `renderContent()` rendert mehrere inhaltsgetriebene Bereiche.
- Neue DOM-Elemente fuer bestehende Sektionen muessen oft sowohl in `index.html` als auch in `app.js` bedacht werden.
- Nach dynamischem Austausch von Bildern muss `setupImageFallbacks()` ggf. erneut aufgerufen werden. Das ist in der Modul-Sektion bereits beruecksichtigt.

## Aktueller Seitenaufbau

Stand heute grob in dieser Reihenfolge:

1. Hero
2. Ausgangslage
3. Unsere Loesung
4. Unternehmensleitbild / Wirkung in der Praxis
5. Funktionsbereiche
6. Unser Vorgehen
7. Pakete
8. Ueber uns
9. Pilot / Formular
10. FAQ
11. Footer

Hinweis:

- `Docs/Seitenstruktur.md` ist eine hilfreiche Referenz, aber nicht immer auf dem allerletzten visuellen Stand.
- Vor strukturellen Anpassungen immer gegen `index.html` pruefen.

## Wichtige aktuelle Sonderbereiche

### Modul-Sektion `#funktionsbereiche`

Status:

- dunkler Bereich
- Intro linksbuendig
- links vertikale Modulkarten
- rechts Detailtext als Overlay auf Bild
- Bild rechtsbuendig, derzeit Platzhalterbild

Wichtige Dateien:

- `index.html`
- `styles.css`
- `content.js`
- `app.js`

Wichtige Hinweise:

- Die Sektion wurde mehrfach umgebaut.
- Alte interne Mockup-Strukturen sind entfernt.
- Bildoverlay liegt aktuell auf dem Bildbereich, nicht auf der Textbox.
- Der Nutzer legt grossen Wert auf genaue visuelle Ausrichtung.

### Prozess-Sektion `#vorgehen`

Status:

- 4 Cards
- segmentierte Linie oberhalb der Cards
- Scroll-Progress aktiviert nacheinander `01` bis `04`

Wichtige Hinweise:

- Die Aktivierung ist sectionsbasiert, nicht mehr card-basiert.
- Fruehere Observer-Loesung war optisch unzuverlaessig, weil die Cards in einer Reihe liegen.

### Leitbild-/Praxis-Sektion

Status:

- editorial / split-band Layout
- Bilder full-bleed
- Praxis-Tiles mit Flow-Icon aus dem Favicon

Wichtige Hinweise:

- die Wirkung-in-der-Praxis-Tiles wurden mehrfach manuell feinjustiert
- Overlay-/Bildanschluesse dort nicht leichtfertig aendern

## Bekannte Stolperstellen

1. Der Nutzer achtet stark auf exakte Alignment-Details.
2. Breitenabweichungen einzelner Sektionen fallen sofort auf.
3. Versehentliche Rueckkehr zu alter Ansprache oder alten Farbpaletten fuehrt wahrscheinlich zu Korrekturen.
4. Alte Zustandsreste in JS/HTML/CSS muessen nach Umbauten aktiv entfernt werden. Nur Optik aendern reicht oft nicht.
5. Nach dynamischen Bildwechseln Fallback-Bindung nicht vergessen.
6. Mobile Layouts nach Desktop-Aenderungen immer mitpruefen, vor allem:
   - Menue
   - Hero
   - Leitbild / Funktionsbereiche
   - Prozess- und Kartenbereiche

## Bedienung / Arbeitsweise im Repo

### Git-Helfer

Es gibt ein Hilfsscript:

- `git-sync.sh`

Funktion:

- fragt die Commit-Message ab
- fuehrt `git add -A`
- fuehrt `git commit -m "..."`
- fuehrt `git push`

### Rechtliche Seiten

- `impressum.html`
- `datenschutz.html`

Diese Seiten sind bereits am Theme orientiert, aber bei groesseren globalen Designaenderungen mitpruefen.

## Empfohlener Ablauf fuer den naechsten Entwickler / Codex-Chat

1. Zuerst `index.html`, `styles.css`, `app.js`, `content.js` oeffnen.
2. Vor Layout-Aenderungen die betroffene Sektion komplett in HTML, CSS und ggf. JS lokalisieren.
3. Bei datengetriebenen Bereichen zuerst `content.js` pruefen.
4. Nach jeder funktionalen JS-Aenderung `node --check app.js` ausfuehren.
5. Nach jeder Umsetzung eine englische Commit-Message liefern.

## Offen / bei kuenftigen Sessions mitdenken

- Ansprache im gesamten Dokumentbestand konsequent auf `ihr/euch` vereinheitlichen
- reale Bilder fuer die Modul-Sektion statt Platzhaltern einsetzen
- `Docs/Seitenstruktur.md` bei Bedarf an den tatsaechlichen Stand angleichen
- falls spaeter noetig: weitere Performance-Feinschliffe und echte Device-QA

## Pflegehinweis

Dieses Dokument soll bei relevanten Projektentscheidungen aktualisiert werden. Es ist keine allgemeine Ideensammlung, sondern eine operative Uebergabedatei.
