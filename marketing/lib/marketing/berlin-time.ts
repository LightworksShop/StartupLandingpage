export function berlinInput(value: string | null) {
  if (!value) return "";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(value))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
export function berlinInstant(value: string) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error("Bitte einen vollständigen Termin eingeben.");
  let instant = new Date(`${value}:00Z`);
  for (let i = 0; i < 3; i++) {
    const shown = berlinInput(instant.toISOString());
    if (shown === value) return instant.toISOString();
    instant = new Date(
      instant.getTime() +
        Date.parse(`${value}:00Z`) -
        Date.parse(`${shown}:00Z`),
    );
  }
  throw new Error(
    "Der Termin liegt in einer Zeitumstellungslücke in Europe/Berlin.",
  );
}
