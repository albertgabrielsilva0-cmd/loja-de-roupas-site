// ===== Always land at the top of a page we navigated to =====
// Some hosts restore the previous page's scroll position on same-site
// navigation (history.scrollRestoration, or bfcache on back/forward), so a
// link to catalogo.html can land mid-page instead of at the top. Force it.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);
window.addEventListener("pageshow", (e) => {
  if (e.persisted) window.scrollTo(0, 0);
});

// ===== Config =====
const WHATSAPP_NUMBER = "5511995565835"; // wa.me — número real do perfil @specs

// ===== Cart state (mirrored to localStorage) =====
let cart = [];
try {
  const saved = localStorage.getItem("specs_cart");
  if (saved) cart = JSON.parse(saved);
} catch (e) {
  cart = [];
}

function saveCart() {
  try {
    localStorage.setItem("specs_cart", JSON.stringify(cart));
  } catch (e) {
    /* localStorage indisponível (modo privado etc.) — segue só em memória */
  }
}

function formatMsg() {
  const lines = ["Oi! Tenho interesse em revender peças da SPECS 💕", "", "Gostaria de cotação de atacado para:"];
  cart.forEach((item) => {
    lines.push(`• ${item.qty}x ${item.name} (${item.color})`);
  });
  lines.push("", "Podem me passar valores e quantidade mínima? Obrigada!");
  return lines.join("\n");
}

function addToCart(product, color, qty = 1) {
  const key = product.id + "|" + color;
  const existing = cart.find((i) => i.key === key);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ key, id: product.id, name: product.name, color, img: product.img, qty });
  }
  saveCart();
  renderCart();
  pulseFab();
}

function updateQty(key, delta) {
  const item = cart.find((i) => i.key === key);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter((i) => i.key !== key);
  saveCart();
  renderCart();
}

function removeItem(key) {
  cart = cart.filter((i) => i.key !== key);
  saveCart();
  renderCart();
}

function cartCount() {
  return cart.reduce((sum, i) => sum + i.qty, 0);
}

function pulseFab() {
  const fab = document.getElementById("cart-fab");
  if (!fab) return;
  fab.classList.remove("pulse");
  void fab.offsetWidth;
  fab.classList.add("pulse");
}

function renderCart() {
  const badge = document.querySelector(".cart-badge");
  const count = cartCount();
  if (badge) {
    badge.textContent = count;
    badge.classList.toggle("show", count > 0);
  }
  const list = document.getElementById("drawer-items");
  if (!list) return;
  if (cart.length === 0) {
    list.innerHTML = '<p class="drawer-empty">Seu pedido está vazio.<br>Adicione peças do catálogo para solicitar orçamento no atacado.</p>';
    return;
  }
  list.innerHTML = cart
    .map(
      (item) => `
    <div class="drawer-item" data-key="${item.key}">
      <img src="${item.img}" alt="${item.name}">
      <div class="drawer-item-info">
        <div class="name">${item.name}</div>
        <div class="meta">Cor: ${item.color}</div>
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="qty-stepper">
            <button class="qty-btn" data-action="dec">−</button>
            <span class="qty-val">${item.qty}</span>
            <button class="qty-btn" data-action="inc">+</button>
          </div>
          <button class="drawer-remove" data-action="remove">remover</button>
        </div>
      </div>
    </div>`
    )
    .join("");
}

function wireCartDrawerEvents() {
  const list = document.getElementById("drawer-items");
  if (!list) return;
  list.addEventListener("click", (e) => {
    const row = e.target.closest(".drawer-item");
    if (!row) return;
    const key = row.dataset.key;
    if (e.target.dataset.action === "inc") updateQty(key, 1);
    if (e.target.dataset.action === "dec") updateQty(key, -1);
    if (e.target.dataset.action === "remove") removeItem(key);
  });
}

function openDrawer() {
  document.getElementById("cart-drawer")?.classList.add("open");
  document.getElementById("cart-overlay")?.classList.add("open");
}
function closeDrawer() {
  document.getElementById("cart-drawer")?.classList.remove("open");
  document.getElementById("cart-overlay")?.classList.remove("open");
}

function sendWhatsAppOrder() {
  if (cart.length === 0) return;
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(formatMsg())}`;
  // Not window.open(): inside the preview sandbox that silently returns null
  // and does nothing for most viewers. A real navigation always works, both
  // here and once this is hosted for real.
  window.location.href = url;
}

// ===== Product card builder =====
function colorToHex(color) {
  const map = {
    Amarelo: "#f5df6b",
    Preto: "#1a1a1a",
    Branco: "#ffffff",
    Rosa: "#fa9fd8",
    Azul: "#7fc4ea",
    Lilás: "#c9a6e0",
    Marrom: "#6f4330",
    Bege: "#cdb38b",
    Verde: "#9cc79a",
  };
  return map[color] || "#ccc";
}

// ===== Blur-up (Annabella-style): images arrive blurred and sharpen once they are
// loaded AND on screen, so the effect is visible even when the file is cached. =====
const blurObserver = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        blurObserver.unobserve(entry.target);
        sharpenWhenLoaded(entry.target);
      });
    }, { threshold: 0.12 })
  : null;

function sharpenWhenLoaded(img) {
  // two frames so the blurred state is painted before the transition starts
  const done = () => requestAnimationFrame(() => requestAnimationFrame(() => img.classList.add("is-loaded")));
  if (img.complete && img.naturalWidth) done();
  else {
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
  }
}

function observeBlurUp(img) {
  if (!img || img.classList.contains("is-loaded")) return;
  img.classList.add("blur-up");
  if (blurObserver) blurObserver.observe(img);
  else sharpenWhenLoaded(img);
}

function buildProductCard(p) {
  const div = document.createElement("div");
  div.className = "product-card";
  div.dataset.id = p.id;
  const tag = p.isNew ? '<span class="product-tag">Novidade</span>' : p.bestSeller ? '<span class="product-tag best">Mais pedido</span>' : "";
  // on hover the card crossfades to the product video, or to its 2nd photo
  const alt = p.video
    ? `<video class="card-media-alt" src="${p.video}" poster="${p.poster || p.img}" muted loop playsinline preload="none"></video>`
    : p.images && p.images[1]
      ? `<img class="card-media-alt" src="${p.images[1]}" alt="" loading="lazy">`
      : "";
  div.innerHTML = `
    <div class="product-card-media">
      ${tag}
      ${p.video ? '<span class="product-video-tag" aria-hidden="true">▶ vídeo</span>' : ""}
      <img class="card-media-main" src="${p.img}" alt="${p.name}" loading="lazy">
      ${alt}
    </div>
    <div class="product-card-body">
      <div class="product-cat">${p.categoryLabel}</div>
      <div class="product-name">${p.name}</div>
      <div class="color-dots">${p.colors.map((c) => `<span class="color-dot" style="background:${colorToHex(c)}" title="${c}"></span>`).join("")}</div>
      <div class="product-price-row">
        <span class="wholesale-note">Atacado · sob consulta</span>
        <button class="add-to-cart-btn" aria-label="Adicionar ao pedido" data-action="quick-add">+</button>
      </div>
    </div>
  `;
  div.addEventListener("click", (e) => {
    if (e.target.closest(".add-to-cart-btn")) {
      e.stopPropagation();
      addToCart(p, p.colors[0], 1);
      return;
    }
    openQuickview(p);
  });
  const hoverVideo = div.querySelector("video.card-media-alt");
  // Hover video only on desktop (hover: hover) — mouseenter/mouseleave causes jank on mobile
  if (hoverVideo && window.matchMedia("(hover: hover)").matches && window.matchMedia("(min-width: 768px)").matches) {
    div.addEventListener("mouseenter", () => hoverVideo.play().catch(() => {}));
    div.addEventListener("mouseleave", () => hoverVideo.pause());
  }
  observeBlurUp(div.querySelector(".card-media-main"));
  return div;
}

// ===== Quickview: swipeable gallery (photos + product video) + product info =====
let qvGoTo = null;

function openQuickview(p) {
  const overlay = document.getElementById("quickview-overlay");
  if (!overlay) return;
  const media = (p.images && p.images.length ? p.images : [p.img]).map((src) => ({ type: "img", src }));
  if (p.video) media.unshift({ type: "video", src: p.video, poster: p.poster || p.img });
  const multi = media.length > 1;

  const thumbsHtml = multi
    ? `<div class="quickview-thumbs">
        ${media.map((m, i) => `<button class="qv-thumb" data-i="${i}" aria-label="Mídia ${i + 1}"><img src="${m.type === "video" ? m.poster : m.src}" alt="">${m.type === "video" ? '<span class="qv-play">▶</span>' : ""}</button>`).join("")}
      </div>`
    : "";
  const slidesHtml = media
    .map((m) => `<div class="qv-slide">${m.type === "video"
      ? `<video src="${m.src}" poster="${m.poster}" muted loop playsinline preload="metadata"></video>`
      : `<img src="${m.src}" alt="${p.name}" draggable="false">`}</div>`)
    .join("");
  const galleryUi = multi
    ? `<span class="qv-counter"><span id="qv-current">1</span> / ${media.length}</span>
       <button class="qv-nav prev" aria-label="Foto anterior">‹</button>
       <button class="qv-nav next" aria-label="Próxima foto">›</button>
       <div class="qv-dots">${media.map((_, i) => `<button class="qv-dot" data-i="${i}" aria-label="Ir para mídia ${i + 1}"></button>`).join("")}</div>`
    : "";

  overlay.innerHTML = `
    <div class="quickview-modal ${multi ? "" : "no-thumbs"}" role="dialog" aria-modal="true" aria-label="${p.name}">
      <button class="quickview-close" aria-label="Fechar">&times;</button>
      ${thumbsHtml}
      <div class="quickview-gallery">
        <div class="qv-track">${slidesHtml}</div>
        ${galleryUi}
      </div>
      <div class="quickview-info">
        <div class="product-cat">${p.categoryLabel}</div>
        <h3>${p.name}</h3>
        <p class="qv-wholesale">Atacado · preço e quantidade mínima pelo WhatsApp</p>
        <p class="desc">${p.desc}</p>
        <div class="quickview-colors">
          <h5>Cor: <span id="qv-color-name">${p.colors[0]}</span></h5>
          <div class="color-swatch-row">
            ${p.colors.map((c, i) => `<button class="color-swatch ${i === 0 ? "selected" : ""}" data-color="${c}" style="background:${colorToHex(c)}" aria-label="${c}"></button>`).join("")}
          </div>
        </div>
        <div class="quickview-actions">
          <div class="qty-stepper">
            <button class="qty-btn" id="qv-dec" aria-label="Diminuir">−</button>
            <span class="qty-val" id="qv-qty">1</span>
            <button class="qty-btn" id="qv-inc" aria-label="Aumentar">+</button>
          </div>
          <button class="btn btn-primary" id="qv-add">Adicionar ao pedido</button>
        </div>
      </div>
    </div>
  `;

  setupQuickviewGallery(overlay);
  overlay.querySelectorAll(".qv-slide img").forEach(observeBlurUp);

  let qty = 1;
  let selectedColor = p.colors[0];
  overlay.querySelectorAll(".color-swatch").forEach((sw) => {
    sw.addEventListener("click", () => {
      overlay.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("selected"));
      sw.classList.add("selected");
      selectedColor = sw.dataset.color;
      overlay.querySelector("#qv-color-name").textContent = selectedColor;
    });
  });
  overlay.querySelector("#qv-inc").addEventListener("click", () => {
    qty++;
    overlay.querySelector("#qv-qty").textContent = qty;
  });
  overlay.querySelector("#qv-dec").addEventListener("click", () => {
    if (qty > 1) qty--;
    overlay.querySelector("#qv-qty").textContent = qty;
  });
  overlay.querySelector("#qv-add").addEventListener("click", () => {
    addToCart(p, selectedColor, qty);
    closeQuickview();
  });
  overlay.querySelector(".quickview-close").addEventListener("click", closeQuickview);
  overlay.classList.add("open");
  document.body.classList.add("no-scroll");
}

function closeQuickview() {
  const overlay = document.getElementById("quickview-overlay");
  if (!overlay) return;
  overlay.classList.remove("open");
  overlay.querySelectorAll("video").forEach((v) => v.pause());
  document.body.classList.remove("no-scroll");
  qvGoTo = null;
}

// Native horizontal scroll-snap does the finger-following swipe; this only keeps
// thumbs/dots/counter in sync and plays the video only while its slide is visible.
function setupQuickviewGallery(overlay) {
  const track = overlay.querySelector(".qv-track");
  if (!track) return;
  const slides = Array.from(track.children);
  const thumbs = Array.from(overlay.querySelectorAll(".qv-thumb"));
  const dots = Array.from(overlay.querySelectorAll(".qv-dot"));
  const counter = overlay.querySelector("#qv-current");
  const prevBtn = overlay.querySelector(".qv-nav.prev");
  const nextBtn = overlay.querySelector(".qv-nav.next");
  let current = -1;

  function setActive(i) {
    if (i === current) return;
    current = i;
    thumbs.forEach((t, ti) => t.classList.toggle("active", ti === i));
    dots.forEach((d, di) => d.classList.toggle("active", di === i));
    if (counter) counter.textContent = i + 1;
    if (prevBtn) prevBtn.disabled = i === 0;
    if (nextBtn) nextBtn.disabled = i === slides.length - 1;
    slides.forEach((s, si) => {
      const v = s.querySelector("video");
      if (!v) return;
      if (si === i) v.play().catch(() => {});
      else v.pause();
    });
    thumbs[i]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function goTo(i) {
    const idx = Math.max(0, Math.min(slides.length - 1, i));
    track.scrollTo({ left: idx * track.clientWidth, behavior: "smooth" });
  }

  track.addEventListener("scroll", () => {
    setActive(Math.round(track.scrollLeft / Math.max(1, track.clientWidth)));
  }, { passive: true });
  thumbs.forEach((t, i) => t.addEventListener("click", () => goTo(i)));
  dots.forEach((d, i) => d.addEventListener("click", () => goTo(i)));
  prevBtn?.addEventListener("click", () => goTo(current - 1));
  nextBtn?.addEventListener("click", () => goTo(current + 1));

  setActive(0);
  qvGoTo = (delta) => goTo(current + delta);
}

// ===== Eased in-page scroll with a light blur while moving. The blur goes on
// .page-wrap, never <body>: a filter on body breaks position:fixed for the cart
// FAB/drawer (landing-page-toolkit skill note). =====
let scrollAnim = null;
function smoothScrollTo(target, duration) {
  // On mobile, use faster animation (300ms vs 1100ms) to avoid jank
  if (!duration) duration = window.matchMedia("(max-width: 600px)").matches ? 300 : 1100;
  const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
  const endY = Math.max(0, target.getBoundingClientRect().top + window.scrollY - margin);
  const root = document.documentElement;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo(0, endY);
    return;
  }
  if (scrollAnim) scrollAnim.stop();
  const pageWrap = document.querySelector(".page-wrap");
  const startY = window.scrollY;
  const dist = endY - startY;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const t0 = performance.now();
  let rafId;
  // CSS smooth scrolling would smooth every frame again, so it is paused while we animate
  root.style.scrollBehavior = "auto";
  pageWrap?.classList.add("is-scrolling");

  function stop() {
    cancelAnimationFrame(rafId);
    root.style.scrollBehavior = "";
    pageWrap?.classList.remove("is-scrolling");
    window.removeEventListener("wheel", stop);
    window.removeEventListener("touchstart", stop);
    scrollAnim = null;
  }
  function step(now) {
    const t = Math.min(1, (now - t0) / duration);
    window.scrollTo(0, startY + dist * ease(t));
    if (t < 1) rafId = requestAnimationFrame(step);
    else stop();
  }
  // the visitor scrolling by hand takes over
  window.addEventListener("wheel", stop, { passive: true });
  window.addEventListener("touchstart", stop, { passive: true });
  rafId = requestAnimationFrame(step);
  scrollAnim = { stop };
}

// ===== Light cross-page transition: same blur/feel as the in-page smooth
// scroll above, just carried across a full page load (e.g. clicking
// "Catálogo"). Blur the outgoing page briefly before navigating; the
// incoming page un-blurs itself the same way on arrival, below. =====
function navigateWithBlur(url) {
  const pageWrap = document.querySelector(".page-wrap");
  if (!pageWrap || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.location.href = url;
    return;
  }
  pageWrap.classList.add("is-scrolling");
  // On mobile, use shorter delay to avoid feeling stuck
  const delay = window.matchMedia("(max-width: 600px)").matches ? 100 : 220;
  window.setTimeout(() => {
    window.location.href = url;
  }, delay);
}

// ===== Hero slider (autoplay, arrows, dots, swipe) =====
function setupHeroSlider() {
  const track = document.getElementById("hero-track");
  const dotsWrap = document.getElementById("hero-dots");
  if (!track || !dotsWrap) return;
  const slides = Array.from(track.children);
  let index = 0;
  let autoplayTimer;

  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.className = "hero-dot" + (i === 0 ? " active" : "");
    dot.setAttribute("aria-label", `Ir para slide ${i + 1}`);
    dot.addEventListener("click", () => goTo(i));
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  function syncVideos() {
    slides.forEach((s, si) => {
      const v = s.querySelector("video");
      if (!v) return;
      if (si === index) v.play().catch(() => {});
      else v.pause();
    });
  }

  // slides blur while they travel and sharpen as they land
  let moveTimer;
  function goTo(i) {
    index = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((d, di) => d.classList.toggle("active", di === index));
    track.classList.add("is-moving");
    clearTimeout(moveTimer);
    moveTimer = setTimeout(() => track.classList.remove("is-moving"), 380);
    syncVideos();
    restartAutoplay();
  }
  function next() { goTo(index + 1); }
  function prev() { goTo(index - 1); }
  function restartAutoplay() {
    clearInterval(autoplayTimer);
    autoplayTimer = setInterval(next, 5500);
  }

  document.getElementById("hero-next")?.addEventListener("click", next);
  document.getElementById("hero-prev")?.addEventListener("click", prev);

  const hero = document.getElementById("hero");
  hero?.addEventListener("mouseenter", () => clearInterval(autoplayTimer));
  hero?.addEventListener("mouseleave", restartAutoplay);

  // Drag that follows the finger (or mouse), then snaps. The track has
  // touch-action: pan-y, so vertical page scrolling still belongs to the browser.
  let dragStartX = 0, dragStartY = 0, dragDX = 0, dragging = false, dragMoved = false;
  track.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragging = true;
    dragMoved = false;
    dragDX = 0;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    clearInterval(autoplayTimer);
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    dragDX = e.clientX - dragStartX;
    if (!dragMoved) {
      if (Math.abs(dragDX) < 6) return;
      if (Math.abs(e.clientY - dragStartY) > Math.abs(dragDX)) {
        dragging = false;
        restartAutoplay();
        return;
      }
      dragMoved = true;
      track.classList.add("dragging");
    }
    const atEdge = (index === 0 && dragDX > 0) || (index === slides.length - 1 && dragDX < 0);
    const dx = atEdge ? dragDX * 0.35 : dragDX;
    track.style.transform = `translateX(calc(-${index * 100}% + ${dx}px))`;
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    track.classList.remove("dragging");
    if (!dragMoved) { restartAutoplay(); return; }
    const threshold = Math.min(80, track.clientWidth * 0.18);
    if (dragDX <= -threshold) next();
    else if (dragDX >= threshold) prev();
    else goTo(index);
  }
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
  // A drag that started on a CTA must not also count as a click on it.
  track.addEventListener("click", (e) => {
    if (dragMoved) {
      e.preventDefault();
      e.stopPropagation();
      dragMoved = false;
    }
  }, true);

  // first appearance of each hero video also comes in blurred and sharpens once it plays
  slides.forEach((s) => {
    const v = s.querySelector("video");
    if (!v) return;
    v.classList.add("blur-up");
    const sharpen = () => requestAnimationFrame(() => v.classList.add("is-loaded"));
    if (v.readyState >= 3) sharpen();
    else {
      v.addEventListener("playing", sharpen, { once: true });
      setTimeout(sharpen, 2500); // autoplay can be blocked — never leave it blurred
    }
  });

  syncVideos();
  restartAutoplay();
}

// ===== Reveal-on-scroll (fade + rise as sections enter the viewport) =====
function setupScrollReveal() {
  const targets = document.querySelectorAll("[data-reveal]");
  if (!targets.length) return;
  if (!("IntersectionObserver" in window)) {
    targets.forEach((t) => t.classList.add("revealed"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  targets.forEach((t) => observer.observe(t));
}

// ===== Carousel (scoped per-section so multiple carousels on one page work) =====
function setupCarouselNav(gridEl, navEl) {
  if (!gridEl || !navEl) return;
  const prevBtn = navEl.querySelector('[data-dir="prev"]');
  const nextBtn = navEl.querySelector('[data-dir="next"]');
  const step = () => {
    const card = gridEl.firstElementChild;
    const gap = parseFloat(getComputedStyle(gridEl).gap) || 18;
    return card ? card.getBoundingClientRect().width + gap : 250;
  };
  prevBtn?.addEventListener("click", () => gridEl.scrollBy({ left: -step(), behavior: "smooth" }));
  nextBtn?.addEventListener("click", () => gridEl.scrollBy({ left: step(), behavior: "smooth" }));
}

// ===== Init =====
document.addEventListener("DOMContentLoaded", () => {
  renderCart();
  wireCartDrawerEvents();

  document.getElementById("cart-fab")?.addEventListener("click", openDrawer);
  document.getElementById("cart-overlay")?.addEventListener("click", closeDrawer);
  document.querySelector(".drawer-close")?.addEventListener("click", closeDrawer);
  document.getElementById("send-order-btn")?.addEventListener("click", sendWhatsAppOrder);
  document.getElementById("quickview-overlay")?.addEventListener("click", (e) => {
    if (e.target.id === "quickview-overlay") closeQuickview();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeQuickview();
      closeDrawer();
    }
    if (qvGoTo && e.key === "ArrowLeft") qvGoTo(-1);
    if (qvGoTo && e.key === "ArrowRight") qvGoTo(1);
  });

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const target = document.getElementById(link.getAttribute("href").slice(1));
      if (!target) return;
      e.preventDefault();
      smoothScrollTo(target);
    });
  });

  // Same-site page links (Catálogo, hero "Ver catálogo", category tiles, footer, ...)
  // get the light blur transition instead of an abrupt jump.
  document.querySelectorAll('a[href$=".html"], a[href*=".html?"]').forEach((link) => {
    if (link.target === "_blank") return;
    link.addEventListener("click", (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      navigateWithBlur(link.getAttribute("href"));
    });
  });

  // Page arrives lightly blurred and settles in, mirroring the blur it left
  // the previous page with — reasserting scroll-to-top right before the
  // un-blur also guards against a late scroll-position restore.
  const pageWrap = document.querySelector(".page-wrap");
  if (pageWrap && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    pageWrap.classList.add("is-scrolling");
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      requestAnimationFrame(() => pageWrap.classList.remove("is-scrolling"));
    });
  }

  // Populate every carousel / grid marked with data-product-list on the page
  document.querySelectorAll("[data-product-list]").forEach((container) => {
    const filterFn = container.dataset.filter;
    let items = window.PRODUCTS || [];
    if (filterFn === "new") items = items.filter((p) => p.isNew);
    const limit = container.dataset.limit ? parseInt(container.dataset.limit, 10) : items.length;
    items.slice(0, limit).forEach((p) => container.appendChild(buildProductCard(p)));
  });

  document.querySelectorAll(".carousel-section").forEach((section) => {
    setupCarouselNav(section.querySelector(".carousel-grid"), section.querySelector(".carousel-nav"));
  });

  setupHeroSlider();
  setupScrollReveal();
  document.querySelectorAll(".hero-media img, .cat-tile img, .insta-grid img, .brand-collage img").forEach(observeBlurUp);

  // decorative videos play only while visible
  if ("IntersectionObserver" in window) {
    const playObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.play().catch(() => {});
        else entry.target.pause();
      });
    }, { threshold: 0.25 });
    document.querySelectorAll("video[data-inview-play]").forEach((v) => playObserver.observe(v));
  }

  // ===== Search toggle (nav lupa) =====
  const searchToggle = document.getElementById("search-toggle");
  const navSearch = document.getElementById("nav-search");
  const searchInput = document.getElementById("nav-search-input");
  const isCatalogPage = () => !!document.getElementById("catalog-grid");

  function runSearch() {
    const val = searchInput.value.trim();
    if (isCatalogPage()) {
      searchInput.dispatchEvent(new Event("input"));
    } else if (val) {
      window.location.href = `catalogo.html?q=${encodeURIComponent(val)}`;
    }
  }

  searchToggle?.addEventListener("click", () => {
    if (navSearch.classList.contains("open")) {
      if (searchInput.value.trim()) { runSearch(); return; }
      navSearch.classList.remove("open");
    } else {
      navSearch.classList.add("open");
      searchInput.focus();
    }
  });
  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); runSearch(); }
  });

  const qParam = new URLSearchParams(location.search).get("q");
  if (qParam && searchInput) {
    searchInput.value = qParam;
    navSearch.classList.add("open");
  }
});
