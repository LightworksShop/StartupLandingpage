import { request } from "./data";
import Planning from "./planning";
import "./styles.css";
import { channels, labels } from "./workspace-model";

export default function PlanningSettings({ planning, setPlanning, run, data }) {
  return (
    <Planning>
      <section className="mk-panel">
        <h2>Planungsvorgaben</h2>
        <p>
          Wochenplätze verwenden Europe/Berlin. Der Agent bereitet Beiträge
          anhand dieser Vorgaben als Entwürfe vor.
        </p>
        <label>
          Wiederholungsabstand je Produkt (Tage)
          <input
            type="number"
            min="0"
            max="365"
            value={planning.repeat_days}
            onChange={(e) =>
              setPlanning({
                ...planning,
                repeat_days: Number(e.target.value),
              })
            }
          />
        </label>
        <div className="mk-weekly-settings">
          <h3>Wochenplätze</h3>
          {planning.slots.map((slot, i) => (
            <div className="mk-toolbar" key={i}>
              <select
                aria-label="Wochentag"
                value={slot.day}
                onChange={(e) =>
                  setPlanning({
                    ...planning,
                    slots: planning.slots.map((s, n) =>
                      n === i ? { ...s, day: Number(e.target.value) } : s,
                    ),
                  })
                }
              >
                {[
                  "Montag",
                  "Dienstag",
                  "Mittwoch",
                  "Donnerstag",
                  "Freitag",
                  "Samstag",
                  "Sonntag",
                ].map((d, n) => (
                  <option value={n + 1} key={d}>
                    {d}
                  </option>
                ))}
              </select>
              <input
                aria-label="Uhrzeit"
                type="time"
                value={slot.time}
                onChange={(e) =>
                  setPlanning({
                    ...planning,
                    slots: planning.slots.map((s, n) =>
                      n === i ? { ...s, time: e.target.value } : s,
                    ),
                  })
                }
              />
              <select
                aria-label="Plattform"
                value={slot.channel}
                onChange={(e) =>
                  setPlanning({
                    ...planning,
                    slots: planning.slots.map((s, n) =>
                      n === i ? { ...s, channel: e.target.value } : s,
                    ),
                  })
                }
              >
                {channels
                  .filter((c) => c !== "facebook" || slot.channel === c)
                  .map((c) => (
                    <option key={c} value={c}>
                      {labels[c]}
                    </option>
                  ))}
              </select>
              <input
                aria-label="Thema des Wochenplatzes"
                value={slot.topic}
                onChange={(e) =>
                  setPlanning({
                    ...planning,
                    slots: planning.slots.map((s, n) =>
                      n === i ? { ...s, topic: e.target.value } : s,
                    ),
                  })
                }
              />
              <button
                onClick={() =>
                  setPlanning({
                    ...planning,
                    slots: planning.slots.filter((_, n) => n !== i),
                  })
                }
              >
                Entfernen
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              setPlanning({
                ...planning,
                slots: [
                  ...planning.slots,
                  {
                    day: 1,
                    time: "18:00",
                    channel: "linkedin",
                    topic: "Aus der Werkstatt",
                  },
                ],
              })
            }
          >
            Wochenplatz hinzufügen
          </button>
        </div>
        <div className="mk-season-settings">
          <h3>Saisonale Themen</h3>
          {planning.seasons.map((season, i) => (
            <div className="mk-toolbar" key={i}>
              {["name", "from", "to"].map((key) => (
                <label key={key}>
                  {{ name: "Saison", from: "Von", to: "Bis" }[key]}
                  <input
                    type={key === "name" ? "text" : "date"}
                    value={season[key]}
                    onChange={(e) =>
                      setPlanning({
                        ...planning,
                        seasons: planning.seasons.map((s, n) =>
                          n === i ? { ...s, [key]: e.target.value } : s,
                        ),
                      })
                    }
                  />
                </label>
              ))}
              <button
                onClick={() =>
                  setPlanning({
                    ...planning,
                    seasons: planning.seasons.filter((_, n) => n !== i),
                  })
                }
              >
                Entfernen
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              setPlanning({
                ...planning,
                seasons: [...planning.seasons, { name: "", from: "", to: "" }],
              })
            }
          >
            Saison hinzufügen
          </button>
        </div>
        <div className="mk-toolbar">
          <button
            onClick={() =>
              run(() =>
                request("settings", {
                  revision: data.settings.revision,
                  value: planning,
                }),
              )
            }
          >
            Vorgaben speichern
          </button>
        </div>
      </section>
    </Planning>
  );
}
