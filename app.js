function createListItems(items) {
  return items.map((item) => `<li>${item}</li>`).join("");
}

function renderImage({ src, alt, fallback }, className = "", options = {}) {
  const safeClass = className ? ` class="${className}"` : "";
  const fallbackAttr = fallback ? ` data-fallback-src="${fallback}"` : "";
  const loading = options.loading || "lazy";
  const fetchPriority = options.fetchPriority ? ` fetchpriority="${options.fetchPriority}"` : "";
  const decoding = options.decoding || "async";
  return `<img${safeClass} src="${src}" alt="${alt}" loading="${loading}" decoding="${decoding}"${fetchPriority}${fallbackAttr}>`;
}

function setupImageFallbacks() {
  const images = document.querySelectorAll("img[data-fallback-src]");
  if (!images.length) {
    return;
  }

  images.forEach((image) => {
    image.addEventListener("error", () => {
      const fallbackSrc = image.getAttribute("data-fallback-src");
      if (!fallbackSrc || image.dataset.fallbackApplied === "1") {
        return;
      }
      image.dataset.fallbackApplied = "1";
      image.src = fallbackSrc;
    });
  });
}

function trackMatomoEvent(category, action, name) {
  if (!window._paq || typeof window._paq.push !== "function") {
    return;
  }

  window._paq.push(["trackEvent", category, action, name]);
}

function setupMatomoButtonTracking() {
  const trackedSelectors = [
    ".header-cta",
    ".hero-cta-group .btn",
    ".hero-funding-badge-link",
    ".solution-cta",
    "#booking-consent-button",
    "#booking-manage-button",
    ".pilot-contact-item",
    ".desktop-nav a",
    ".mobile-menu nav a",
    ".footer-nav a",
    ".footer-legal a",
    ".footer-logo",
    ".not-found-actions .btn"
  ];

  const trackedElements = document.querySelectorAll(trackedSelectors.join(","));
  if (!trackedElements.length) {
    return;
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "unknown";
  }

  function getCategory(element) {
    if (element.closest(".hero-cta-group")) {
      return "Hero";
    }
    if (element.classList.contains("hero-funding-badge-link")) {
      return "Hero";
    }
    if (element.closest(".solution-cta")) {
      return "Loesung";
    }
    if (element.closest(".desktop-nav")) {
      return "Navigation";
    }
    if (element.closest(".mobile-menu")) {
      return "Mobile Navigation";
    }
    if (element.closest(".footer-nav")) {
      return "Footer Navigation";
    }
    if (element.closest(".footer-legal")) {
      return "Footer Rechtliches";
    }
    if (element.closest(".pilot-contact")) {
      return "Kontakt";
    }
    if (element.id === "booking-consent-button" || element.id === "booking-manage-button") {
      return "Terminbuchung";
    }
    if (element.closest(".not-found-actions")) {
      return "404";
    }
    if (element.classList.contains("header-cta")) {
      return "Header";
    }
    if (element.classList.contains("footer-logo")) {
      return "Footer";
    }
    return "CTA";
  }

  function getEventName(element) {
    const text = element.textContent.replace(/\s+/g, " ").trim();
    const href = element.getAttribute("href") || "";

    if (element.classList.contains("header-cta")) {
      return "header_cta_termin_vereinbaren";
    }
    if (element.classList.contains("hero-funding-badge-link")) {
      return "hero_badge_foerderung";
    }
    if (element.closest(".hero-cta-group")) {
      if (element.classList.contains("btn-primary")) {
        return "hero_cta_termin_vereinbaren";
      }
      if (element.classList.contains("btn-secondary")) {
        return "hero_cta_mehr_erfahren";
      }
    }
    if (element.closest(".solution-cta")) {
      return "loesung_cta_termin_vereinbaren";
    }
    if (element.id === "booking-consent-button") {
      return "terminbuchung_widget_laden";
    }
    if (element.id === "booking-manage-button") {
      return "terminbuchung_einwilligung_zuruecksetzen";
    }
    if (element.closest(".pilot-contact")) {
      if (href.startsWith("tel:")) {
        return "kontakt_telefon";
      }
      if (href.startsWith("mailto:")) {
        return "kontakt_email";
      }
    }
    if (element.closest(".desktop-nav")) {
      return `nav_desktop_${slugify(text || href)}`;
    }
    if (element.closest(".mobile-menu")) {
      return `nav_mobile_${slugify(text || href)}`;
    }
    if (element.closest(".footer-nav")) {
      return `footer_nav_${slugify(text || href)}`;
    }
    if (element.closest(".footer-legal")) {
      return `footer_legal_${slugify(text || href)}`;
    }
    if (element.classList.contains("footer-logo")) {
      return "footer_logo_startseite";
    }
    if (element.closest(".not-found-actions")) {
      return `not_found_${slugify(text || href)}`;
    }

    return `cta_${slugify(text || href || element.getAttribute("aria-label"))}`;
  }

  trackedElements.forEach((element) => {
    element.addEventListener("click", () => {
      trackMatomoEvent(getCategory(element), "click", getEventName(element));
    });
  });
}

function renderContent() {
  const trustBullets = document.getElementById("trust-bullets");
  if (trustBullets) {
    trustBullets.innerHTML = createListItems(flowContent.trustBullets);
  }

  const heroVisual = document.getElementById("hero-visual");
  const heroSliderControls = document.getElementById("hero-slider-controls");
  const heroImages =
    Array.isArray(flowContent.heroImages) && flowContent.heroImages.length
      ? flowContent.heroImages
      : flowContent.heroImage
        ? [flowContent.heroImage]
        : [];

  const heroSlides = heroImages
    .map(
      (image, index) => `
        <div class="hero-slide${index === 0 ? " is-active" : ""}" data-slide-index="${index}" aria-hidden="${index === 0 ? "false" : "true"}">
          ${renderImage(image, "", {
            loading: index === 0 ? "eager" : "lazy",
            fetchPriority: index === 0 ? "high" : undefined,
            decoding: "async"
          })}
        </div>
      `
    )
    .join("");

  const heroDots =
    heroImages.length > 1
      ? `
        <div class="hero-slider-dots" role="tablist" aria-label="Hero Bilder">
          ${heroImages
            .map(
              (_, index) => `
                <button
                  class="hero-slider-dot${index === 0 ? " is-active" : ""}"
                  type="button"
                  role="tab"
                  aria-label="Bild ${index + 1}"
                  aria-selected="${index === 0 ? "true" : "false"}"
                  data-slide-target="${index}"
                ></button>
              `
            )
            .join("")}
        </div>
      `
      : "";

  heroVisual.innerHTML = `
    <div class="hero-slider">
      <div class="hero-slides">
        ${heroSlides}
      </div>
    </div>
    <a class="hero-scroll-hint" href="#problem" aria-label="Weiter nach unten">
      <span class="hero-scroll-hint-arrow" aria-hidden="true"></span>
    </a>
  `;

  if (heroSliderControls) {
    heroSliderControls.innerHTML = heroDots;
  }

  const painGrid = document.getElementById("pain-points");
  painGrid.innerHTML = flowContent.painPoints
    .map(
      (point) => {
        const normalized =
          typeof point === "string"
            ? { icon: "sheet", title: point, text: "" }
            : {
                icon: point?.icon || "sheet",
                title: point?.title || "",
                text: point?.text || ""
              };

        return `
        <article class="pain-card">
          <div class="pain-icon" aria-hidden="true">${getProblemIcon(normalized.icon)}</div>
          <h3>${normalized.title}</h3>
          ${normalized.text ? `<p>${normalized.text}</p>` : ""}
        </article>
      `;
      }
    )
    .join("");

  const solutionCards = document.getElementById("solution-cards");
  solutionCards.innerHTML = flowContent.solutionCards
    .map(
      (card, index) => `
        <article class="solution-card-large">
          <p class="solution-card-index">${String(index + 1).padStart(2, "0")}</p>
          <h3>${card.title}</h3>
          <p>${card.text}</p>
        </article>
      `
    )
    .join("");

  const targetGroups = document.getElementById("target-groups");
  if (targetGroups && Array.isArray(flowContent.targetGroups)) {
    targetGroups.innerHTML = flowContent.targetGroups
      .map(
        (group) => `
          <article class="card">
            <h3>${group.title}</h3>
            <ul>${createListItems(group.points)}</ul>
          </article>
        `
      )
      .join("");
  }

  const moduleGrid = document.getElementById("module-grid");
  if (moduleGrid && Array.isArray(flowContent.modules)) {
    moduleGrid.innerHTML = flowContent.modules
      .map(
        (module, index) => `
          <button
            class="module-card${index === 0 ? " is-active" : ""}"
            type="button"
            role="tab"
            id="module-tab-${index}"
            aria-selected="${index === 0 ? "true" : "false"}"
            aria-controls="module-detail"
            data-module-index="${index}"
          >
            <span class="module-card-icon" aria-hidden="true">${getModuleIcon(index)}</span>
            <h3>${module.name}</h3>
          </button>
        `
      )
      .join("");
  }

  const moduleListGrid = document.getElementById("module-list-grid");
  if (moduleListGrid && Array.isArray(flowContent.modules)) {
    const moduleCards = flowContent.modules
      .map(
        (module, index) => `
          <article class="module-list-card">
            <button
              class="module-list-trigger"
              type="button"
              aria-expanded="false"
              aria-controls="module-list-panel-${index}"
              id="module-list-trigger-${index}"
            >
              <h3>${module.name}</h3>
              <span class="module-list-trigger-icon" aria-hidden="true">+</span>
            </button>
            <div
              class="module-list-panel"
              id="module-list-panel-${index}"
              role="region"
              aria-labelledby="module-list-trigger-${index}"
              hidden
            >
              <div class="module-list-text">
                <p>${module.description.join(" ")}</p>
              </div>
              <p class="module-list-badges-title">Mögliche Anbindungen:</p>
              <div class="module-list-badges">
                ${module.integrations.map((item) => `<span class="module-list-badge">${item}</span>`).join("")}
              </div>
            </div>
          </article>
        `
      )
      ;

    const additionalCard = `
      <article class="module-list-card module-list-card--special">
        <button
          class="module-list-trigger module-list-trigger--special"
          type="button"
          aria-expanded="false"
          aria-controls="module-list-panel-extra"
          id="module-list-trigger-extra"
        >
          <h3>Weitere individuelle Anforderungen</h3>
          <span class="module-list-trigger-icon" aria-hidden="true">+</span>
        </button>
        <div
          class="module-list-panel"
          id="module-list-panel-extra"
          role="region"
          aria-labelledby="module-list-trigger-extra"
          hidden
        >
          <div class="module-list-text">
            <p>Neben den dargestellten Bereichen können zum Beispiel auch folgende Funktionen - sowie passende Schnittstellen zu bestehenden Systemen - individuell umgesetzt werden:</p>
          </div>
          <ul class="module-list-compact-list">
            <li>Automatisierte Workflows und Prozessautomatisierung</li>
            <li>Dokumenten- und Dateiverwaltung</li>
            <li>Qualitätsmanagement und Prüfprotokolle</li>
            <li>Wartungs- und Serviceplanung</li>
            <li>Ressourcen- und Kapazitätsplanung</li>
            <li>Lieferanten- und Einkaufsmanagement</li>
            <li>Termin- und Einsatzplanung</li>
            <li>Mobile Apps für Außendienst oder Werkstatt</li>
            <li>Individuelle Dashboards und Auswertungen</li>
            <li>Schnittstellen zu bestehenden Systemen oder Maschinen</li>
          </ul>
          <div class="module-list-text">
            <p>Welche Funktionen tatsächlich sinnvoll sind, ergibt sich immer aus den konkreten Abläufen im Unternehmen. Ziel ist nicht eine möglichst große Software - sondern eine Lösung, die genau zu eurem Betrieb passt.</p>
          </div>
        </div>
      </article>
    `;

    const securityCard = `
      <article class="module-list-card module-list-card--trust">
        <button
          class="module-list-trigger module-list-trigger--trust"
          type="button"
          aria-expanded="false"
          aria-controls="module-list-panel-trust"
          id="module-list-trigger-trust"
        >
          <h3>Sicherheit &amp; Compliance</h3>
          <span class="module-list-trigger-icon" aria-hidden="true">+</span>
        </button>
        <div
          class="module-list-panel"
          id="module-list-panel-trust"
          role="region"
          aria-labelledby="module-list-trigger-trust"
          hidden
        >
          <div class="module-list-text">
            <p>Sicherheitsrelevante Anforderungen werden von Beginn an strukturiert berücksichtigt – technisch, organisatorisch und dokumentationsseitig.</p>
          </div>
          <ul class="module-list-compact-list">
            <li>Rollen- und Rechtekonzepte mit klaren Zuständigkeiten</li>
            <li>Nachvollziehbare Änderungen mit Änderungs-Historie</li>
            <li>Backup- und Wiederherstellungsstrategie</li>
            <li>Sicherheitsorientierte Entwicklung mit Code-Reviews</li>
            <li>Hosting- und Zugriffsmodell abgestimmt auf eure Anforderungen</li>
            <li>Eure Daten bleiben jederzeit exportierbar</li>
          </ul>
        </div>
      </article>
    `;

    const leftCards = [];
    const rightCards = [];

    moduleCards.forEach((card, index) => {
      const moduleName = flowContent.modules[index]?.name || "";
      const forceLeft = moduleName.toLowerCase() === "zeiterfassung";

      if (forceLeft || index % 2 === 0) {
        leftCards.push(card);
        return;
      }

      rightCards.push(card);
    });

    rightCards.push(securityCard);
    rightCards.push(additionalCard);

    const leftColumn = leftCards.join("");
    const rightColumn = rightCards.join("");

    moduleListGrid.innerHTML = `
      <div class="module-list-column">${leftColumn}</div>
      <div class="module-list-column">${rightColumn}</div>
    `;
  }

  const processSteps = document.getElementById("process-steps");
  if (processSteps && Array.isArray(flowContent.processSteps)) {
    processSteps.innerHTML = flowContent.processSteps
      .map(
        (step, index) => `
          <article class="process-card">
            <p class="process-card-index">${String(index + 1).padStart(2, "0")}</p>
            <h3>${step.title}</h3>
            <p>${step.text}</p>
          </article>
        `
      )
      .join("");
  }

  const processFlow = document.querySelector(".process-flow");
  if (processFlow && Array.isArray(flowContent.processSteps)) {
    processFlow.innerHTML = flowContent.processSteps
      .map((_, index) => `<span class="process-flow-segment" data-step="${index + 1}"></span>`)
      .join("");
  }

  const pricing = document.getElementById("pricing-cards");
  pricing.innerHTML = flowContent.pricing
    .map(
      (plan, index) => `
        <article class="pricing-card${plan.featured ? " featured" : ""}">
          ${plan.featured ? `<span class="badge">${plan.badgeLabel || "häufiger Einstieg"}</span>` : ""}
          <p class="pricing-card-index">${String(index + 1).padStart(2, "0")}</p>
          <h3>„${plan.title}“</h3>
          <p class="price">${plan.price}</p>
          ${plan.focus ? `<p class="pricing-focus"><strong>Fokus:</strong> ${plan.focus}</p>` : ""}
          <div
            class="pricing-panel"
            id="pricing-panel-${index}"
            role="region"
            aria-labelledby="pricing-toggle-${index}"
            hidden
          >
            ${Array.isArray(plan.benefits) && plan.benefits.length ? '<p class="pricing-examples-title">Was ihr bekommt:</p>' : ""}
            ${Array.isArray(plan.benefits) && plan.benefits.length ? `<ul class="pricing-list">${createListItems(plan.benefits)}</ul>` : ""}
            ${Array.isArray(plan.examples) && plan.examples.length ? '<p class="pricing-examples-title">Beispiele:</p>' : ""}
            ${Array.isArray(plan.examples) && plan.examples.length ? `<ul class="pricing-list">${createListItems(plan.examples)}</ul>` : ""}
          </div>
          <button
            class="pricing-toggle"
            type="button"
            aria-expanded="false"
            aria-controls="pricing-panel-${index}"
            id="pricing-toggle-${index}"
          >
            Details anzeigen
          </button>
        </article>
      `
    )
    .join("");

  const pilotPoints = document.getElementById("pilot-points");
  if (pilotPoints && Array.isArray(flowContent.pilot)) {
    pilotPoints.innerHTML = createListItems(flowContent.pilot);
  }

  const faqList = document.getElementById("faq-list");
  if (faqList && Array.isArray(flowContent.faq)) {
    const faqItems = flowContent.faq.map(
      (item, index) => `
          <article class="faq-item">
            <button
              class="faq-question"
              type="button"
              aria-expanded="false"
              aria-controls="faq-answer-${index}"
              id="faq-question-${index}"
            >
              ${item.question}
            </button>
            <div
              class="faq-answer"
              id="faq-answer-${index}"
              role="region"
              aria-labelledby="faq-question-${index}"
              hidden
            >
              ${
                Array.isArray(item.answer)
                  ? item.answer.map((paragraph) => `<p>${paragraph}</p>`).join("")
                  : `<p>${item.answer}</p>`
              }
            </div>
          </article>
        `
    );

    const leftColumn = faqItems.filter((_, index) => index % 2 === 0).join("");
    const rightColumn = faqItems.filter((_, index) => index % 2 === 1).join("");

    faqList.innerHTML = `
      <div class="faq-column">${leftColumn}</div>
      <div class="faq-column">${rightColumn}</div>
    `;
  }

  const faqStructuredData =
    Array.isArray(flowContent.faq) && flowContent.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: flowContent.faq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: Array.isArray(item.answer) ? item.answer.join(" ") : String(item.answer || "")
            }
          }))
        }
      : null;

  const existingFaqJsonLd = document.getElementById("faq-jsonld");
  if (existingFaqJsonLd) {
    existingFaqJsonLd.remove();
  }
  if (faqStructuredData) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "faq-jsonld";
    script.textContent = JSON.stringify(faqStructuredData);
    document.head.appendChild(script);
  }

  const teamCards = document.getElementById("team-cards");
  teamCards.innerHTML = flowContent.team
    .map(
      (person) => `
        <article class="team-card">
          <div class="team-copy">
            <h3>${person.name}</h3>
            <p class="team-title">${person.title ?? ""}</p>
            <p class="team-role">${person.role}</p>
          </div>
          <div class="team-avatar">
            ${renderImage({ src: person.image, alt: person.alt, fallback: person.fallback })}
          </div>
        </article>
      `
    )
    .join("");

  const year = document.getElementById("year");
  if (year) {
    year.textContent = new Date().getFullYear();
  }
}

function setupHeroSlider() {
  const visual = document.getElementById("hero-visual");
  const controls = document.getElementById("hero-slider-controls");
  if (!visual || !controls) {
    return;
  }

  const slides = Array.from(visual.querySelectorAll(".hero-slide"));
  const dots = Array.from(controls.querySelectorAll(".hero-slider-dot"));
  if (slides.length <= 1 || !dots.length) {
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const autoplayMs = 3000;
  let activeIndex = 0;
  let autoplayTimer = null;

  function setActiveSlide(index) {
    activeIndex = index;
    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === index;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", isActive ? "false" : "true");
    });

    dots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === index;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  function stopAutoplay() {
    if (!autoplayTimer) {
      return;
    }
    window.clearInterval(autoplayTimer);
    autoplayTimer = null;
  }

  function startAutoplay() {
    if (prefersReducedMotion || autoplayTimer) {
      return;
    }

    autoplayTimer = window.setInterval(() => {
      if (document.hidden) {
        return;
      }
      const nextIndex = (activeIndex + 1) % slides.length;
      setActiveSlide(nextIndex);
    }, autoplayMs);
  }

  function restartAutoplay() {
    stopAutoplay();
    startAutoplay();
  }

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      setActiveSlide(Number(dot.dataset.slideTarget || 0));
      restartAutoplay();
    });
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopAutoplay();
      return;
    }
    startAutoplay();
  });

  setActiveSlide(0);
  startAutoplay();
}

function renderModuleDetail(module, index = 0) {
  const title = document.getElementById("module-detail-title");
  const text = document.getElementById("module-detail-text");
  const badges = document.getElementById("module-badges");
  const visual = document.getElementById("module-detail-visual");
  const detail = document.getElementById("module-detail");
  if (!title || !text || !badges || !visual || !detail || !module) {
    return;
  }

  title.textContent = module.name;
  text.innerHTML = module.description.map((paragraph) => `<p>${paragraph}</p>`).join("");
  badges.innerHTML = module.integrations.map((item) => `<span class="module-badge">${item}</span>`).join("");
  visual.innerHTML = renderImage(
    module.image || {
      src: "assets/images/business-values-2-1800.jpg",
      fallback: "assets/images/hero-mockup.svg",
      alt: `${module.name} Platzhalterbild`
    },
    "module-detail-image"
  );
  setupImageFallbacks();

  detail.classList.remove("is-transitioning");
  detail.setAttribute("aria-labelledby", `module-tab-${index}`);
  void detail.offsetWidth;
  detail.classList.add("is-transitioning");
}

function getProblemIcon(type) {
  const icons = {
    sheet: `
      <svg viewBox="0 0 24 24" focusable="false">
        <rect x="3.5" y="4.5" width="7" height="7" rx="1.5"></rect>
        <rect x="13.5" y="4.5" width="7" height="7" rx="1.5"></rect>
        <rect x="8.5" y="13.5" width="7" height="7" rx="1.5"></rect>
        <path d="M10.5 8h3M17 11.5v2M9.5 14.5l2.5-2.5"></path>
      </svg>
    `,
    integration: `
      <svg viewBox="0 0 24 24" focusable="false">
        <circle cx="6.5" cy="6.5" r="2.5"></circle>
        <circle cx="17.5" cy="6.5" r="2.5"></circle>
        <circle cx="6.5" cy="17.5" r="2.5"></circle>
        <circle cx="17.5" cy="17.5" r="2.5"></circle>
        <path d="M9 6.5h6M6.5 9v6M15 17.5H9M17.5 15v-2.5"></path>
      </svg>
    `,
    process: `
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M5 7h7"></path>
        <path d="M9.5 3.5L13 7l-3.5 3.5"></path>
        <path d="M19 17h-7"></path>
        <path d="M14.5 13.5L11 17l3.5 3.5"></path>
        <circle cx="7" cy="17" r="2.25"></circle>
      </svg>
    `,
    erp: `
      <svg viewBox="0 0 24 24" focusable="false">
        <rect x="3.5" y="4" width="9" height="6" rx="1.5"></rect>
        <rect x="3.5" y="14" width="9" height="6" rx="1.5"></rect>
        <rect x="15.5" y="4" width="5" height="16" rx="1.5"></rect>
        <path d="M7 7h2M7 17h2M15.5 9h5M15.5 15h5"></path>
      </svg>
    `
  };

  return icons[type] || icons.sheet;
}

function getModuleIcon(index) {
  const icons = [
    `<svg viewBox="0 0 24 24" focusable="false"><path d="M4 6.5h16M4 12h10M4 17.5h7"></path><rect x="14.5" y="10" width="5.5" height="7.5" rx="1.2"></rect></svg>`,
    `<svg viewBox="0 0 24 24" focusable="false"><path d="M7 4.5v15M17 7.5v12M12 10.5v9"></path><path d="M4 19.5h16"></path></svg>`,
    `<svg viewBox="0 0 24 24" focusable="false"><path d="M5 17.5l4-5 3 2.5 5-7"></path><path d="M5 5.5h14v13H5z"></path></svg>`,
    `<svg viewBox="0 0 24 24" focusable="false"><path d="M4.5 7.5h15M7.5 4.5v15"></path><rect x="4.5" y="4.5" width="15" height="15" rx="1.5"></rect></svg>`,
    `<svg viewBox="0 0 24 24" focusable="false"><path d="M6 6.5h12M6 11h12M6 15.5h8"></path><rect x="4.5" y="4.5" width="15" height="15" rx="1.5"></rect></svg>`,
    `<svg viewBox="0 0 24 24" focusable="false"><circle cx="9" cy="9" r="3"></circle><path d="M4.5 18c1.2-2.6 3.1-4 4.5-4s3.3 1.4 4.5 4"></path><path d="M16 8h3.5M16 12h3.5M16 16h2.5"></path></svg>`,
    `<svg viewBox="0 0 24 24" focusable="false"><path d="M5 8h14M5 12h10M5 16h6"></path><path d="M18 15l1.8 1.8L22 14.6"></path></svg>`,
    `<svg viewBox="0 0 24 24" focusable="false"><path d="M5 18V9M10 18V5M15 18v-7M20 18v-4"></path><path d="M3.5 18.5h17"></path></svg>`
  ];

  return icons[index] || icons[0];
}

function setupFaqAccordion() {
  const items = document.querySelectorAll(".faq-item");
  if (!items.length) {
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function openItem(item, trigger, panel) {
    trigger.setAttribute("aria-expanded", "true");
    item.classList.add("is-open");

    if (prefersReducedMotion) {
      panel.hidden = false;
      panel.style.height = "auto";
      panel.style.opacity = "1";
      return;
    }

    panel.hidden = false;
    panel.style.height = "0px";
    panel.style.opacity = "0";

    requestAnimationFrame(() => {
      panel.style.height = `${panel.scrollHeight}px`;
      panel.style.opacity = "1";
    });

    const onEnd = () => {
      panel.style.height = "auto";
      panel.removeEventListener("transitionend", onEnd);
    };
    panel.addEventListener("transitionend", onEnd);
  }

  function closeItem(item, trigger, panel) {
    trigger.setAttribute("aria-expanded", "false");
    item.classList.remove("is-open");

    if (prefersReducedMotion) {
      panel.hidden = true;
      panel.style.height = "0px";
      panel.style.opacity = "0";
      return;
    }

    panel.style.height = `${panel.scrollHeight}px`;
    panel.style.opacity = "1";

    requestAnimationFrame(() => {
      panel.style.height = "0px";
      panel.style.opacity = "0";
    });

    const onEnd = () => {
      panel.hidden = true;
      panel.removeEventListener("transitionend", onEnd);
    };
    panel.addEventListener("transitionend", onEnd);
  }

  items.forEach((item) => {
    const trigger = item.querySelector(".faq-question");
    const panel = item.querySelector(".faq-answer");
    if (!trigger || !panel) {
      return;
    }

    panel.style.height = "0px";
    panel.style.opacity = "0";

    trigger.addEventListener("click", () => {
      const isOpen = item.classList.contains("is-open");
      if (isOpen) {
        closeItem(item, trigger, panel);
      } else {
        items.forEach((otherItem) => {
          if (otherItem === item || !otherItem.classList.contains("is-open")) {
            return;
          }

          const otherTrigger = otherItem.querySelector(".faq-question");
          const otherPanel = otherItem.querySelector(".faq-answer");
          if (!otherTrigger || !otherPanel) {
            return;
          }

          closeItem(otherItem, otherTrigger, otherPanel);
        });
        openItem(item, trigger, panel);
      }
    });
  });
}

function setupSolutionCardScrollEffect() {
  const cards = Array.from(document.querySelectorAll(".solution-card-large"));
  if (!cards.length) {
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    cards.forEach((card) => card.classList.add("is-visible"));
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.2,
      rootMargin: "0px 0px -8% 0px"
    }
  );

  cards.forEach((card) => revealObserver.observe(card));

  const ratios = new Map();
  const activeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
      });

      let activeCard = null;
      let maxRatio = 0;
      ratios.forEach((ratio, card) => {
        if (ratio > maxRatio) {
          maxRatio = ratio;
          activeCard = card;
        }
      });

      cards.forEach((card) => card.classList.toggle("is-active", card === activeCard && maxRatio > 0.35));
    },
    {
      threshold: [0.2, 0.35, 0.5, 0.65, 0.8],
      rootMargin: "-10% 0px -28% 0px"
    }
  );

  cards.forEach((card) => activeObserver.observe(card));
}

function setupPracticeTileReveal() {
  const tiles = Array.from(document.querySelectorAll(".practice-tile"));
  if (!tiles.length) {
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    tiles.forEach((tile) => tile.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, instance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const tile = entry.target;
        const index = tiles.indexOf(tile);
        window.setTimeout(() => {
          tile.classList.add("is-visible");
        }, Math.max(0, index) * 55);
        instance.unobserve(tile);
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -10% 0px"
    }
  );

  tiles.forEach((tile) => observer.observe(tile));
}

function setupProcessFlowProgress() {
  const section = document.getElementById("vorgehen");
  const flow = document.querySelector(".process-flow");
  const grid = document.querySelector(".process-grid");
  const cards = Array.from(document.querySelectorAll(".process-card"));
  const segments = Array.from(document.querySelectorAll(".process-flow-segment"));
  if (!section || !grid || !cards.length) {
    return;
  }

  function applyActiveIndex(activeIndex) {
    cards.forEach((card, index) => {
      const active = index <= activeIndex;
      card.classList.toggle("is-active", active);
      segments[index]?.classList.toggle("is-active", active);
    });
  }

  if (window.matchMedia("(max-width: 1080px)").matches) {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      cards.forEach((card, index) => card.classList.toggle("is-active", index === 0));
      return;
    }

    let ticking = false;

    function getGridColumnCount() {
      const template = window.getComputedStyle(grid).gridTemplateColumns;
      if (!template || template === "none") {
        return 1;
      }
      return template.split(" ").filter((part) => part && part !== "0px").length || 1;
    }

    function applySingleActive(activeCard) {
      cards.forEach((card) => card.classList.toggle("is-active", card === activeCard));
    }

    function updateMobileActiveCard() {
      ticking = false;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const focusY = viewportHeight * 0.42;
      const columnCount = getGridColumnCount();

      if (columnCount > 1) {
        const rect = section.getBoundingClientRect();
        const start = viewportHeight * 0.74;
        const end = -Math.max(rect.height * 0.25, viewportHeight * 0.2);
        const total = start - end;
        const rawProgress = total <= 0 ? 0 : (start - rect.top) / total;
        const clampedProgress = Math.max(0, Math.min(0.999, rawProgress));
        const activeIndex = Math.min(cards.length - 1, Math.floor(clampedProgress * cards.length));

        applyActiveIndex(activeIndex);
        return;
      }

      let visibleBest = null;
      let visibleBestDistance = Number.POSITIVE_INFINITY;
      let fallbackBest = null;
      let fallbackBestDistance = Number.POSITIVE_INFINITY;

      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        const distance = Math.abs(centerY - focusY);
        const visible = rect.bottom > viewportHeight * 0.12 && rect.top < viewportHeight * 0.88;

        if (visible && distance < visibleBestDistance) {
          visibleBestDistance = distance;
          visibleBest = card;
        }

        if (distance < fallbackBestDistance) {
          fallbackBestDistance = distance;
          fallbackBest = card;
        }
      });

      applySingleActive(visibleBest || fallbackBest || cards[0]);
    }

    function requestMobileUpdate() {
      if (ticking) {
        return;
      }
      ticking = true;
      window.requestAnimationFrame(updateMobileActiveCard);
    }

    window.addEventListener("scroll", requestMobileUpdate, { passive: true });
    window.addEventListener("resize", requestMobileUpdate);
    requestMobileUpdate();
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    applyActiveIndex(0);
    return;
  }

  let ticking = false;

  function updateProgress() {
    ticking = false;

    const rect = section.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const start = viewportHeight * 0.78;
    const end = -Math.max(rect.height * 0.35, viewportHeight * 0.18);
    const total = start - end;
    const rawProgress = total <= 0 ? 0 : (start - rect.top) / total;
    const clampedProgress = Math.max(0, Math.min(0.999, rawProgress));
    const activeIndex = Math.min(cards.length - 1, Math.floor(clampedProgress * cards.length));

    applyActiveIndex(activeIndex);
  }

  function requestUpdate() {
    if (ticking) {
      return;
    }
    ticking = true;
    window.requestAnimationFrame(updateProgress);
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  requestUpdate();
}

function setupModuleShowcase() {
  const buttons = Array.from(document.querySelectorAll(".module-card"));
  if (!buttons.length || !Array.isArray(flowContent.modules)) {
    return;
  }

  function activate(index) {
    const module = flowContent.modules[index];
    if (!module) {
      return;
    }

    buttons.forEach((button, buttonIndex) => {
      const isActive = buttonIndex === index;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    renderModuleDetail(module, index);
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      activate(Number(button.dataset.moduleIndex || 0));
    });
  });

  activate(0);
}

function setupModuleListCards() {
  const cards = Array.from(document.querySelectorAll(".module-list-card"));
  if (!cards.length) {
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function applyStackState(activeCard) {
    cards.forEach((card) => {
      const collapsed = Boolean(activeCard) && card !== activeCard;
      card.classList.toggle("is-collapsed", collapsed);
    });
  }

  function openCard(card, trigger, panel) {
    trigger.setAttribute("aria-expanded", "true");
    card.classList.add("is-open");
    applyStackState(card);

    const icon = trigger.querySelector(".module-list-trigger-icon");
    if (icon) {
      icon.textContent = "-";
    }

    if (prefersReducedMotion) {
      panel.hidden = false;
      panel.style.height = "auto";
      panel.style.opacity = "1";
      return;
    }

    panel.hidden = false;
    panel.style.height = "0px";
    panel.style.opacity = "0";

    requestAnimationFrame(() => {
      panel.style.height = `${panel.scrollHeight}px`;
      panel.style.opacity = "1";
    });

    const onEnd = () => {
      panel.style.height = "auto";
      panel.removeEventListener("transitionend", onEnd);
    };
    panel.addEventListener("transitionend", onEnd);
  }

  function closeCard(card, trigger, panel) {
    trigger.setAttribute("aria-expanded", "false");
    card.classList.remove("is-open");
    applyStackState(null);

    const icon = trigger.querySelector(".module-list-trigger-icon");
    if (icon) {
      icon.textContent = "+";
    }

    if (prefersReducedMotion) {
      panel.hidden = true;
      panel.style.height = "0px";
      panel.style.opacity = "0";
      return;
    }

    panel.style.height = `${panel.scrollHeight}px`;
    panel.style.opacity = "1";

    requestAnimationFrame(() => {
      panel.style.height = "0px";
      panel.style.opacity = "0";
    });

    const onEnd = () => {
      panel.hidden = true;
      panel.removeEventListener("transitionend", onEnd);
    };
    panel.addEventListener("transitionend", onEnd);
  }

  cards.forEach((card, index) => {
    const trigger = card.querySelector(".module-list-trigger");
    const panel = card.querySelector(".module-list-panel");
    if (!trigger || !panel) {
      return;
    }

    panel.style.height = "0px";
    panel.style.opacity = "0";

    trigger.addEventListener("click", () => {
      const isOpen = card.classList.contains("is-open");
      if (isOpen) {
        closeCard(card, trigger, panel);
        return;
      }

      cards.forEach((otherCard) => {
        if (otherCard === card || !otherCard.classList.contains("is-open")) {
          return;
        }
        const otherTrigger = otherCard.querySelector(".module-list-trigger");
        const otherPanel = otherCard.querySelector(".module-list-panel");
        if (!otherTrigger || !otherPanel) {
          return;
        }
        closeCard(otherCard, otherTrigger, otherPanel);
      });

      openCard(card, trigger, panel);
    });

    if (index === 0) {
      openCard(card, trigger, panel);
    }
  });
}

function setupPricingCardsAccordion() {
  const cards = Array.from(document.querySelectorAll(".pricing-card"));
  if (!cards.length) {
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function openPanel(card, toggle, panel) {
    card.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.textContent = "Details ausblenden";

    if (prefersReducedMotion) {
      panel.hidden = false;
      panel.style.height = "auto";
      panel.style.opacity = "1";
      return;
    }

    panel.hidden = false;
    panel.style.height = "0px";
    panel.style.opacity = "0";

    requestAnimationFrame(() => {
      panel.style.height = `${panel.scrollHeight}px`;
      panel.style.opacity = "1";
    });

    const onEnd = () => {
      panel.style.height = "auto";
      panel.removeEventListener("transitionend", onEnd);
    };
    panel.addEventListener("transitionend", onEnd);
  }

  function closePanel(card, toggle, panel) {
    card.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "Details anzeigen";

    if (prefersReducedMotion) {
      panel.hidden = true;
      panel.style.height = "0px";
      panel.style.opacity = "0";
      return;
    }

    panel.style.height = `${panel.scrollHeight}px`;
    panel.style.opacity = "1";

    requestAnimationFrame(() => {
      panel.style.height = "0px";
      panel.style.opacity = "0";
    });

    const onEnd = () => {
      panel.hidden = true;
      panel.removeEventListener("transitionend", onEnd);
    };
    panel.addEventListener("transitionend", onEnd);
  }

  cards.forEach((card) => {
    const toggle = card.querySelector(".pricing-toggle");
    const panel = card.querySelector(".pricing-panel");
    if (!toggle || !panel) {
      return;
    }

    panel.style.height = "0px";
    panel.style.opacity = "0";

    toggle.addEventListener("click", () => {
      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      if (isOpen) {
        closePanel(card, toggle, panel);
      } else {
        openPanel(card, toggle, panel);
      }
    });

    card.addEventListener("click", (event) => {
      if (event.target.closest(".pricing-toggle")) {
        return;
      }

      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      if (isOpen) {
        closePanel(card, toggle, panel);
      } else {
        openPanel(card, toggle, panel);
      }
    });
  });
}

function setupMenu() {
  const toggle = document.querySelector(".menu-toggle");
  const menu = document.getElementById("mobile-menu");
  if (!toggle || !menu) {
    return;
  }
  const links = menu.querySelectorAll("a");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let closeTimer;

  function setMenuState(open) {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }

    toggle.setAttribute("aria-expanded", String(open));

    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add("is-open"));
    } else {
      menu.classList.remove("is-open");

      if (prefersReducedMotion) {
        menu.hidden = true;
      } else {
        closeTimer = window.setTimeout(() => {
          menu.hidden = true;
        }, 220);
      }
    }

    document.body.style.overflow = open ? "hidden" : "";
  }

  // Ensure the mobile overlay is closed on initial load.
  setMenuState(false);

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    setMenuState(!isOpen);
  });

  links.forEach((link) => {
    link.addEventListener("click", () => setMenuState(false));
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1080) {
      setMenuState(false);
    }
  });
}

function setupBookingsEmbed() {
  const consentBox = document.getElementById("booking-consent");
  const consentButton = document.getElementById("booking-consent-button");
  const manageButton = document.getElementById("booking-manage-button");
  const consentStatus = document.getElementById("booking-consent-status");
  const inlineContainer = document.getElementById("inline-container");
  if (!consentButton || !inlineContainer) {
    return;
  }

  const storageKey = "smartwerk_booking_embed_consent_v1";
  const consentGranted = "granted";
  const embedScriptUrl = "https://bookings.nimbuspop.com/assets/embed.js";
  const embedUrl = "https://smartwerk.zohobookings.eu/portal-embed#/254439000000047054";
  let loading = false;
  let storedDecision = "";

  try {
    storedDecision = String(localStorage.getItem(storageKey) || "");
  } catch (error) {
    storedDecision = "";
  }

  function setStatus(message = "") {
    if (!consentStatus) {
      return;
    }
    consentStatus.textContent = message;
  }

  function writeDecision(value) {
    try {
      localStorage.setItem(storageKey, value);
    } catch (error) {
      // Ignore storage errors (e.g. strict privacy mode).
    }
  }

  function clearDecision() {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      // Ignore storage errors.
    }
  }

  function setManageButtonState(decision) {
    if (!manageButton) {
      return;
    }

    if (decision === consentGranted) {
      manageButton.hidden = false;
      manageButton.textContent = "Einwilligung zurücksetzen";
      return;
    }

    manageButton.hidden = true;
    manageButton.textContent = "";
  }

  function loadEmbedScript() {
    return new Promise((resolve, reject) => {
      if (window.Bookings && typeof window.Bookings.inlineEmbed === "function") {
        resolve();
        return;
      }

      const existingScript = document.querySelector('script[data-bookings-embed="true"]');
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener("error", () => reject(new Error("bookings_embed_load_failed")), {
          once: true
        });
        return;
      }

      const script = document.createElement("script");
      script.src = embedScriptUrl;
      script.async = true;
      script.dataset.bookingsEmbed = "true";
      script.onload = () => {
        if (window.Bookings && typeof window.Bookings.inlineEmbed === "function") {
          resolve();
        } else {
          reject(new Error("bookings_embed_unavailable"));
        }
      };
      script.onerror = () => reject(new Error("bookings_embed_load_failed"));
      document.head.appendChild(script);
    });
  }

  async function activateEmbed({ persistConsent }) {
    if (inlineContainer.dataset.loaded === "1" || loading) {
      return;
    }

    loading = true;
    consentButton.disabled = true;
    consentButton.textContent = "Wird geladen...";
    setStatus("");

    try {
      await loadEmbedScript();
      inlineContainer.hidden = false;
      if (consentBox) {
        consentBox.hidden = true;
      }

      window.Bookings.inlineEmbed({
        url: embedUrl,
        parent: "#inline-container",
        height: "600px"
      });

      inlineContainer.dataset.loaded = "1";
      if (persistConsent) {
        storedDecision = consentGranted;
        writeDecision(consentGranted);
      }

      setManageButtonState(consentGranted);
    } catch (error) {
      consentButton.disabled = false;
      consentButton.textContent = "Terminbuchung laden";
      setStatus("Das Buchungsformular konnte nicht geladen werden. Bitte erneut versuchen.");
    } finally {
      loading = false;
    }
  }

  function deactivateEmbed(message = "") {
    inlineContainer.innerHTML = "";
    inlineContainer.hidden = true;
    delete inlineContainer.dataset.loaded;

    if (consentBox) {
      consentBox.hidden = false;
    }

    consentButton.disabled = false;
    consentButton.textContent = "Terminbuchung laden";
    setStatus(message);
  }

  consentButton.addEventListener("click", () => {
    activateEmbed({ persistConsent: true });
  });

  if (manageButton) {
    manageButton.addEventListener("click", () => {
      if (storedDecision === consentGranted) {
        storedDecision = "";
        clearDecision();
        deactivateEmbed("");
        setManageButtonState("");
      }
    });
  }

  if (storedDecision === consentGranted) {
    activateEmbed({ persistConsent: false });
    return;
  }

  setManageButtonState("");
}

function setupPilotForm() {
  const form = document.querySelector(".pilot-form");
  if (!form) {
    return;
  }

  const submitButton = form.querySelector("[data-submit-button]");
  const statusEl = form.querySelector("[data-form-status]");
  const formConfig = flowContent.form || {};

  function setStatus(message, state = "") {
    if (!statusEl) {
      return;
    }
    statusEl.textContent = message;
    statusEl.className = `form-status${state ? ` is-${state}` : ""}`;
  }

  function setSubmitting(isSubmitting) {
    if (!submitButton) {
      return;
    }
    submitButton.disabled = isSubmitting;
    submitButton.textContent = isSubmitting ? "Wird gesendet..." : "Anfrage senden";
  }

  function sanitize(value) {
    return String(value || "").trim();
  }

  async function submitToSmtpRelay(payload) {
    const smtpRelayUrl = sanitize(formConfig.smtpRelayUrl);
    if (!smtpRelayUrl) {
      return false;
    }

    const method = sanitize(formConfig.method || "POST").toUpperCase();
    const response = await fetch(smtpRelayUrl, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`SMTP relay returned status ${response.status}`);
    }

    return true;
  }

  function openMailClient(payload) {
    const recipient = sanitize(formConfig.recipientEmail || "kontakt@smartwerk-software.de");
    const subject = encodeURIComponent(sanitize(formConfig.subject || "Pilotbetrieb anfragen"));
    const body = encodeURIComponent(
      `Name: ${payload.name}\nFirma: ${payload.company}\nE-Mail: ${payload.email}\n\nWorum geht's?\n${payload.message}`
    );
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("");

    if (!form.checkValidity()) {
      form.reportValidity();
      setStatus("Bitte prüfe die markierten Felder.", "error");
      return;
    }

    const formData = new FormData(form);

    // Simple honeypot trap for bots.
    if (sanitize(formData.get("website"))) {
      form.reset();
      setStatus("Danke, eure Anfrage wurde übermittelt.", "success");
      return;
    }

    const payload = {
      name: sanitize(formData.get("name")),
      company: sanitize(formData.get("company")),
      email: sanitize(formData.get("email")),
      message: sanitize(formData.get("message")),
      source: "landingpage",
      createdAt: new Date().toISOString()
    };

    setSubmitting(true);

    try {
      const sentViaSmtpRelay = await submitToSmtpRelay(payload);
      if (sentViaSmtpRelay) {
        form.reset();
        setStatus("Danke, eure Anfrage wurde gesendet.", "success");
        return;
      }

      if (formConfig.useMailtoFallback !== false) {
        openMailClient(payload);
        setStatus("Euer E-Mail-Programm wurde geöffnet. Bitte sendet die vorbereitete Anfrage ab.", "info");
        return;
      }

      setStatus("Kein SMTP-Relay konfiguriert. Bitte smtpRelayUrl in content.js hinterlegen.", "error");
    } catch (error) {
      if (formConfig.useMailtoFallback !== false) {
        openMailClient(payload);
        setStatus("Die direkte Übertragung war nicht möglich. Dein E-Mail-Programm wurde als Fallback geöffnet.", "info");
      } else {
        setStatus("Senden fehlgeschlagen. Bitte später erneut versuchen.", "error");
      }
    } finally {
      setSubmitting(false);
    }
  });
}

function setupHeaderShrink() {
  const header = document.querySelector(".site-header");
  const sentinel = document.getElementById("header-shrink-sentinel");
  if (!header) {
    return;
  }

  function setScrolledState(isScrolled) {
    header.classList.toggle("is-scrolled", isScrolled);
    if (window.matchMedia("(min-width: 1081px)").matches) {
      document.body.classList.toggle("hero-badge-collapsed", isScrolled);
    } else {
      document.body.classList.remove("hero-badge-collapsed");
    }
  }

  if ("IntersectionObserver" in window && sentinel) {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        // Shrink once we are past ~70px scroll depth.
        setScrolledState(!entry.isIntersecting);
      },
      { rootMargin: "-70px 0px 0px 0px", threshold: 0 }
    );
    observer.observe(sentinel);
    return;
  }

  // Fallback for very old browsers.
  const onScroll = () => setScrolledState(window.scrollY > 70);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function setupAnchorOffset() {
  const header = document.querySelector(".site-header");
  if (!header) {
    return;
  }

  const anchorLinks = document.querySelectorAll('a[href^="#"]');

  function getOffset() {
    // Keep a small visual gap below the sticky header.
    return header.offsetHeight + 8;
  }

  function scrollToId(id, updateHash = true) {
    const target = document.getElementById(id);
    if (!target) {
      return;
    }

    const top =
      id === "top" ? 0 : target.getBoundingClientRect().top + window.scrollY - getOffset();
    window.scrollTo({ top, behavior: "smooth" });

    if (updateHash) {
      history.replaceState(null, "", `#${id}`);
    }
  }

  anchorLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href === "#") {
      return;
    }

    const id = href.slice(1);
    if (!id) {
      return;
    }

    link.addEventListener("click", (event) => {
      const target = document.getElementById(id);
      if (!target) {
        return;
      }

      event.preventDefault();
      scrollToId(id);
    });
  });

  // Correct initial deep-link position after reload/open with hash.
  if (window.location.hash.length > 1) {
    const id = window.location.hash.slice(1);
    requestAnimationFrame(() => scrollToId(id, false));
  }
}

renderContent();
setupImageFallbacks();
setupSolutionCardScrollEffect();
setupPracticeTileReveal();
setupProcessFlowProgress();
setupModuleShowcase();
setupModuleListCards();
setupPricingCardsAccordion();
setupFaqAccordion();
setupMenu();
setupBookingsEmbed();
setupPilotForm();
setupHeaderShrink();
setupAnchorOffset();
setupHeroSlider();
setupMatomoButtonTracking();
