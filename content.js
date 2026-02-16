const flowContent = {
  form: {
    smtpRelayUrl: "http://localhost:3000/api/contact",
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
    "Excel-Listen wachsen unkontrolliert",
    "Mehrere Tools ohne saubere Verbindung",
    "Individuelle Abläufe passen in kein Standardsystem",
    "ERP-Systeme sind zu komplex oder zu teuer",
    "Sonderprozesse werden provisorisch gelöst"
  ],
  solutionCards: [
    {
      title: "Die stabile Basis (Core)",
      points: [
        "Benutzer- und Rechteverwaltung",
        "Modulares System",
        "Strukturierte Datenhaltung",
        "Update- und Erweiterungsfähigkeit",
        "Klare, nachvollziehbare Struktur im Hintergrund"
      ]
    },
    {
      title: "Individuelle Module",
      points: [
        "Abbildung konkreter Betriebsabläufe",
        "Status-Logiken und Abhängigkeiten",
        "Schnittstellen zu bestehenden Systemen",
        "Erweiterbar ohne Systembruch"
      ]
    },
    {
      title: "Schnittstellen-Offenheit",
      points: [
        "Integration mit bestehenden Systemen vorgesehen",
        "Keine Abschottung",
        "Prozessübergreifende Datenflüsse möglich",
        "Technisch sauber dokumentierbar"
      ]
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
  timeline: [
    "Erstgespräch",
    "Konzeption",
    "Entwicklung und Implementierung",
    "Wartung und Pflege"
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
