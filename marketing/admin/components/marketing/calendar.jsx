import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  postStatus,
  postStatusLabels,
} from "../../../lib/marketing/post-model";
import {
  ChannelBadge,
  Empty,
  Icon,
  Thumbnail,
  dayKey,
  formatDate,
  monday,
  plusDays,
} from "./common";
function berlinHour(value) {
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  return Number(parts.find((part) => part.type === "hour").value);
}
export default function Calendar({ posts, media, onEdit, onNew }) {
  const [params, setParams] = useSearchParams();
  const change = (key, value) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  const week = params.get("week");
  const start =
    week &&
    /^\d{4}-\d{2}-\d{2}$/.test(week) &&
    Number.isFinite(Date.parse(week))
      ? monday(week)
      : monday();
  const view = params.get("view") === "list" ? "list" : "week";
  const channel = params.get("channel") || "",
    status = params.get("status") || "";
  const [filters, setFilters] = useState(!!channel || !!status);
  const setStart = (value) => change("week", value);
  const days = Array.from({ length: 7 }, (_, i) => plusDays(start, i));
  const filtered = posts.filter(
    (p) =>
      (!channel || p.content.versions.some((v) => v.channel === channel)) &&
      (!status || postStatus(p) === status),
  );
  const scheduled = filtered
    .filter((p) => p.scheduled_at && days.includes(dayKey(p.scheduled_at)))
    .sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at));
  const times = scheduled.map((p) => berlinHour(p.scheduled_at));
  const first = Math.min(8, ...times),
    last = Math.max(20, ...times),
    hours = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const occupiedHours = new Set(times);
  function card(post, list = false) {
    const version =
      post.content.versions.find((v) => v.channel === channel) ||
      post.content.versions[0];
    return (
      <button
        className={`mk-event mk-event-${version.channel} ${list ? "mk-post-row" : ""}`}
        onClick={() => onEdit(structuredClone(post))}
        key={post.id}
      >
        {list && (
          <Thumbnail media={media.find((m) => m.id === version.media_id)} />
        )}
        <ChannelBadge channel={version.channel} />
        <small>
          {post.scheduled_at
            ? formatDate(post.scheduled_at, {
                ...(list
                  ? { day: "numeric", month: "short", year: "numeric" }
                  : {}),
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Ohne Termin"}{" "}
          ·{" "}
          <span className={`mk-post-status mk-post-status-${postStatus(post)}`}>
            {postStatusLabels[postStatus(post)]}
          </span>
        </small>
        <strong>{post.content.topic}</strong>
        {!list && (
          <Thumbnail media={media.find((m) => m.id === version.media_id)} />
        )}
        {list && (
          <span className="mk-post-row-caption">
            {version.text || "Beitragstext noch ergänzen"}
          </span>
        )}
        {post.content.versions.length > 1 && (
          <small>
            + {post.content.versions.length - 1} Plattformversion(en)
          </small>
        )}
      </button>
    );
  }
  return (
    <>
      <div className="mk-toolbar mk-calendar-toolbar">
        <select
          aria-label="Kalenderansicht"
          value={view}
          onChange={(e) => change("view", e.target.value)}
        >
          <option value="week">Woche</option>
          <option value="list">Liste · alle Termine</option>
        </select>
        <div className="mk-period">
          <button
            aria-label="Vorherige Woche"
            onClick={() => setStart(plusDays(start, -7))}
          >
            <Icon name="left" />
          </button>
          <strong>
            {formatDate(`${start}T12:00:00Z`, {
              day: "numeric",
              month: "short",
            })}{" "}
            –{" "}
            {formatDate(`${days[6]}T12:00:00Z`, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </strong>
          <button
            aria-label="Nächste Woche"
            onClick={() => setStart(plusDays(start, 7))}
          >
            <Icon name="right" />
          </button>
        </div>
        <button onClick={() => setStart(monday())}>Heute</button>
        <button aria-expanded={filters} onClick={() => setFilters(!filters)}>
          <Icon name="filter" />
          Filter
        </button>
      </div>
      {filters && (
        <div className="mk-toolbar mk-filters">
          <select
            aria-label="Kalenderplattform"
            value={channel}
            onChange={(e) => change("channel", e.target.value)}
          >
            <option value="">Alle Plattformen</option>
            <option value="linkedin">LinkedIn</option>
            <option value="instagram">Instagram</option>
            <option value="pinterest">Pinterest</option>
            {posts.some((p) =>
              p.content.versions.some((v) => v.channel === "facebook"),
            ) && <option value="facebook">Facebook (Entwürfe)</option>}
          </select>
          <select
            aria-label="Beitragsstatus"
            value={status}
            onChange={(e) => change("status", e.target.value)}
          >
            <option value="">Alle Status</option>
            {Object.entries(postStatusLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}
      {view === "week" ? (
        <div
          className="mk-calendar-scroll"
          tabIndex={0}
          aria-label="Wochenkalender, Europe/Berlin"
        >
          <div
            className="mk-calendar"
            style={{
              gridTemplateRows: `auto ${hours.map((hour) => (occupiedHours.has(hour) ? "minmax(68px, auto)" : "28px")).join(" ")}`,
            }}
          >
            <div className="mk-day-heading mk-time-heading">Berlin</div>
            {days.map((day) => (
              <div
                className={`mk-day-heading ${day === dayKey(new Date()) ? "mk-today" : ""}`}
                key={day}
              >
                {formatDate(`${day}T12:00:00Z`, {
                  weekday: "short",
                  day: "numeric",
                  month: "numeric",
                })}
              </div>
            ))}
            <div className="mk-hours">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className={occupiedHours.has(hour) ? "" : "mk-empty-hour"}
                >
                  {String(hour).padStart(2, "0")}:00
                </div>
              ))}
            </div>
            {days.map((day) => (
              <div className="mk-day" key={day}>
                {hours.map((hour) => (
                  <div className="mk-hour-cell" key={hour}>
                    {scheduled
                      .filter(
                        (post) =>
                          dayKey(post.scheduled_at) === day &&
                          berlinHour(post.scheduled_at) === hour,
                      )
                      .map((post) => card(post))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mk-post-list" aria-label="Beitragsliste">
          {[...filtered]
            .sort(
              (a, b) =>
                Date.parse(a.scheduled_at || "9999-12-31") -
                Date.parse(b.scheduled_at || "9999-12-31"),
            )
            .map((post) => card(post, true))}
        </div>
      )}
      {view === "week" && !scheduled.length && (
        <p className="mk-muted">In dieser Woche sind keine Beiträge geplant.</p>
      )}
      {view === "week" && filtered.some((p) => !p.scheduled_at) && (
        <>
          <h2 className="mk-section-title">Noch ohne Termin</h2>
          <div className="mk-post-grid">
            {filtered.filter((p) => !p.scheduled_at).map((post) => card(post))}
          </div>
        </>
      )}
      {!posts.length && (
        <Empty action={<button onClick={onNew}>Ersten Beitrag anlegen</button>}>
          Euer Kalender ist bereit. Legt einen Beitrag an oder übernehmt
          Vorschläge aus der Planung.
        </Empty>
      )}
    </>
  );
}
