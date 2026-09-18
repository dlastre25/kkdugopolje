(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const analyticsId = "";

  function run(fn) {
    try {
      fn();
    } catch (error) {
      console.error("KK Dugopolje site error:", error);
    }
  }

  run(() => {
    const header = document.querySelector("[data-header]");
    const toggle = document.querySelector("[data-nav-toggle]");
    const nav = document.querySelector("[data-nav]");
    const backdrop = document.querySelector("[data-nav-backdrop]");
    if (!header || !toggle || !nav) return;

    const current = window.location.pathname.split("/").pop() || "index.html";
    nav.querySelectorAll("a[href]").forEach((link) => {
      if (link.getAttribute("href") === current) link.classList.add("active");
    });

    const setScrolled = () => header.classList.toggle("is-scrolled", window.scrollY > 10);
    setScrolled();
    window.addEventListener("scroll", setScrolled, { passive: true });

    function setOpen(isOpen) {
      nav.classList.toggle("is-open", isOpen);
      header.classList.toggle("is-open", isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
      document.body.classList.toggle("nav-open", isOpen);
      if (backdrop) backdrop.hidden = !isOpen;
    }

    toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
    backdrop?.addEventListener("click", () => setOpen(false));
    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
    });
  });

  run(() => {
    const storageKey = "kkd_cookie_consent";
    const consent = window.localStorage.getItem(storageKey);

    function loadAnalytics() {
      if (!analyticsId || !/^G-[A-Z0-9]+$/i.test(analyticsId)) return;
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(analyticsId)}`;
      document.head.append(script);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag() { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", analyticsId, { anonymize_ip: true });
    }

    if (consent === "accepted") {
      loadAnalytics();
      return;
    }
    if (consent === "declined") return;

    const banner = document.createElement("div");
    banner.className = "cookie-consent";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Privola za kolačiće");
    banner.innerHTML = `
      <p>Koristimo nužne kolačiće za rad stranice, a analitičke samo uz privolu. Više informacija nalazi se u <a href="politika-kolacica.html">politici kolačića</a>.</p>
      <div class="cookie-consent__actions">
        <button class="btn btn--primary" type="button" data-cookie-accept>Prihvati</button>
        <button class="btn btn--outline" type="button" data-cookie-decline>Odbij</button>
      </div>
    `;
    document.body.append(banner);

    banner.querySelector("[data-cookie-accept]")?.addEventListener("click", () => {
      window.localStorage.setItem(storageKey, "accepted");
      banner.remove();
      loadAnalytics();
    });
    banner.querySelector("[data-cookie-decline]")?.addEventListener("click", () => {
      window.localStorage.setItem(storageKey, "declined");
      banner.remove();
    });
  });

  run(() => {
    const escapeHtml = (value) => String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    const normalizePath = (value) => String(value ?? "").trim().replace(/^\/+/, "");

    const slugify = (value) => String(value ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const articleUrl = (item) => {
      const slug = slugify(item.slug || item.title);
      return slug ? `novost.html?slug=${encodeURIComponent(slug)}` : normalizePath(item.url || "index.html");
    };

    const sortedNews = (items) => [...items].sort((a, b) => {
      const byDate = String(b.date || "").localeCompare(String(a.date || ""));
      if (byDate) return byDate;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });

    const paragraphsHtml = (value) => String(value ?? "")
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
      .join("");

    const formatDate = (value) => {
      const date = new Date(`${value}T00:00:00`);
      if (Number.isNaN(date.getTime())) return escapeHtml(value);
      return new Intl.DateTimeFormat("hr-HR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }).format(date);
    };

    const fetchJson = async (url) => {
      const response = await fetch(url, { headers: { "Accept": "application/json" } });
      if (!response.ok) throw new Error(`Cannot load ${url}`);
      return response.json();
    };

    const clubCell = (name) => {
      const safeName = escapeHtml(name || "-");
      if (String(name).trim().toLowerCase() !== "kk dugopolje") return safeName;
      return `<span class="club-cell"><img src="assets/images/grb.svg" alt="">KK Dugopolje</span>`;
    };

    fetchJson("data/news.json").then((items) => {
      const list = document.querySelector("[data-news-list]");
      if (!list || !Array.isArray(items) || !items.length) return;
      list.innerHTML = sortedNews(items).map((item, index) => {
        const isFeatured = item.featured || index === 0;
        const image = normalizePath(item.image);
        const cardClass = isFeatured ? "news-card news-card--featured reveal is-visible" : "news-card reveal is-visible";
        const imageHtml = isFeatured && image
          ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(item.alt || item.title)}" loading="lazy">`
          : "";
        const content = `
          ${imageHtml}
          <div>
            <span class="tag">${escapeHtml(item.tag)}</span>
            <time datetime="${escapeHtml(item.date)}">${formatDate(item.date)}</time>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.summary)}</p>
            <span class="news-card__more">Pročitaj više</span>
          </div>
        `;
        return `<article class="${cardClass}"><a href="${escapeHtml(articleUrl(item))}" aria-label="Pročitaj novost: ${escapeHtml(item.title)}">${content}</a></article>`;
      }).join("");
    }).catch(() => {});

    fetchJson("data/news.json").then((items) => {
      const article = document.querySelector("[data-news-article]");
      if (!article || !Array.isArray(items) || !items.length) return;

      const params = new URLSearchParams(window.location.search);
      const requestedSlug = slugify(params.get("slug"));
      const allNews = sortedNews(items);
      const item = allNews.find((entry) => slugify(entry.slug || entry.title) === requestedSlug) || allNews[0];
      const image = normalizePath(item.image) || "assets/images/TOP SLIKA.jpg";
      const title = item.title || "Novost";
      const subtitle = item.subtitle || item.summary || "";
      const body = item.content || item.body || item.text || item.summary || "";

      document.title = `${title} | KK Dugopolje`;
      document.querySelector('meta[name="description"]')?.setAttribute("content", subtitle);

      article.innerHTML = `
        <section class="article-hero" aria-labelledby="article-title">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(item.alt || title)}">
          <div class="article-hero__overlay"></div>
          <div class="container article-hero__content reveal is-visible">
            <a class="text-link article-back" href="index.html#news-title">Nazad na novosti</a>
            <span class="tag">${escapeHtml(item.tag || "Novost")}</span>
            <time datetime="${escapeHtml(item.date || "")}">${formatDate(item.date)}</time>
            <h1 id="article-title">${escapeHtml(title)}</h1>
            <p>${escapeHtml(subtitle)}</p>
          </div>
        </section>
        <section class="section article-section">
          <div class="container article-layout">
            <div class="article-body">
              ${paragraphsHtml(body)}
            </div>
            <aside class="article-aside" aria-labelledby="more-news-title">
              <h2 id="more-news-title">Još novosti</h2>
              <div class="article-more">
                ${allNews.filter((entry) => entry !== item).slice(0, 3).map((entry) => `
                  <a href="${escapeHtml(articleUrl(entry))}">
                    <span class="tag">${escapeHtml(entry.tag || "Novost")}</span>
                    <strong>${escapeHtml(entry.title)}</strong>
                    <time datetime="${escapeHtml(entry.date || "")}">${formatDate(entry.date)}</time>
                  </a>
                `).join("")}
              </div>
            </aside>
          </div>
        </section>
      `;
    }).catch(() => {});

    fetchJson("data/results.json").then((items) => {
      const list = document.querySelector("[data-match-list]");
      if (!list || !Array.isArray(items) || !items.length) return;
      list.innerHTML = items.map((item) => `
        <tr data-match-row data-category="${escapeHtml(item.category)}">
          <td><time datetime="${escapeHtml(item.date)}">${formatDate(item.date)}</time></td>
          <td><span class="match-label">${escapeHtml(item.categoryLabel)}</span></td>
          <td>${escapeHtml(item.round)}</td>
          <th scope="row">${clubCell(item.home)}</th>
          <td>${clubCell(item.away)}</td>
          <td><strong class="table-score">${escapeHtml(item.score)}</strong></td>
          <td>${escapeHtml(item.scorers)}</td>
        </tr>
      `).join("");
    }).catch(() => {});

    fetchJson("data/gallery.json").then((items) => {
      const list = document.querySelector("[data-gallery-list]");
      if (!list || !Array.isArray(items) || !items.length) return;
      list.innerHTML = items.map((item) => {
        const layout = ["wide", "tall"].includes(item.layout) ? ` ${item.layout}` : "";
        return `<button class="gallery-item reveal is-visible${layout}"><img src="${escapeHtml(normalizePath(item.image))}" alt="${escapeHtml(item.alt)}" loading="lazy"></button>`;
      }).join("");
    }).catch(() => {});
  });

  run(() => {
    const slides = [...document.querySelectorAll(".hero-slide")];
    if (slides.length < 2 || reducedMotion) return;
    let index = 0;
    window.setInterval(() => {
      slides[index].classList.remove("active");
      index = (index + 1) % slides.length;
      slides[index].classList.add("active");
    }, 5200);
  });

  run(() => {
    const reveals = document.querySelectorAll(".reveal");
    if (!reveals.length) return;
    if (!("IntersectionObserver" in window) || reducedMotion) {
      reveals.forEach((item) => item.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14 });
    reveals.forEach((item) => observer.observe(item));
  });

  run(() => {
    const counters = document.querySelectorAll("[data-count]");
    if (!counters.length) return;
    const showFinal = (counter) => { counter.textContent = counter.dataset.count; };
    if (!("IntersectionObserver" in window) || reducedMotion) {
      counters.forEach(showFinal);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const counter = entry.target;
        const target = Number(counter.dataset.count);
        if (!Number.isFinite(target)) return showFinal(counter);
        const start = performance.now();
        const duration = 900;
        const tick = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          counter.textContent = String(Math.round(target * progress));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        observer.unobserve(counter);
      });
    }, { threshold: 0.5 });
    counters.forEach((counter) => observer.observe(counter));
  });

  run(() => {
    const buttons = document.querySelectorAll("[data-match-filter]");
    const sections = document.querySelectorAll("[data-filter-section]");
    if (!buttons.length) return;
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const filter = button.dataset.matchFilter;
        const cards = document.querySelectorAll(".result-card[data-category], [data-match-row][data-category], .download-card[data-category]");
        buttons.forEach((item) => item.classList.toggle("active", item === button));
        cards.forEach((card) => {
          card.hidden = filter !== "sve" && card.dataset.category !== filter;
        });
        sections.forEach((section) => {
          section.hidden = section.dataset.filterSection !== filter;
        });
      });
    });
  });

  run(() => {
    const buttons = document.querySelectorAll("[data-gallery-filter]");
    const gallery = document.querySelector("[data-gallery]");
    const lightbox = document.querySelector("[data-lightbox]");
    const image = lightbox?.querySelector("img");
    const close = document.querySelector("[data-lightbox-close]");
    const prev = document.querySelector("[data-lightbox-prev]");
    const next = document.querySelector("[data-lightbox-next]");
    if (!gallery) return;

    let visibleItems = [];
    let activeIndex = 0;
    let lastFocus = null;

    function refreshVisible() {
      visibleItems = [...gallery.querySelectorAll(".gallery-item")].filter((item) => !item.hidden);
    }
    refreshVisible();

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const filter = button.dataset.galleryFilter;
        const items = [...gallery.querySelectorAll(".gallery-item")];
        buttons.forEach((item) => item.classList.toggle("active", item === button));
        items.forEach((item) => {
          item.hidden = filter !== "sve" && item.dataset.category !== filter;
        });
        refreshVisible();
      });
    });

    function openAt(index) {
      if (!lightbox || !image) return;
      refreshVisible();
      if (!visibleItems.length) return;
      activeIndex = (index + visibleItems.length) % visibleItems.length;
      const source = visibleItems[activeIndex].querySelector("img");
      if (!source) return;
      lastFocus = document.activeElement;
      image.src = source.src;
      image.alt = source.alt;
      lightbox.hidden = false;
      document.body.style.overflow = "hidden";
      close?.focus();
    }

    function closeLightbox() {
      if (!lightbox) return;
      lightbox.hidden = true;
      document.body.style.overflow = "";
      lastFocus?.focus?.();
    }

    function shift(delta) {
      if (!lightbox || lightbox.hidden) return;
      openAt(activeIndex + delta);
    }

    gallery.addEventListener("click", (event) => {
      const item = event.target.closest(".gallery-item");
      if (!item) return;
      refreshVisible();
      openAt(visibleItems.indexOf(item));
    });
    close?.addEventListener("click", closeLightbox);
    prev?.addEventListener("click", () => shift(-1));
    next?.addEventListener("click", () => shift(1));
    lightbox?.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", (event) => {
      if (!lightbox || lightbox.hidden) return;
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") shift(-1);
      if (event.key === "ArrowRight") shift(1);
    });
  });

  run(() => {
    const forms = document.querySelectorAll("[data-form]");
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!forms.length) return;

    function removeErrors(form) {
      form.querySelectorAll(".field-error").forEach((error) => error.remove());
      form.querySelectorAll("[aria-invalid]").forEach((field) => field.removeAttribute("aria-invalid"));
    }

    function addError(input, message) {
      input.setAttribute("aria-invalid", "true");
      const error = document.createElement("span");
      error.className = "field-error";
      error.textContent = message;
      input.insertAdjacentElement("afterend", error);
    }

    forms.forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        removeErrors(form);
        const status = form.querySelector(".form-status");
        const submit = form.querySelector('button[type="submit"]');
        let valid = true;

        form.querySelectorAll("input, textarea").forEach((input) => {
          if (input.name === "website") return;
          const value = input.type === "checkbox" ? input.checked : input.value.trim();
          if (input.required && !value) {
            addError(input, input.type === "checkbox" ? "Privola je obavezna za nastavak." : "Ovo polje je obavezno.");
            valid = false;
          } else if (input.type === "email" && !emailPattern.test(String(value))) {
            addError(input, "Unesi ispravnu email adresu.");
            valid = false;
          } else if (input.minLength > 0 && String(value).length < input.minLength) {
            addError(input, `Unesi najmanje ${input.minLength} znakova.`);
            valid = false;
          } else if (input.type === "number") {
            const number = Number(value);
            const min = Number(input.min);
            const max = Number(input.max);
            if (!Number.isFinite(number) || number < min || number > max) {
              addError(input, `Unesi godinu između ${min} i ${max}.`);
              valid = false;
            }
          }
        });

        if (!status) return;
        status.classList.toggle("is-warning", !valid);
        if (!valid) {
          status.textContent = "Provjeri označena polja.";
          return;
        }

        status.textContent = "Slanje je u tijeku...";
        submit?.setAttribute("disabled", "true");

        try {
          const response = await fetch(form.action, {
            method: "POST",
            body: new FormData(form),
            headers: { "Accept": "application/json" }
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || result.ok !== true) {
            throw new Error(result.message || "Slanje nije uspjelo.");
          }
          status.classList.remove("is-warning");
          status.textContent = result.message || "Poruka je poslana. Hvala!";
          form.reset();
        } catch (error) {
          status.classList.add("is-warning");
          status.textContent = "Poruka se trenutno ne može poslati. Pokušaj ponovno ili kontaktiraj klub emailom.";
        } finally {
          submit?.removeAttribute("disabled");
        }
      });
    });
  });
})();

