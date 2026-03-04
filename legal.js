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

setupLegalMenu();
setupLegalHeaderShrink();
