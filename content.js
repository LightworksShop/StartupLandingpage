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
question: "Ist das eine fertige Standardsoftware?",
answer: "Nein. Es gibt kein starres Produkt, das eingeführt wird. Wir entwickeln eine strukturierte, modulare Lösung auf Basis eurer tatsächlichen Abläufe. Ausgangspunkt sind Prozesse, Verantwortlichkeiten und Ziele – daraus entsteht ein System, das zu eurem Betrieb passt."
},
{
question: "Für welche Unternehmen ist das sinnvoll?",
answer: "Für wachsende Handwerks- und Dienstleistungsbetriebe, bei denen Abläufe unübersichtlich werden oder Einzellösungen nicht mehr ausreichen. Besonders dann, wenn Transparenz, klare Zuständigkeiten und saubere Prozesse wichtig werden."
},
{
question: "Wie läuft ein Projekt konkret ab?",
answer: "Wir starten mit einem klar abgegrenzten Kernbereich, zum Beispiel Projektübersicht oder Aufgabenmanagement. Dieser wird strukturiert umgesetzt und gemeinsam getestet. Danach wird Schritt für Schritt erweitert – technisch sauber und ohne unnötige Komplexität."
},
{
question: "Wie lange dauert die Umsetzung?",
answer: "Ein erster funktionsfähiger Kern kann oft innerhalb weniger Wochen stehen – abhängig vom Umfang. Erweiterungen erfolgen modular. Ziel ist immer, früh nutzbar zu sein und nicht erst nach Monaten live zu gehen."
},
{
question: "Können später weitere Funktionen ergänzt werden?",
answer: "Ja. Die Struktur ist modular aufgebaut. Zusätzliche Module, individuelle Anforderungen oder Schnittstellen können ergänzt werden, ohne das bestehende System neu aufzusetzen."
},
{
question: "Wo liegen die Daten?",
answer: "Die Daten werden DSGVO-konform gespeichert. Hosting, Zugriffsrechte und Sicherheitsstruktur werden transparent abgestimmt. Je nach Anforderung sind verschiedene Hosting-Modelle möglich."
},
{
question: "Was bedeutet KI-unterstützt in eurem Kontext?",
answer: "Wir nutzen moderne Entwicklungswerkzeuge, um schneller zu strukturieren, sauber zu dokumentieren und effizient umzusetzen. Entscheidungen, Architektur und Qualitätskontrolle liegen immer beim Menschen. Es gibt keine unkontrollierten Automatismen."
},
{
question: "Sind wir danach von euch abhängig?",
answer: "Das System ist nachvollziehbar aufgebaut und dokumentiert. Ziel ist Transparenz, nicht Abhängigkeit. Weiterentwicklung kann gemeinsam erfolgen oder strukturiert übergeben werden."
},
{
question: "Was unterscheidet euch von klassischen ERP-Systemen?",
answer: "Klassische ERP-Lösungen sind oft überdimensioniert oder unflexibel für kleinere Betriebe. Wir entwickeln keine Software mit unnötiger Funktionsfülle, sondern eine klare Struktur, die genau die Prozesse abbildet, die wirklich gebraucht werden. Im Mittelpunkt steht nicht ein Produkt, sondern eine tragfähige Struktur für euren Betrieb."
},
{
question: "Mit welchem Investitionsrahmen müssen wir rechnen?",
answer: "Der Umfang hängt stark von den Anforderungen ab. Wir starten mit einem klar definierten Kernbereich, sodass Investition und Nutzen in einem gesunden Verhältnis stehen. Erweiterungen erfolgen modular und transparent kalkuliert."
},
{
question: "Können bestehende Systeme angebunden werden?",
answer: "Ja. Schnittstellen zu bestehenden Lösungen wie Buchhaltung, Zeiterfassung oder branchenspezifischen Tools können berücksichtigt werden. Ziel ist nicht, alles zu ersetzen, sondern sinnvoll zu integrieren."
},
{
question: "Was passiert mit unseren bestehenden Daten?",
answer: "Bestehende Daten können – je nach Struktur und Qualität – übernommen oder strukturiert migriert werden. Wir prüfen gemeinsam, was sinnvoll ist. Ziel ist ein sauberer Übergang ohne unnötige Doppelstrukturen."
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
