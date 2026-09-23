// Filtro + ordenação da página de catálogo. Roda depois de products.js e main.js.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("catalog-grid");
  if (!grid) return; // não é a página de catálogo
  window.scrollTo(0, 0);

  const resultCount = document.getElementById("result-count");
  const sortSelect = document.getElementById("sort-select");
  const catChecks = () => Array.from(document.querySelectorAll(".cat-filter:checked")).map((c) => c.value);
  const colorSwatches = document.querySelectorAll(".color-swatch[data-color]");
  let activeColors = [];
  const newOnly = document.getElementById("filter-new-only");
  const searchInput = document.getElementById("nav-search-input");
  const filtersToggle = document.getElementById("filters-toggle");
  const filtersBody = document.getElementById("filters-body");
  const filtersCount = document.getElementById("filters-count");

  filtersToggle?.addEventListener("click", () => {
    const open = filtersBody.classList.toggle("open");
    filtersToggle.setAttribute("aria-expanded", String(open));
  });

  // pré-seleciona categoria via ?cat= na URL (usado pelos tiles da home)
  const params = new URLSearchParams(location.search);
  const catParam = params.get("cat");
  if (catParam) {
    document.querySelectorAll(".cat-filter").forEach((c) => {
      c.checked = c.value === catParam;
    });
  }

  searchInput?.addEventListener("input", render);

  colorSwatches.forEach((sw) => {
    sw.addEventListener("click", () => {
      const color = sw.dataset.color;
      sw.classList.toggle("selected");
      activeColors = Array.from(colorSwatches)
        .filter((s) => s.classList.contains("selected"))
        .map((s) => s.dataset.color);
      render();
    });
  });

  document.querySelectorAll(".cat-filter").forEach((c) => c.addEventListener("change", render));
  newOnly?.addEventListener("change", render);
  sortSelect?.addEventListener("change", render);
  document.getElementById("filter-reset")?.addEventListener("click", () => {
    document.querySelectorAll(".cat-filter").forEach((c) => (c.checked = false));
    colorSwatches.forEach((s) => s.classList.remove("selected"));
    activeColors = [];
    if (newOnly) newOnly.checked = false;
    if (sortSelect) sortSelect.value = "relevancia";
    render();
  });

  function render() {
    let items = [...window.PRODUCTS];
    const cats = catChecks();
    if (cats.length) items = items.filter((p) => cats.includes(p.category));
    if (activeColors.length) items = items.filter((p) => p.colors.some((c) => activeColors.includes(c)));
    if (newOnly?.checked) items = items.filter((p) => p.isNew);
    const q = searchInput?.value.trim().toLowerCase();
    if (q) items = items.filter((p) => p.name.toLowerCase().includes(q) || p.categoryLabel.toLowerCase().includes(q));

    const sort = sortSelect?.value || "relevancia";
    if (sort === "novidades") items.sort((a, b) => (b.isNew === true) - (a.isNew === true));
    if (sort === "nome-az") items.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "nome-za") items.sort((a, b) => b.name.localeCompare(a.name));

    grid.innerHTML = "";
    if (items.length === 0) {
      grid.innerHTML = '<p class="empty-state">Nenhuma peça encontrada com esses filtros.<br>Tente remover algum filtro.</p>';
    } else {
      items.forEach((p) => grid.appendChild(buildProductCard(p)));
    }
    if (resultCount) resultCount.textContent = `${items.length} peça${items.length !== 1 ? "s" : ""}`;

    if (filtersCount) {
      const activeCount = cats.length + activeColors.length + (newOnly?.checked ? 1 : 0);
      filtersCount.textContent = ` (${activeCount})`;
      filtersCount.hidden = activeCount === 0;
    }
  }

  render();

  // Force scroll-to-top multiple times and monitor for unwanted scrolls
  window.scrollTo(0, 0);
  setTimeout(() => window.scrollTo(0, 0), 0);
  setTimeout(() => window.scrollTo(0, 0), 50);
  setTimeout(() => window.scrollTo(0, 0), 150);

  // If scroll moves after render, force it back for 500ms only (was too long)
  let scrollCheckCount = 0;
  const monitor = setInterval(() => {
    if (window.scrollY > 10) window.scrollTo(0, 0);
    if (++scrollCheckCount > 5) clearInterval(monitor);
  }, 100);
});
