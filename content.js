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
      title: "Basis",
      price: "ab 995 € (einmalig)",
      summary: "Für einen strukturierten digitalen Start mit klar definiertem Umfang.",
      points: [
        "Technisches Grundsystem mit Nutzerverwaltung",
        "Rollen und Rechte",
        "Individuelle und zentrale Dashboard-Ansichten, abhängig von den gewählten Modulen",
        "Modulbezogene Auswertungen und Übersichten",
        "Implementierung und technische Einrichtung",
        "Einrichtung der Hosting-Umgebung, auf Wunsch auch in eurer bestehenden Infrastruktur",
        "Umsetzung von 1-2 Modulen aus eurem Kernbereich"
      ]
    },
    {
      title: "Individual",
      price: "ab 1.995 € (einmalig)",
      summary: "Für Betriebe, die mehrere Bereiche digital abbilden möchten.",
      featured: true,
      points: [
        "Enthält alles aus Basis",
        "Umsetzung zusätzlicher Module, insgesamt typischerweise 3-6 Module",
        "Erweiterte Prozessabbildung über mehrere Arbeitsbereiche hinweg",
        "Individuell angepasste Masken, Felder und Abläufe",
        "Erweiterte, modulabhängige Auswertungen und Dashboards"
      ]
    },
    {
      title: "Individual Plus",
      price: "ab 2.995 € (einmalig)",
      summary: "Für Betriebe mit individuellen Anforderungen oder mehreren angebundenen Systemen.",
      points: [
        "Enthält alles aus Basis und Individual",
        "Umsetzung weiterer individueller Module über den Standardumfang hinaus",
        "Anbindung externer Systeme, zum Beispiel Buchhaltung, Shop oder Zeiterfassung",
        "Prozessautomatisierungen zwischen Modulen und Systemen",
        "Abbildung komplexer, betriebsindividueller Abläufe"
      ],
      noteLabel: "Hinweis zu allen Paketen:",
      note: "Der konkrete Umfang richtet sich immer nach euren individuellen Anforderungen und der tatsächlichen Komplexität. Der finale Preis wird transparent im Gespräch auf Basis eurer Prozesse definiert."
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
      question: "Ist Flow eine Standardsoftware oder individuell für euer Unternehmen?",
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
