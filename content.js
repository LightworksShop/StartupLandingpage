const flowContent = {
  form: {
    smtpRelayUrl: "/api/contact",
    method: "POST",
    recipientEmail: "kontakt@smartwerk-software.de",
    subject: "Pilotbetrieb anfragen",
    useMailtoFallback: true
  },
  trustBullets: [
    "KMU-fokussiert",
    "Individuell",
    "KI-gestützt & geprüft"
  ],
  heroImages: [
    {
      src: "assets/images/hero-smartwerk-1600.jpg",
      fallback: "assets/images/hero-mockup.svg",
      alt: "Laptop mit moderner Softwareoberfläche auf einem Schreibtisch"
    },
    {
      src: "assets/images/hero-smartwerk-2-1600.jpg",
      fallback: "assets/images/hero-mockup.svg",
      alt: "Team arbeitet gemeinsam an digitalen Prozessen in einer modernen Produktionsumgebung"
    },
    {
      src: "assets/images/hero-smartwerk-3-1600.jpg",
      fallback: "assets/images/hero-mockup.svg",
      alt: "Digitale Zusammenarbeit bei der Planung und Steuerung von Betriebsabläufen"
    }
  ],
  sectionImages: {
    problem: {
      src: "assets/images/problem-unsplash-960.jpg",
      fallback: "assets/images/hero-mockup.svg",
      alt: "Kleines Team bei der Abstimmung von Arbeitsprozessen"
    },
    solution: [
      {
        src: "assets/images/Render4.jpg",
        fallback: "assets/images/hero-mockup.svg",
        alt: "Visualisierung strukturierter Daten auf einem Monitor"
      },
      {
        src: "assets/images/solution-unsplash-2-920.jpg",
        fallback: "assets/images/hero-mockup.svg",
        alt: "Team bei strukturierter Prozessplanung"
      }
    ]
  },
  painPoints: [
    {
      icon: "sheet",
      title: "Ihr arbeitet in fünf Tools - aber nichts ist wirklich verbunden.",
      text: "Informationen springen zwischen E-Mail, Excel und Messenger. Verantwortung bleibt dabei oft unklar."
    },
    {
      icon: "integration",
      title: "Jeder Auftrag ist ein Sonderfall.",
      text: "Entscheidungen werden ständig neu getroffen. Fällt jemand aus, steht der Prozess still."
    },
    {
      icon: "process",
      title: "Wachstum bringt zusätzliche Reibung.",
      text: "Mehr Aufträge bedeuten mehr Abstimmung, mehr Rückfragen und mehr operative Hektik."
    },
    {
      icon: "erp",
      title: "Das Standard-ERP zwingt euch in fremde Prozesse.",
      text: "Ihr passt euren Betrieb der Software an - statt umgekehrt. Und verliert dabei Effizienz."
    }
  ],
  solutionCards: [
    {
      title: "Ein System. Ein Überblick.",
      text: "Wir bündeln Aufträge, Kommunikation und Daten an einem Ort. Ihr seht jederzeit, wo ihr steht - ohne Tool-Hopping, ohne Sucherei."
    },
    {
      title: "Verlässliche Prozesse statt Dauer-Improvisation.",
      text: "Wir definieren klare Abläufe, Zuständigkeiten und Übergaben. Entscheidungen werden nachvollziehbar - nicht täglich neu erfunden."
    },
    {
      title: "Wachstum mit Kontrolle - nicht mit Hektik.",
      text: "Mehr Aufträge führen nicht zu mehr Chaos. Eure Strukturen skalieren mit. Ihr behaltet Übersicht, Tempo und Qualität."
    },
    {
      title: "Software, die euren Betrieb stärkt - nicht verbiegt.",
      text: "Wir entwickeln Lösungen, die eure Realität abbilden. Keine fremden Prozesse, keine unnötige Komplexität - sondern echte Entlastung im Alltag."
    }
  ],
  targetGroups: [
    {
      title: "Ideal für",
      points: [
        "5–50 Mitarbeitende",
        "Kein eigenes IT-Team",
        "Individuelle, aber strukturierte Prozesse",
        "Wunsch nach Übersicht statt Systemkomplexität"
      ]
    },
    {
      title: "Nicht geeignet für",
      points: [
        "Konzern-ERP-Anforderungen",
        "Standardisierte Großunternehmen",
        "Reine Plug-and-Play-Erwartung ohne Analyse"
      ]
    }
  ],
  processSteps: [
    {
      title: "Verstehen",
      text: "Wir schauen uns euren Betrieb und eure Abläufe an – mit Fokus auf die Punkte, die euch im Alltag bremsen. Gemeinsam klären wir, welche Funktionen die Software konkret abdecken muss, damit Angebote, Aufträge oder Projekte sauber laufen."
    },
    {
      title: "Strukturieren",
      text: "Aus diesen Anforderungen entsteht eine klare Systemstruktur. Wir übertragen eure Abläufe in eine logische, digitale Lösung, die verständlich aufgebaut ist und eure täglichen Aufgaben zuverlässig abbildet."
    },
    {
      title: "Umsetzen",
      text: "Wir richten die Lösung ein und führen sie Schritt für Schritt in euren Arbeitsalltag ein, sodass ihr schnell produktiv damit arbeiten könnt."
    },
    {
      title: "Weiterentwickeln",
      text: "Wenn sich euer Betrieb verändert, wächst die Software mit. Wir übernehmen Anpassungen, Updates und laufende Wartung – damit alles stabil weiterläuft."
    }
  ],
  modules: [
    {
      name: "Projektübersicht",
      description: [
        "Wir gestalten eine zentrale Übersicht, in der alle Projekte zusammenlaufen.",
        "Jeder weiß, was gerade läuft und was als Nächstes ansteht.",
        "Das schafft Ruhe im Alltag."
      ],
      integrations: ["Buchhaltungssysteme", "E-Mail & Kalender", "Online-Shops"]
    },
    {
      name: "Zeiterfassung",
      description: [
        "Zeiten können einfach und direkt Projekten zugeordnet werden – im Büro oder unterwegs.",
        "So entsteht Transparenz, ohne zusätzlichen Verwaltungsaufwand."
      ],
      integrations: ["Lohnabrechnung", "Personalverwaltung", "Stempelsysteme"]
    },
    {
      name: "Projektkalkulation",
      description: [
        "Wir schaffen eine klare Sicht auf Kosten und Erlöse.",
        "Ihr erkennt frühzeitig, ob ein Projekt im Plan liegt – und könnt rechtzeitig reagieren."
      ],
      integrations: ["Buchhaltung", "Warenwirtschaft", "Einkaufssysteme"]
    },
    {
      name: "Material & Lager",
      description: [
        "Materialbewegungen lassen sich nachvollziehbar abbilden.",
        "Bestände bleiben übersichtlich, Engpässe werden rechtzeitig sichtbar."
      ],
      integrations: ["Großhändler", "Warenwirtschaft", "Scanner- & Barcodesysteme"]
    },
    {
      name: "Angebote & Rechnungen",
      description: [
        "Angebote, Projekte und Rechnungen greifen ineinander.",
        "Doppelarbeit wird vermieden, Abläufe werden klarer und einfacher."
      ],
      integrations: ["Buchhaltung", "Zahlungsanbieter", "Online-Banking"]
    },
    {
      name: "Kundenmanagement",
      description: [
        "Alle wichtigen Informationen zu euren Kunden bleiben an einem Ort.",
        "So gehen keine Absprachen oder Dokumente verloren."
      ],
      integrations: ["E-Mail", "Kalender", "Telefonanlagen", "CRM-Systeme"]
    },
    {
      name: "Produktionssteuerung",
      description: [
        "Wir strukturieren Abläufe so, dass jeder weiß, was zu tun ist.",
        "Fortschritte werden sichtbar, Abstimmungen werden einfacher."
      ],
      integrations: ["Maschinensteuerungen", "Sensorik", "QR- & Trackingsysteme"]
    },
    {
      name: "Auswertungen & Dashboard",
      description: [
        "Wichtige Kennzahlen werden übersichtlich dargestellt.",
        "Ihr erhaltet eine klare Grundlage für unternehmerische Entscheidungen – ohne Zahlenchaos."
      ],
      integrations: ["Buchhaltung", "Lohn", "Online-Shops", "Controlling-Tools"]
    }
  ],
  pricing: [
    {
      title: "Schluss mit Zettelwirtschaft und Excel-Chaos",
      price: "Investition: ca. 2.000 – 5.000 €",
      focus:
        "Digitalisierung eines einzelnen, kritischen Arbeitsschritts. Ideal für Betriebe, die einen klaren Flaschenhals beseitigen wollen.",
      benefits: [
        "Zentrale Datenhaltung: Alle Infos an einem Ort, für alle (berechtigten) Mitarbeiter gleichzeitig verfügbar.",
        "Intelligente Erfassung: Schlanke Masken statt überladener Tabellen - Fehlerquellen werden minimiert.",
        "Dashboards und Auswertungen: Grafische Aufbereitung eurer Daten für den sofortigen Überblick ab dem ersten Tag.",
        "Schnelle Einführung: Einsetzbar innerhalb weniger Wochen."
      ],
      examples: [
        "Digitale Bautagebücher inklusive automatischer Wochenübersicht.",
        "Kunden- und Anfragenverwaltung mit Erfolgs-Statistiken.",
        "Geräteverwaltung mit grafischer Anzeige von Wartungsintervallen."
      ]
    },
    {
      title: "Abteilungen vernetzen und Doppelt-Pflege stoppen",
      price: "Investition: ca. 5.000 – 10.000 €",
      focus:
        "Verbindung von 2-3 Arbeitsbereichen. Informationen fließen automatisch von Schritt A zu Schritt B, ohne dass manuell kopiert oder nachgefragt werden muss.",
      featured: true,
      badgeLabel: "häufiger Einstieg",
      benefits: [
        "Automatisierte Logik: Statusänderungen lösen Folgeschritte aus (z. B. automatische Info an die Buchhaltung, sobald die Montage abgeschlossen ist).",
        "Dashboards und Auswertungen: Übergreifende Analysen, die Daten aus verschiedenen Abteilungen intelligent kombinieren.",
        "Schnittstellen zu euren Tools: Anbindung an bestehende Programme (z. B. Kalender, E-Mail oder eure Buchhaltungssoftware).",
      ],
      examples: [
        "Nahtloser Übergang vom Angebot in die Ressourcenplanung mit Kapazitäts-Übersicht.",
        "Automatisierte Status-Updates für Kunden kombiniert mit interner Erfolgsmessung.",
        "Zeiterfassung & Nachkalkulation: Arbeitszeiten fließen direkt in das jeweilige Projekt, um die tatsächliche Gewinnspanne zu sehen."
      ]
    },
    {
      title: "Voll vernetzte Prozesse für maximale Übersicht",
      price: "Investition: ab ca. 10.000 €",
      focus:
        "Eine zentrale Plattform als Herzschlag eures Betriebs. Hier werden komplexe Regeln und alle wichtigen Datenströme gebündelt.",
      benefits: [
        "Dashboards und Auswertungen: Hochkomplexe Echtzeit-Steuerung, die live Profitabilität und Prozess-Engpässe aufzeigt.",
        "Tiefe System-Verknüpfung: Nahtlose Anbindung an bestehende große Systeme (ERP/CRM) oder direkt an eure Maschinen.",
        "Zukunftssicher & Unabhängig: Wir setzen auf bewährte, offene Technologien. Das bedeutet: Keine Abhängigkeit von uns als Anbieter - die Lösung gehört euch."
      ],
      examples: [
        "Vollautomatisierte Produktionssteuerung mit Live-Kennzahlen direkt aus der Werkstatt.",
        "Komplexe Kalkulationstools mit Live-Preisen eurer Lieferanten und Margen-Analyse.",
        "Kundenportale mit Self-Service-Funktionen und Live-Auftragsverfolgung."
      ]
    }
  ],
  pilot: [
    "Vergünstigter Einstieg",
    "Enge Abstimmung",
    "Verbindliches Feedback",
    "Perspektive auf reguläre Preisstruktur"
  ],
  faq: [

{

question: "Ist unsere Lösung eine fertige Standardsoftware?",

answer: "Nein. Es gibt kein starres Produkt, das einfach eingeführt wird. Wir entwickeln eine strukturierte, modulare Lösung auf Basis eurer tatsächlichen Abläufe. Ausgangspunkt sind Prozesse, Verantwortlichkeiten und Ziele – daraus entsteht ein System, das zu eurem Betrieb passt."

},

{

question: "Für welche Unternehmen ist das sinnvoll?",

answer: "Vor allem für wachsende Handwerks- und Dienstleistungsbetriebe, bei denen Abläufe mit der Zeit unübersichtlich geworden sind oder einzelne Tools nicht mehr sauber zusammenarbeiten. Besonders dann, wenn Transparenz, klare Zuständigkeiten und strukturierte Prozesse wichtig werden."

},

{

question: "Wie läuft ein Projekt konkret ab?",

answer: "Der Ablauf hängt vom jeweiligen Projekt ab. In vielen Fällen starten wir mit einem klar abgegrenzten Kernbereich, zum Beispiel Projektübersicht oder Aufgabenmanagement, der strukturiert umgesetzt und im Alltag getestet wird. Wenn es sinnvoll ist, können aber auch von Beginn an mehrere Module oder ein größerer Funktionsumfang gemeinsam geplant und umgesetzt werden. Ziel ist immer eine saubere, nachvollziehbare Struktur ohne unnötige Komplexität."

},

{

question: "Wie lange dauert die Umsetzung?",

answer: "Ein erster funktionsfähiger Kern kann oft innerhalb weniger Wochen entstehen – abhängig vom Umfang. Erweiterungen erfolgen modular. Ziel ist immer, früh einen echten Nutzen im Alltag zu schaffen, statt erst nach Monaten ein System produktiv einsetzen zu können."

},

{

question: "Können später weitere Funktionen ergänzt werden?",

answer: "Ja. Die Struktur ist modular aufgebaut. Zusätzliche Module, individuelle Anforderungen oder Schnittstellen können jederzeit ergänzt werden, ohne das bestehende System neu aufbauen zu müssen."

},

{

question: "Wo werden unsere Daten gespeichert und wie sind sie geschützt?",

answer: [

"Die Daten werden DSGVO-konform in einer abgestimmten Hosting-Umgebung verarbeitet. Je nach Anforderungen sind unterschiedliche Hosting-Modelle möglich.",

"Zugriffe werden über ein klares Rollen- und Rechtekonzept gesteuert, sodass nur berechtigte Personen auf relevante Bereiche zugreifen können.",

"Sicherheitsmaßnahmen wie Backup-Strategie, Wiederherstellbarkeit und nachvollziehbare Änderungen werden von Beginn an berücksichtigt."

]

},

{

question: "Wie setzen wir KI ein – und wie stellen wir Qualität und Sicherheit sicher?",

answer: "KI‑gestützte Werkzeuge helfen uns dabei, Entwicklungsprozesse zu beschleunigen, Strukturen schneller aufzubauen und sauber zu dokumentieren. Architekturentscheidungen, sicherheitsrelevante Aspekte und Qualitätskontrolle liegen jedoch immer beim Menschen. Code wird strukturiert überprüft, Änderungen werden nachvollziehbar dokumentiert und sicherheitsrelevante Punkte wie Code‑Reviews, klare Systemarchitektur und kontrollierte Updates werden bewusst berücksichtigt. KI ist dabei ein Werkzeug zur Effizienzsteigerung – nicht ein unkontrollierter Automatismus."

},

{

question: "Sind wir danach von euch abhängig?",

answer: "Das System wird nachvollziehbar aufgebaut und dokumentiert. Ziel ist Transparenz, nicht Abhängigkeit. Der entwickelte Code und die Systemstruktur sind klar dokumentiert, sodass Weiterentwicklung entweder gemeinsam mit uns oder – wenn gewünscht – auch durch andere Entwickler möglich ist. Nutzungsrechte und Übergaberegelungen werden im Projekt klar definiert, damit ihr langfristig die Kontrolle über eure Lösung behaltet."

},

{

question: "Was unterscheidet uns von klassischen ERP-Systemen?",

answer: "Klassische ERP-Lösungen sind oft überdimensioniert oder unflexibel für kleinere Betriebe. Wir entwickeln keine Software mit unnötiger Funktionsfülle, sondern eine klare Struktur, die genau die Prozesse abbildet, die wirklich gebraucht werden. Im Mittelpunkt steht nicht ein Produkt, sondern eine tragfähige Systemstruktur für euren Betrieb."

},

{

question: "Mit welchem Investitionsrahmen müssen wir rechnen?",

answer: "Der konkrete Aufwand hängt stark von den Anforderungen ab. Durch KI‑gestützte Entwicklung können viele Schritte schneller umgesetzt werden als bei klassischen Softwareagenturen. Dadurch entstehen individuelle Lösungen oft deutlich effizienter. Wir starten bewusst mit einem klar definierten Kernbereich, sodass Investition und Nutzen in einem gesunden Verhältnis stehen. Erweiterungen erfolgen modular und transparent kalkuliert."

},

{

question: "Können bestehende Systeme angebunden werden?",

answer: "Ja. Schnittstellen zu bestehenden Lösungen wie Buchhaltung, Zeiterfassung oder branchenspezifischen Tools können berücksichtigt werden. Ziel ist nicht, alles zu ersetzen, sondern bestehende Systeme sinnvoll zu integrieren."

},

{

question: "Was passiert mit unseren bestehenden Daten?",

answer: "Bestehende Daten können – je nach Struktur und Qualität – übernommen oder strukturiert migriert werden. Gemeinsam prüfen wir, welcher Weg sinnvoll ist. Ziel ist ein sauberer Übergang ohne doppelte Datenstrukturen."

}

]

,
  team: [
    {
      name: "Benjamin Nöst",
      title: "",
      role: "Strategie & Konzeption",
      image: "assets/images/team-benjamin-512.jpg",
      fallback: "assets/images/team-benjamin.svg",
      alt: "Portraitbild als Platzhalter für Benjamin Nöst"
    },
    {
      name: "Yannis Vogel",
      title: "",
      role: "Architektur & Systemsicherheit",
      image: "assets/images/team-yannis-512.jpg",
      fallback: "assets/images/team-yannis.svg",
      alt: "Portraitbild als Platzhalter für Yannis Vogel"
    }
  ]
};
