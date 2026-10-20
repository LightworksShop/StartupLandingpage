import { brandColors } from "../../../lib/marketing/design-model";
export const newId = () =>
  `design_${Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;

export function Range({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  disabled = false,
}) {
  return (
    <label>
      {label}
      <span className="mk-range-value">{Number(value.toFixed(2))}</span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function Palette({ label, value, onChange, disabled }) {
  return (
    <label>
      {label}
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {!brandColors.includes(value) && (
          <option value={value}>Bestehende Farbe · {value}</option>
        )}
        {brandColors.map((color) => (
          <option key={color} value={color}>
            {color}
          </option>
        ))}
      </select>
    </label>
  );
}

export const toolTabs = [
  ["object", "Element"],
  ["product", "Produkt"],
  ["background", "Hintergrund"],
  ["text", "Text"],
  ["overlay", "Logo"],
  ["animation", "Animation"],
  ["output", "Export"],
  ["calendar", "Kalender"],
];

export function PanelTabs({ group, label, tabs, active, onChange }) {
  return (
    <div role="tablist" aria-label={label} className="mk-panel-tabs">
      {tabs.map(([id, name], index) => (
        <button
          key={id}
          role="tab"
          id={`${group}-${id}-tab`}
          aria-selected={active === id}
          aria-controls={`${group}-${id}-panel`}
          tabIndex={active === id ? 0 : -1}
          onClick={() => onChange(id)}
          onKeyDown={(e) => {
            let next;
            if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
            if (e.key === "ArrowLeft")
              next = (index - 1 + tabs.length) % tabs.length;
            if (e.key === "Home") next = 0;
            if (e.key === "End") next = tabs.length - 1;
            if (next !== undefined) {
              e.preventDefault();
              onChange(tabs[next][0]);
              e.currentTarget.parentElement.children[next].focus();
            }
          }}
        >
          {name}
        </button>
      ))}
    </div>
  );
}

export function Panel({ group, id, active, children }) {
  return (
    <section
      className="mk-panel-scroll"
      role="tabpanel"
      id={`${group}-${id}-panel`}
      aria-labelledby={`${group}-${id}-tab`}
      hidden={!active}
      tabIndex={0}
    >
      {children}
    </section>
  );
}
