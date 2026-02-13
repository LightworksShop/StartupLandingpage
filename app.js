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
  trustBullets.innerHTML = createListItems(flowContent.trustBullets);

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
          ${renderImage({ src: person.image, alt: person.alt, fallback: person.fallback })}
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
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = formData.get("name") || "";
    const company = formData.get("company") || "";
    const email = formData.get("email") || "";
    const message = formData.get("message") || "";

    const subject = encodeURIComponent("Pilotbetrieb anfragen");
    const body = encodeURIComponent(
      `Name: ${name}\nFirma: ${company}\nE-Mail: ${email}\n\nWorum geht's?\n${message}`
    );

    window.location.href = `mailto:kontakt@flow-software.de?subject=${subject}&body=${body}`;
  });
}

function setupHeaderShrink() {
  const header = document.querySelector(".site-header");
  if (!header) {
    return;
  }

  function updateHeaderState() {
    const isScrolled = window.scrollY > 24;
    header.classList.toggle("is-scrolled", isScrolled);
  }

  updateHeaderState();
  window.addEventListener("scroll", updateHeaderState, { passive: true });
}

renderContent();
setupMenu();
setupPilotForm();
setupHeaderShrink();
