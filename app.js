function createListItems(items) {
  return items.map((item) => `<li>${item}</li>`).join("");
}

function renderImage({ src, alt, fallback }, className = "") {
  const safeClass = className ? ` class="${className}"` : "";
  const fallbackAttr = fallback
    ? ` onerror="if(!this.dataset.fallback){this.dataset.fallback='1';this.src='${fallback}';}"`
    : "";
  return `<img${safeClass} src="${src}" alt="${alt}" loading="lazy"${fallbackAttr}>`;
}

function renderContent() {
  const trustBullets = document.getElementById("trust-bullets");
  if (trustBullets) {
    trustBullets.innerHTML = createListItems(flowContent.trustBullets);
  }

  const heroVisual = document.getElementById("hero-visual");
  heroVisual.innerHTML = renderImage(flowContent.heroImage);

  const problemVisual = document.getElementById("problem-visual");
  problemVisual.innerHTML = renderImage(flowContent.sectionImages.problem);

  const solutionVisuals = document.getElementById("solution-visuals");
  solutionVisuals.innerHTML = flowContent.sectionImages.solution
    .map(
      (image) => `
        <figure class="section-image">
          ${renderImage(image)}
        </figure>
      `
    )
    .join("");

  const painGrid = document.getElementById("pain-points");
  painGrid.innerHTML = flowContent.painPoints
    .map((point) => `<article class="pain-card"><p>${point}</p></article>`)
    .join("");

  const solutionCards = document.getElementById("solution-cards");
  solutionCards.innerHTML = flowContent.solutionCards
    .map(
      (card) => `
        <article class="card">
          <h3>${card.title}</h3>
          <ul>${createListItems(card.points)}</ul>
        </article>
      `
    )
    .join("");

  const targetGroups = document.getElementById("target-groups");
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

function setupMenu() {
  const toggle = document.querySelector(".menu-toggle");
  const menu = document.getElementById("mobile-menu");
  if (!toggle || !menu) {
    return;
  }
  const links = menu.querySelectorAll("a");

  function setMenuState(open) {
    toggle.setAttribute("aria-expanded", String(open));
    menu.hidden = !open;
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
setupMenu();
setupPilotForm();
setupHeaderShrink();
setupAnchorOffset();
