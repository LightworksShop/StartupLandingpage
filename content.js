const flowContent = {
  form: {
    smtpRelayUrl: "/api/contact",
    method: "POST",
    recipientEmail: "kontakt@flow-software.de",
    subject: "Pilotbetrieb anfragen",
    useMailtoFallback: true
  },
  trustBullets: [
    "KMU-fokussiert",
    "Individuell",
    "KI-gestützt & geprüft"
  ],
  heroImage: {
    src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1440&q=78",
    fallback: "assets/images/hero-mockup.svg",
    alt: "Laptop mit moderner Softwareoberfläche auf einem Schreibtisch"
  },
  sectionImages: {
    problem: {
      src: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=960&q=78",
      fallback: "assets/images/hero-mockup.svg",
      alt: "Kleines Team bei der Abstimmung von Arbeitsprozessen"
    },
    solution: [
      {
        src: "https://images.unsplash.com/photo-1551281044-8b26d3b4f4d0?auto=format&fit=crop&w=920&q=78",
        fallback: "assets/images/hero-mockup.svg",
        alt: "Visualisierung strukturierter Daten auf einem Monitor"
      },
      {
        src: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=920&q=78",
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
      title: "Das Standard-ERP zwingt dich in fremde Prozesse.",
      text: "Du passt deinen Betrieb der Software an - statt umgekehrt. Und verlierst dabei Effizienz."
    }
  ],
  solutionCards: [
    {
      title: "Ein System. Ein Überblick.",
      text: "Wir bündeln Aufträge, Kommunikation und Daten an einem Ort. Du siehst jederzeit, wo ihr steht - ohne Tool-Hopping, ohne Sucherei."
    },
    {
      title: "Verlässliche Prozesse statt Dauer-Improvisation.",
      text: "Wir definieren klare Abläufe, Zuständigkeiten und Übergaben. Entscheidungen werden nachvollziehbar - nicht täglich neu erfunden."
    },
    {
      title: "Wachstum mit Kontrolle - nicht mit Hektik.",
      text: "Mehr Aufträge führen nicht zu mehr Chaos. Deine Strukturen skalieren mit. Du behältst Übersicht, Tempo und Qualität."
    },
    {
      title: "Software, die deinen Betrieb stärkt - nicht verbiegt.",
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
      integrations: ["DATEV", "Shopify", "Outlook", "Google Kalender"],
      mockup: {
        eyebrow: "Projektstatus",
        title: "Alle Projekte auf einen Blick",
        stats: [
          { label: "Aktiv", value: "18" },
          { label: "Heute fällig", value: "4" },
          { label: "Offene Aufgaben", value: "27" }
        ],
        rows: [
          { title: "Innenausbau Weber", meta: "Angebot bestätigt", status: "In Arbeit" },
          { title: "Montage Schmitt", meta: "Team Nord · 14:00", status: "Nächster Schritt" },
          { title: "Umbau Keller", meta: "Material bestellt", status: "Im Plan" }
        ]
      }
    },
    {
      name: "Zeiterfassung",
      description: [
        "Zeiten können einfach und direkt Projekten zugeordnet werden – im Büro oder unterwegs.",
        "So entsteht Transparenz, ohne zusätzlichen Verwaltungsaufwand."
      ],
      integrations: ["DATEV Lohn", "Personio"],
      mockup: {
        eyebrow: "Zeit & Team",
        title: "Zeiten direkt im Projekt",
        stats: [
          { label: "Heute gebucht", value: "63 h" },
          { label: "Teams aktiv", value: "6" },
          { label: "Offene Einträge", value: "2" }
        ],
        rows: [
          { title: "Projekt Adler", meta: "Y. Vogel · 07:30–11:45", status: "Gebucht" },
          { title: "Serviceeinsatz Süd", meta: "M. Becker · mobil", status: "Unterwegs" },
          { title: "Werkstatt intern", meta: "Team 2 · Nachtrag", status: "Prüfen" }
        ]
      }
    },
    {
      name: "Projektkalkulation",
      description: [
        "Wir schaffen eine klare Sicht auf Kosten und Erlöse.",
        "Sie erkennen frühzeitig, ob ein Projekt im Plan liegt – und können rechtzeitig reagieren."
      ],
      integrations: ["DATEV", "Lexoffice", "Warenwirtschaftssysteme"],
      mockup: {
        eyebrow: "Deckungsbeitrag",
        title: "Kosten und Erlöse im Blick",
        stats: [
          { label: "Soll-Marge", value: "24 %" },
          { label: "Ist-Marge", value: "21 %" },
          { label: "Warnungen", value: "3" }
        ],
        rows: [
          { title: "Projekt Adler", meta: "Material +8 %", status: "Achtung" },
          { title: "Innenausbau Weber", meta: "Im Korridor", status: "Stabil" },
          { title: "Montage Schmitt", meta: "Zusatzleistung offen", status: "Prüfen" }
        ]
      }
    },
    {
      name: "Material & Lager",
      description: [
        "Materialbewegungen lassen sich nachvollziehbar abbilden.",
        "Bestände bleiben übersichtlich, Engpässe werden rechtzeitig sichtbar."
      ],
      integrations: ["Großhändler-Schnittstellen", "Shopify", "Barcode-Systeme"],
      mockup: {
        eyebrow: "Bestände",
        title: "Materialflüsse transparent halten",
        stats: [
          { label: "Artikel aktiv", value: "412" },
          { label: "Unter Mindestbestand", value: "11" },
          { label: "Bestellungen offen", value: "7" }
        ],
        rows: [
          { title: "Montageschienen", meta: "Lager A · 18 Stk", status: "Nachbestellen" },
          { title: "Kabelsatz 4m", meta: "Lager B · 62 Stk", status: "Verfügbar" },
          { title: "Ventileinheit X2", meta: "Lieferung morgen", status: "Unterwegs" }
        ]
      }
    },
    {
      name: "Angebote & Rechnungen",
      description: [
        "Angebote, Projekte und Rechnungen greifen ineinander.",
        "Doppelarbeit wird vermieden, Abläufe werden klarer und einfacher."
      ],
      integrations: ["DATEV", "SevDesk", "Stripe", "PayPal"],
      mockup: {
        eyebrow: "Dokumente",
        title: "Von Angebot bis Rechnung",
        stats: [
          { label: "Angebote offen", value: "9" },
          { label: "Rechnungen heute", value: "5" },
          { label: "Zahlstatus prüfen", value: "3" }
        ],
        rows: [
          { title: "Angebot #2481", meta: "Projekt Adler", status: "Freigabe" },
          { title: "Rechnung #1042", meta: "Innenausbau Weber", status: "Versendet" },
          { title: "Abschlag #771", meta: "Montage Schmitt", status: "Offen" }
        ]
      }
    },
    {
      name: "Kundenmanagement",
      description: [
        "Alle wichtigen Informationen zu Ihren Kunden bleiben an einem Ort.",
        "So gehen keine Absprachen oder Dokumente verloren."
      ],
      integrations: ["IMAP", "Outlook", "Google Workspace", "Telefonanlagen"],
      mockup: {
        eyebrow: "Kundenakte",
        title: "Kontakte, Notizen, Historie",
        stats: [
          { label: "Kontakte", value: "286" },
          { label: "Offene Rückrufe", value: "6" },
          { label: "Neue Mails", value: "14" }
        ],
        rows: [
          { title: "Schmitt GmbH", meta: "Letzte Mail heute 09:12", status: "Aktiv" },
          { title: "Weber Bau", meta: "Telefonnotiz offen", status: "Rückruf" },
          { title: "Keller Technik", meta: "Dokumente vollständig", status: "Dokumentiert" }
        ]
      }
    },
    {
      name: "Produktionssteuerung",
      description: [
        "Wir strukturieren Abläufe so, dass jeder weiß, was zu tun ist.",
        "Fortschritte werden sichtbar, Abstimmungen werden einfacher."
      ],
      integrations: ["Maschinen-Schnittstellen", "IoT-Sensoren", "QR-Code-Systeme"],
      mockup: {
        eyebrow: "Fertigung",
        title: "Abläufe sauber takten",
        stats: [
          { label: "Stationen aktiv", value: "8" },
          { label: "Heute geplant", value: "34" },
          { label: "Blocker", value: "1" }
        ],
        rows: [
          { title: "Linie 2", meta: "Auftrag 581 · 67 %", status: "Läuft" },
          { title: "Vorbereitung", meta: "Material fehlt", status: "Blockiert" },
          { title: "Endkontrolle", meta: "6 Positionen offen", status: "Nächster Schritt" }
        ]
      }
    },
    {
      name: "Auswertungen & Dashboard",
      description: [
        "Wichtige Kennzahlen werden übersichtlich dargestellt.",
        "Sie erhalten eine klare Grundlage für unternehmerische Entscheidungen – ohne Zahlenchaos."
      ],
      integrations: ["Buchhaltung", "Lohn", "Shop-Systeme"],
      mockup: {
        eyebrow: "Kennzahlen",
        title: "Entscheidungen auf Basis klarer Daten",
        stats: [
          { label: "Umsatz Monat", value: "128 T€" },
          { label: "Auslastung", value: "83 %" },
          { label: "Marge", value: "19 %" }
        ],
        rows: [
          { title: "Leistung nach Team", meta: "Nord +12 %", status: "Trend +" },
          { title: "Offene Posten", meta: "7 Positionen", status: "Beobachten" },
          { title: "Auftragslage", meta: "5 Wochen gesichert", status: "Stabil" }
        ]
      }
    }
  ],
  pricing: [
    {
      title: "Basis",
      price: "995 € (einmalig)",
      summary: "Für einen klar abgegrenzten Kernprozess ohne Schnittstellen.",
      points: [
        "Einrichtung des Core-Systems",
        "Benutzer- und Rechteverwaltung",
        "Modul-Grundstruktur",
        "Technische Grundkonfiguration",
        "Abbildung genau eines klar definierten Kernprozesses",
        "Keine Schnittstellen-Integration",
        "Keine komplexen Sonderlogiken"
      ]
    },
    {
      title: "Individual",
      price: "1.995 € (einmalig)",
      summary: "Für kleinere Betriebe mit klar abgegrenztem Bedarf.",
      featured: true,
      points: [
        "Einrichtung auf Basis des Core-Systems",
        "Konfiguration definierter Standardmodule",
        "Abbildung eines klar umrissenen Kernprozesses",
        "1 Feedback-Iteration"
      ]
    },
    {
      title: "Individual Plus",
      price: "2.995 € (einmalig)",
      summary: "Für wachsende Betriebe mit mehreren Sonderprozessen.",
      points: [
        "Erweiterte Prozessabbildung",
        "Zusätzliche Module oder komplexere Logiken",
        "1–2 Schnittstellen zu bestehenden Systemen",
        "2 Feedback-Iterationen"
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
      question: "Ist Flow eine Standardsoftware oder individuell für mein Unternehmen?",
      answer: [
        "Flow wird für jedes Unternehmen gezielt auf den tatsächlichen Bedarf abgestimmt.",
        "Ausgangspunkt sind eure konkreten Abläufe, Ziele und Strukturen. Daraus entsteht ein System, das eure Prozesse klar, logisch und effizient abbildet.",
        "Ihr bekommt keine starre Standardlösung, sondern eine passgenaue, strukturierte Softwarebasis für euer Wachstum."
      ]
    },
    {
      question: "Wie lange dauert die Umsetzung?",
      answer: [
        "Das hängt vom Umfang ab.",
        "Ein klar abgegrenzter Kernprozess kann oft innerhalb weniger Tage umgesetzt werden. Komplexere Strukturen oder Schnittstellen benötigen entsprechend mehr Abstimmung.",
        "Wichtig: Wir starten pragmatisch und bauen Schritt für Schritt auf."
      ]
    },
    {
      question: "Was passiert, wenn wir später weitere Funktionen benötigen?",
      answer: [
        "Flow ist bewusst modular aufgebaut.",
        "Neue Prozesse, zusätzliche Funktionen oder Schnittstellen können jederzeit ergänzt werden, ohne das bestehende System zu destabilisieren.",
        "Ihr startet schlank und erweitert bei Bedarf."
      ]
    },
    {
      question: "Wo werden unsere Daten gespeichert?",
      answer: [
        "Die Daten werden DSGVO-konform gespeichert.",
        "Hosting und technische Infrastruktur werden transparent abgestimmt. Auf Wunsch ist auch eine getrennte oder individuelle Hosting-Lösung möglich.",
        "Datensicherheit und Zugriffskontrolle sind fester Bestandteil des Systems."
      ]
    },
    {
      question: "Was bedeutet \"KI-gestützt\" konkret?",
      answer: [
        "Wir nutzen KI als professionelles Entwicklungswerkzeug, um schneller und effizienter zu arbeiten.",
        "Das bedeutet für euch: kürzere Entwicklungszeiten, geringere Kosten und saubere Dokumentation.",
        "Alle Ergebnisse werden sorgfältig geprüft, bevor sie eingesetzt werden.",
        "Es gibt keine automatischen Änderungen ohne menschliche Kontrolle. Jede Anpassung wird bewusst entschieden und verantwortet.",
        "Verlässlichkeit und Sicherheit stehen für uns immer vor Geschwindigkeit."
      ]
    },
    {
      question: "Wodurch unterscheidet sich Flow von klassischen ERP-Systemen oder einer Agentur?",
      answer: [
        "Klassische ERP-Systeme bringen viele vorgefertigte Prozesse mit, oft mehr, als kleinere Betriebe benötigen.",
        "Agenturprojekte sind häufig individuell, aber teuer und schwer skalierbar.",
        "Flow verbindet beides: ein stabiles Grundsystem mit klarer Struktur, kombiniert mit gezielter, wirtschaftlicher Individualisierung."
      ]
    }
  ],
  team: [
    {
      name: "Benjamin Nöst",
      role: "Beratung & Konzeption",
      image: "assets/images/team-benjamin-512.jpg",
      fallback: "assets/images/team-benjamin.svg",
      alt: "Portraitbild als Platzhalter für Benjamin Nöst"
    },
    {
      name: "Yannis Vogel",
      role: "Softwareentwicklung & Implementierung",
      image: "assets/images/team-yannis-512.jpg",
      fallback: "assets/images/team-yannis.svg",
      alt: "Portraitbild als Platzhalter für Yannis Vogel"
    }
  ]
};
