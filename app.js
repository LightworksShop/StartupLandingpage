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

function renderContent() {
  const trustBullets = document.getElementById("trust-bullets");
  if (trustBullets) {
    trustBullets.innerHTML = createListItems(flowContent.trustBullets);
  }

  const heroVisual = document.getElementById("hero-visual");
  heroVisual.innerHTML = renderImage(flowContent.heroImage, "", {
    loading: "eager",
    fetchPriority: "high",
    decoding: "async"
  });

  const painGrid = document.getElementById("pain-points");
  painGrid.innerHTML = flowContent.painPoints
    .map(
      (point) => `
        <article class="pain-card">
          <div class="pain-icon" aria-hidden="true">${getProblemIcon(point.icon)}</div>
          <h3>${point.title}</h3>
          <p>${point.text}</p>
        </article>
      `
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

  const timeline = document.getElementById("timeline");
  timeline.innerHTML = flowContent.timeline
    .map((step, index) => `<li data-step="${index + 1}"><span>${step}</span></li>`)
    .join("");

  const pricing = document.getElementById("pricing-cards");
  pricing.innerHTML = flowContent.pricing
    .map(
      (plan) => `
        <article class="pricing-card${plan.featured ? " featured" : ""}">
          ${plan.featured ? '<span class="badge">Beliebt</span>' : ""}
          <h3>${plan.title}</h3>
          <p class="price">${plan.price}</p>
          <p>${plan.summary}</p>
          <ul>${createListItems(plan.points)}</ul>
        </article>
      `
    )
    .join("");

  const pilotPoints = document.getElementById("pilot-points");
  pilotPoints.innerHTML = createListItems(flowContent.pilot);

  const faqList = document.getElementById("faq-list");
  if (faqList && Array.isArray(flowContent.faq)) {
    faqList.innerHTML = flowContent.faq
      .map(
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
              ${item.answer.map((paragraph) => `<p>${paragraph}</p>`).join("")}
            </div>
          </article>
        `
      )
      .join("");
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
              text: item.answer.join(" ")
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
          <div class="team-avatar">
            ${renderImage({ src: person.image, alt: person.alt, fallback: person.fallback })}
          </div>
          <h3>${person.name}</h3>
          <p>${person.role}</p>
        </article>
      `
    )
    .join("");

  const year = document.getElementById("year");
  if (year) {
    year.textContent = new Date().getFullYear();
  }
}

function getProblemIcon(type) {
  const icons = {
    sheet: `
      <svg viewBox="0 0 24 24" focusable="false">
        <rect x="4" y="3.5" width="16" height="17" rx="2"></rect>
        <path d="M8 8.5h8M8 12h8M8 15.5h5"></path>
      </svg>
    `,
    integration: `
      <svg viewBox="0 0 24 24" focusable="false">
        <circle cx="6.5" cy="7" r="2.5"></circle>
        <circle cx="17.5" cy="7" r="2.5"></circle>
        <circle cx="12" cy="17" r="2.5"></circle>
        <path d="M8.8 8.4L10.7 10M15.2 8.4L13.3 10M10.7 14l-1.9 1.6M13.3 14l1.9 1.6"></path>
      </svg>
    `,
    process: `
      <svg viewBox="0 0 24 24" focusable="false">
        <rect x="3.5" y="5" width="7" height="5" rx="1"></rect>
        <rect x="13.5" y="5" width="7" height="5" rx="1"></rect>
        <rect x="8.5" y="14" width="7" height="5" rx="1"></rect>
        <path d="M10.5 7.5h3M12 10v4"></path>
      </svg>
    `,
    erp: `
      <svg viewBox="0 0 24 24" focusable="false">
        <rect x="3.5" y="4" width="17" height="4.5" rx="1"></rect>
        <rect x="3.5" y="10" width="17" height="4.5" rx="1"></rect>
        <rect x="3.5" y="16" width="11" height="4.5" rx="1"></rect>
      </svg>
    `
  };

  return icons[type] || icons.sheet;
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
    const recipient = sanitize(formConfig.recipientEmail || "kontakt@flow-software.de");
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
      setStatus("Danke, deine Anfrage wurde übermittelt.", "success");
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
        setStatus("Danke, deine Anfrage wurde gesendet.", "success");
        return;
      }

      if (formConfig.useMailtoFallback !== false) {
        openMailClient(payload);
        setStatus("Dein E-Mail-Programm wurde geöffnet. Bitte sende die vorbereitete Anfrage ab.", "info");
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

    const top = target.getBoundingClientRect().top + window.scrollY - getOffset();
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
setupFaqAccordion();
setupMenu();
setupPilotForm();
setupHeaderShrink();
setupAnchorOffset();
