function setupLegalMenu() {
  const button = document.querySelector(".menu-toggle");
  const menu = document.getElementById("mobile-menu");

  if (!button || !menu) {
    return;
  }

  function setMenuState(isOpen) {
    button.setAttribute("aria-expanded", String(isOpen));
    menu.hidden = !isOpen;
    menu.classList.toggle("is-open", isOpen);
    document.body.classList.toggle("menu-open", isOpen);
  }

  setMenuState(false);

  button.addEventListener("click", () => {
    const isOpen = button.getAttribute("aria-expanded") === "true";
    setMenuState(!isOpen);
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenuState(false));
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1080) {
      setMenuState(false);
    }
  });
}

function trackMatomoEvent(category, action, name) {
  if (!Array.isArray(window._paq)) {
    return;
  }

  window._paq.push(["trackEvent", category, action, name]);
}

function setupLegalMatomoButtonTracking() {
  const trackedSelectors = [
    ".header-cta",
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

  function getCategory(element) {
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

  function getLabel(element) {
    const ariaLabel = element.getAttribute("aria-label");
    if (ariaLabel) {
      return ariaLabel.trim();
    }

    const text = element.textContent.replace(/\s+/g, " ").trim();
    if (text) {
      return text;
    }

    const href = element.getAttribute("href");
    if (href) {
      return href;
    }

    return "Unbenannt";
  }

  trackedElements.forEach((element) => {
    element.addEventListener("click", () => {
      trackMatomoEvent(getCategory(element), "click", getLabel(element));
    });
  });
}

function setupLegalHeaderShrink() {
  const header = document.querySelector(".site-header");
  const sentinel = document.getElementById("header-shrink-sentinel");

  if (!header || !sentinel) {
    return;
  }

  function setScrolledState(isScrolled) {
    header.classList.toggle("is-scrolled", isScrolled);
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setScrolledState(!entry.isIntersecting);
      },
      { rootMargin: "-70px 0px 0px 0px", threshold: 0 }
    );
    observer.observe(sentinel);
    return;
  }

  const onScroll = () => setScrolledState(window.scrollY > 70);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function setLegalYear() {
  const year = document.getElementById("year");
  if (year) {
    year.textContent = new Date().getFullYear();
  }
}

setupLegalMenu();
setupLegalHeaderShrink();
setLegalYear();
setupLegalMatomoButtonTracking();
