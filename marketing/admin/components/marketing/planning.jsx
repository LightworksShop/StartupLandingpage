import React from "react";
export default function Planning({ children }) {
  return (
    <>
      <p className="mk-info">
        Der Agent bereitet Bilder, Texte und Termine vor und legt vollständige
        Entwürfe im Kalender an. Hier hinterlegt ihr die Vorgaben dafür.
      </p>
      <div className="mk-planning-config">{children}</div>
    </>
  );
}
