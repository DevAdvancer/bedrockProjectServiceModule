// CrepesALatte Service Studio — Chrome Extension Popup
// Ported from components/deal-service-dashboard.tsx (React → vanilla JS)

const API_BASE = "http://localhost:3000";
const SC = window.ServiceCatalog;

// ── State ──
let selectedDeal = null;
let services = [];
let isLoadingServices = false;
let isCreatingService = false;

// ── DOM refs ──
const $ = (s, el = document) => el.querySelector(s);
const searchInput = $("#search-input");
const searchForm = $("#search-form");
const searchDropdown = $("#search-dropdown");
const addServiceBtn = $("#add-service-btn");
const activeDealBadge = $("#active-deal-badge");
const dealNameDisplay = $("#deal-name-display");
const clearDealBtn = $("#clear-deal-btn");
const servicesContainer = $("#services-container");
const emptyState = $("#empty-state");
const emptyTitle = $("#empty-title");
const emptySubtitle = $("#empty-subtitle");
const panelNoteEl = $("#panel-note");

// ── Helpers ──
function uuid() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function fetchJson(url, init) {
  const res = await fetch(API_BASE + url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function setPanelNote(text) { panelNoteEl.textContent = text; }

function normalizeText(v) { return (v || "").trim(); }
function normalizeStringArray(arr) { return [...new Set(arr.map(v => normalizeText(v)).filter(Boolean))]; }

function buildServiceFinalValue(s) {
  const cat = normalizeText(s.category);
  const sub = normalizeText(s.subCategory);
  const base = normalizeText(s.baseServiceName);
  const flavors = normalizeStringArray(s.flavors);
  if (!cat || !sub || !base || flavors.length === 0) return "";
  return `${cat}_${sub}_${base}|${flavors.join(",")}`;
}

function resolveSingleValue(current, options) {
  if (options.length === 1) return options[0];
  return options.includes(current) ? current : "";
}

function resolveMultiValue(current, options) {
  return current.filter(v => options.includes(v));
}

function syncRowDerivedFields(s) {
  const enhOpts = SC.getEnhancementOptions(s.category, s.subCategory, s.universalPlatform, s.baseServiceName, s.flavors);
  const auiOpts = SC.getAuiOptions(s.category, s.subCategory, s.universalPlatform, s.baseServiceName, s.flavors);
  const mm1 = SC.getUpdatedMainMachineOptions(s.category, s.subCategory, s.universalPlatform, s.baseServiceName, s.flavors);
  const mm2 = SC.getUpdatedMachine2Options(s.category, s.subCategory, s.universalPlatform, s.baseServiceName, s.flavors);
  const mm3 = SC.getUpdatedMachine3Options(s.category, s.subCategory, s.universalPlatform, s.baseServiceName, s.flavors);
  return {
    ...s,
    serviceSpecificEnhancements: resolveMultiValue(s.serviceSpecificEnhancements, enhOpts),
    aui: resolveSingleValue(s.aui, auiOpts),
    updatedMainMachine: resolveSingleValue(s.updatedMainMachine, mm1),
    updatedMachine2: resolveSingleValue(s.updatedMachine2, mm2),
    updatedMachine3: resolveSingleValue(s.updatedMachine3, mm3),
  };
}

function createEmptyService(id, dealId) {
  return {
    id, dealId, category: "", subCategory: "", baseServiceName: "",
    flavors: [], serviceSpecificEnhancements: [],
    universalPlatform: "", aui: "", updatedMainMachine: "",
    updatedMachine2: "", updatedMachine3: "", price: 0,
    finalValue: "", dirty: true, saveState: "idle",
    note: "Complete the fields, add a price, and save.",
  };
}

function hydrateService(s, saveState = "idle", note = "") {
  return syncRowDerivedFields({
    ...s, finalValue: buildServiceFinalValue(s),
    dirty: false, saveState, note,
  });
}

function markDirty(s) {
  return { ...s, finalValue: buildServiceFinalValue(s), dirty: true,
    saveState: s.saveState === "saving" ? "saving" : "idle",
    note: "You have unsaved changes." };
}

function updateService(id, updater) {
  services = services.map(s => s.id === id ? updater(s) : s);
  renderServices();
}

// ── Deal selection ──
function selectDeal(deal) {
  selectedDeal = deal;
  dealNameDisplay.textContent = deal.name;
  activeDealBadge.classList.remove("hidden");
  addServiceBtn.disabled = false;
  loadServicesForDeal(deal);
}

function clearDeal() {
  selectedDeal = null;
  services = [];
  activeDealBadge.classList.add("hidden");
  addServiceBtn.disabled = true;
  setPanelNote("Pick a deal to get started.");
  renderServices();
}

async function loadServicesForDeal(deal) {
  isLoadingServices = true;
  services = [];
  setPanelNote(`Loading services for ${deal.name}...`);
  renderServices();

  try {
    const data = await fetchJson(`/api/deal-services?dealId=${encodeURIComponent(deal.id)}`);
    
    // Auto-correct the deal ID and Name if the backend resolved it!
    if (data.deal && (data.deal.id !== deal.id || data.deal.name !== deal.name)) {
      selectedDeal = data.deal;
      dealNameDisplay.textContent = `${data.deal.name} (${data.deal.id})`;
    } else if (data.deal) {
      dealNameDisplay.textContent = `${data.deal.name} (${data.deal.id})`;
    }

    services = data.services.map(s => hydrateService(s, "idle", "Loaded successfully."));
    setPanelNote(
      services.length > 0
        ? `${services.length} service(s) loaded for ${deal.name}.`
        : `No services yet for ${deal.name}. Add one to begin.`,
    );
  } catch (err) {
    setPanelNote(err.message || "Unable to load services.");
    services = [];
  } finally {
    isLoadingServices = false;
    renderServices();
  }
}

// ── Search ──
searchForm.addEventListener("submit", e => {
  e.preventDefault();
  const q = searchInput.value.trim();
  if (q.length > 0) {
    selectDeal({ id: q, name: q });
    searchInput.value = "";
    searchDropdown.classList.add("hidden");
  }
});

searchInput.addEventListener("paste", e => {
  const pasted = e.clipboardData.getData("Text").trim();
  // Only capture digits immediately following deals/ to avoid capturing /deals/view/ list IDs
  const idMatch = pasted.match(/(?:deals\/)(\d+)/);
  
  let finalId;
  if (idMatch) {
    finalId = idMatch[1];
  } else {
    // If it's an unrecognized URL, don't use it. Otherwise, use the pasted text (e.g. searching by name)
    if (pasted.startsWith("http://") || pasted.startsWith("https://")) {
      return; 
    }
    finalId = pasted;
  }

  if (finalId && finalId.length > 0) {
    searchInput.value = finalId;
    selectDeal({ id: finalId, name: finalId });
    setTimeout(() => { searchInput.value = ""; }, 100);
  }
});

document.addEventListener("click", e => {
  if (!searchForm.contains(e.target)) searchDropdown.classList.add("hidden");
});

// ── Add / Save / Delete ──
addServiceBtn.addEventListener("click", async () => {
  if (!selectedDeal || isCreatingService) return;
  isCreatingService = true;
  addServiceBtn.querySelector("span").textContent = "Adding…";

  try {
    const data = await fetchJson("/api/deal-services/id", { method: "POST" });
    services.push(createEmptyService(data.id, selectedDeal.id));
    setPanelNote(`New service added for ${selectedDeal.name}. Fill it out and save when ready.`);
    renderServices();
  } catch (err) {
    setPanelNote(err.message || "Unable to create a service block.");
  } finally {
    isCreatingService = false;
    addServiceBtn.querySelector("span").textContent = "Add service";
  }
});

clearDealBtn.addEventListener("click", clearDeal);

async function handleSaveService(serviceId) {
  const s = services.find(x => x.id === serviceId);
  if (!s) return;
  updateService(serviceId, c => ({ ...c, saveState: "saving", note: "Saving your service..." }));

  try {
    const payload = {
      id: s.id, dealId: selectedDeal?.id ?? s.dealId,
      category: s.category, subCategory: s.subCategory,
      baseServiceName: s.baseServiceName, flavors: s.flavors,
      serviceSpecificEnhancements: s.serviceSpecificEnhancements,
      universalPlatform: s.universalPlatform, aui: s.aui,
      updatedMainMachine: s.updatedMainMachine,
      updatedMachine2: s.updatedMachine2, updatedMachine3: s.updatedMachine3,
      price: s.price,
    };
    const hasBeenSaved = Boolean(s.createdAt);
    const url = hasBeenSaved
      ? `/api/deal-services/${encodeURIComponent(s.id)}`
      : "/api/deal-services";
    const method = hasBeenSaved ? "PUT" : "POST";
    const data = await fetchJson(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    services = services.map(x => x.id === serviceId ? hydrateService(data.service, "saved", "Saved successfully.") : x);
    setPanelNote(`Products updated for ${selectedDeal?.name ?? "this deal"}.`);
    renderServices();
  } catch (err) {
    updateService(serviceId, c => ({
      ...c, saveState: "error", note: err.message || "Unable to save this service.",
    }));
    setPanelNote(err.message || "Unable to save this service.");
  }
}

async function handleDeleteService(serviceId) {
  const s = services.find(x => x.id === serviceId);
  if (!s) return;
  if (!s.createdAt) {
    services = services.filter(x => x.id !== serviceId);
    setPanelNote("Draft service removed.");
    renderServices();
    return;
  }
  updateService(serviceId, c => ({ ...c, saveState: "saving", note: "Deleting service..." }));

  try {
    await fetchJson(`/api/deal-services/${encodeURIComponent(serviceId)}`, { method: "DELETE" });
    services = services.filter(x => x.id !== serviceId);
    setPanelNote("Service deleted successfully.");
    renderServices();
  } catch (err) {
    updateService(serviceId, c => ({
      ...c, saveState: "error", note: err.message || "Unable to delete this service.",
    }));
    setPanelNote(err.message || "Unable to delete this service.");
  }
}

// ── Field change handlers ──
function handleCategoryChange(id, value) {
  updateService(id, s => markDirty({
    ...s, category: value, subCategory: "", universalPlatform: "",
    baseServiceName: "", flavors: [], serviceSpecificEnhancements: [],
    aui: "", updatedMainMachine: "", updatedMachine2: "", updatedMachine3: "",
  }));
}

function handleSubCategoryChange(id, value) {
  updateService(id, s => markDirty({
    ...s, subCategory: value, universalPlatform: "",
    baseServiceName: "", flavors: [], serviceSpecificEnhancements: [],
    aui: "", updatedMainMachine: "", updatedMachine2: "", updatedMachine3: "",
  }));
}

function handleUniversalPlatformChange(id, value) {
  updateService(id, s => markDirty({
    ...s, universalPlatform: value,
    baseServiceName: "", flavors: [], serviceSpecificEnhancements: [],
    aui: "", updatedMainMachine: "", updatedMachine2: "", updatedMachine3: "",
  }));
}

function handleBaseServiceSelect(id, value) {
  const parsed = SC.parseBaseServiceSelectionKey(value);
  updateService(id, s => {
    if (!parsed) {
      return markDirty({
        ...s, category: "", subCategory: "", universalPlatform: "",
        baseServiceName: "", flavors: [], serviceSpecificEnhancements: [],
        aui: "", updatedMainMachine: "", updatedMachine2: "", updatedMachine3: "",
      });
    }
    return markDirty(syncRowDerivedFields({
      ...s, category: parsed.category, subCategory: parsed.subCategory,
      universalPlatform: parsed.universalPlatform,
      baseServiceName: parsed.baseServiceName,
      flavors: [], serviceSpecificEnhancements: [],
      aui: "", updatedMainMachine: "", updatedMachine2: "", updatedMachine3: "",
    }));
  });
}

function handleFlavorsChange(id, value) {
  updateService(id, s => markDirty(syncRowDerivedFields({
    ...s, flavors: value, serviceSpecificEnhancements: [],
    aui: "", updatedMainMachine: "", updatedMachine2: "", updatedMachine3: "",
  })));
}

function handleEnhancementsChange(id, value) {
  updateService(id, s => markDirty({ ...s, serviceSpecificEnhancements: value }));
}

function handleFieldChange(id, field, value) {
  if (field === "price") {
    const idx = services.findIndex(s => s.id === id);
    if (idx !== -1) {
      services[idx] = markDirty({ ...services[idx], [field]: value });
      
      const card = document.querySelector(`.service-card[data-service-id="${id}"]`);
      if (card) {
        const statusEl = card.querySelector(".card-status");
        if (statusEl) {
          statusEl.textContent = getStatusLabel(services[idx]);
          statusEl.className = "card-status " + getStatusClass(services[idx]);
        }
      }
    }
    return;
  }
  updateService(id, s => markDirty({ ...s, [field]: value }));
}

// ── Rendering ──
function renderServices() {
  // Remove all cards but keep empty state
  servicesContainer.querySelectorAll(".service-card, .loading-state").forEach(el => el.remove());

  if (isLoadingServices) {
    const tpl = $("#loading-template").content.cloneNode(true);
    servicesContainer.prepend(tpl);
    emptyState.classList.add("hidden");
    return;
  }

  if (services.length === 0) {
    emptyState.classList.remove("hidden");
    if (selectedDeal) {
      emptyTitle.textContent = "No services yet";
      emptySubtitle.textContent = 'Click "Add service" to create your first service for this deal.';
    } else {
      emptyTitle.textContent = "Select a deal to begin";
      emptySubtitle.textContent = "Use the search bar above to find and select a deal.";
    }
    return;
  }

  emptyState.classList.add("hidden");

  services.forEach((s, idx) => {
    const card = buildServiceCard(s, idx + 1);
    servicesContainer.insertBefore(card, emptyState);
  });
}

function getStatusClass(s) {
  if (s.saveState === "saved") return "status-saved";
  if (s.saveState === "saving") return "status-saving";
  if (s.saveState === "error") return "status-error";
  if (s.dirty) return "status-draft";
  return "status-idle";
}

function getStatusLabel(s) {
  if (s.saveState === "saved") return "Saved";
  if (s.saveState === "saving") return "Saving…";
  if (s.saveState === "error") return "Error";
  if (s.dirty) return "Draft";
  return "Idle";
}

function buildServiceCard(s, num) {
  const tpl = $("#service-card-template").content.cloneNode(true);
  const card = tpl.querySelector(".service-card");
  card.dataset.serviceId = s.id;

  $(".card-title", card).textContent = s.baseServiceName || `Service ${num}`;
  const statusEl = $(".card-status", card);
  statusEl.textContent = getStatusLabel(s);
  statusEl.className = "card-status " + getStatusClass(s);
  $(".card-note", card).textContent = s.note || "Configure settings for this service.";

  $(".btn-save", card).textContent = s.saveState === "saving" ? "Saving…" : "Save service";
  $(".btn-save", card).disabled = s.saveState === "saving";
  $(".btn-save", card).addEventListener("click", () => handleSaveService(s.id));
  $(".btn-delete", card).addEventListener("click", () => handleDeleteService(s.id));

  const grid = $(".form-grid", card);
  buildFormFields(grid, s, num);
  return card;
}

function buildFormFields(grid, s, num) {
  const baseKey = s.baseServiceName
    ? SC.buildBaseServiceSelectionKey(s.category, s.subCategory, s.universalPlatform, s.baseServiceName)
    : "";
  const baseOpts = SC.getBaseServiceSelectionOptions(s.category, s.subCategory, s.universalPlatform)
    .map(o => ({ value: o.key, label: o.label }));
  const subCatOpts = SC.getSubCategoryOptions(s.category).map(o => o.name);
  const platOpts = SC.getUniversalPlatformOptions(s.category, s.subCategory).map(o => o.name);
  const flavorOpts = SC.getFlavorOptions(s.category, s.subCategory, s.universalPlatform, s.baseServiceName);
  const enhOpts = SC.getEnhancementOptions(s.category, s.subCategory, s.universalPlatform, s.baseServiceName, s.flavors);
  const auiOpts = SC.getAuiOptions(s.category, s.subCategory, s.universalPlatform, s.baseServiceName, s.flavors);
  const mm1Opts = SC.getUpdatedMainMachineOptions(s.category, s.subCategory, s.universalPlatform, s.baseServiceName, s.flavors);
  const mm2Opts = SC.getUpdatedMachine2Options(s.category, s.subCategory, s.universalPlatform, s.baseServiceName, s.flavors);
  const mm3Opts = SC.getUpdatedMachine3Options(s.category, s.subCategory, s.universalPlatform, s.baseServiceName, s.flavors);
  const enhancementStepReady = s.flavors.length > 0;
  const auiStepReady = auiOpts.length === 0 || Boolean(s.aui);

  // Base Service Name
  grid.appendChild(createSelectField("Base Service Name", baseKey, baseOpts.map(o => ({ value: o.value, label: o.label })),
    "Select a base service", false, v => handleBaseServiceSelect(s.id, v)));

  // Category
  grid.appendChild(createSelectField("Category", s.category,
    SC.SERVICE_CATALOG.map(c => ({ value: c.name, label: c.name })),
    "Select a category", false, v => handleCategoryChange(s.id, v)));

  // Sub Category
  grid.appendChild(createSelectField("Sub Category", s.subCategory,
    subCatOpts.map(v => ({ value: v, label: v })),
    "Select a sub category", !s.category, v => handleSubCategoryChange(s.id, v)));

  // Universal Platform
  grid.appendChild(createSelectField("Universal Platform", s.universalPlatform,
    platOpts.map(v => ({ value: v, label: v })),
    "Select a universal platform", !s.subCategory, v => handleUniversalPlatformChange(s.id, v)));

  // Flavors
  if (s.baseServiceName) {
    grid.appendChild(createMultiSelectField("Flavors", s.flavors, flavorOpts,
      "Select one or more flavors", false, v => handleFlavorsChange(s.id, v)));
  }

  // Enhancements
  if (s.flavors.length > 0) {
    grid.appendChild(createMultiSelectField("Service-Specific Enhancements",
      s.serviceSpecificEnhancements, enhOpts,
      "Select enhancements", false, v => handleEnhancementsChange(s.id, v)));
  }

  // AUI
  if (enhancementStepReady) {
    grid.appendChild(createSelectField("AUI", s.aui,
      auiOpts.map(v => ({ value: v, label: v })),
      "Select an AUI value", false, v => handleFieldChange(s.id, "aui", v)));
  }

  // Updated Main Machine
  if (enhancementStepReady && auiStepReady) {
    grid.appendChild(createSelectField("Updated Main Machine", s.updatedMainMachine,
      mm1Opts.map(v => ({ value: v, label: v })),
      mm1Opts.length > 0 ? "Select a machine" : "No machine for this row", false,
      v => handleFieldChange(s.id, "updatedMainMachine", v)));
  }

  // Updated Machine 2
  if (enhancementStepReady && auiStepReady) {
    grid.appendChild(createSelectField("Updated Machine 2", s.updatedMachine2,
      mm2Opts.map(v => ({ value: v, label: v })),
      mm2Opts.length > 0 ? "Select a machine" : "No machine for this row", false,
      v => handleFieldChange(s.id, "updatedMachine2", v)));
  }

  // Updated Machine 3
  if (enhancementStepReady && auiStepReady) {
    grid.appendChild(createSelectField("Updated Machine 3", s.updatedMachine3,
      mm3Opts.map(v => ({ value: v, label: v })),
      mm3Opts.length > 0 ? "Select a machine" : "No machine for this row", false,
      v => handleFieldChange(s.id, "updatedMachine3", v)));
  }

  // Price
  grid.appendChild(createNumberField("Price (USD)", s.price, "0.00", false,
    v => handleFieldChange(s.id, "price", v)));
}

// ── Reusable Field Builders ──
function createSelectField(label, value, options, placeholder, disabled, onChange) {
  const group = document.createElement("div");
  group.className = "field-group";

  const lbl = document.createElement("span");
  lbl.className = "field-label";
  lbl.textContent = label;
  group.appendChild(lbl);

  const wrap = document.createElement("div");
  wrap.className = "select-field";

  const inputWrap = document.createElement("div");
  inputWrap.className = "select-field-input-wrap";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = placeholder;
  input.disabled = disabled;
  const selectedOpt = options.find(o => o.value === value);
  input.value = selectedOpt ? selectedOpt.label : "";
  let searchTerm = null;

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "toggle-btn";
  toggleBtn.disabled = disabled;
  toggleBtn.innerHTML = `<svg viewBox="0 0 20 20" fill="none" width="14" height="14"><path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const dropdown = document.createElement("div");
  dropdown.className = "select-dropdown hidden";

  function renderDropdown() {
    dropdown.innerHTML = "";
    const term = (searchTerm ?? "").trim().toLowerCase();
    const filtered = term.length === 0
      ? options
      : options.filter(o => o.label.toLowerCase().includes(term));

    if (value) {
      const clr = document.createElement("button");
      clr.type = "button";
      clr.className = "clear-btn";
      clr.textContent = "Clear selection";
      clr.addEventListener("click", () => { onChange(""); close(); });
      dropdown.appendChild(clr);
    }

    if (filtered.length > 0) {
      filtered.forEach(o => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = o.label;
        if (o.value === value) btn.classList.add("selected");
        btn.addEventListener("click", () => { onChange(o.value); close(); });
        dropdown.appendChild(btn);
      });
    } else {
      const p = document.createElement("p");
      p.className = "no-match";
      p.textContent = "No matches found.";
      dropdown.appendChild(p);
    }
  }

  function open() {
    if (disabled) return;
    dropdown.classList.remove("hidden");
    toggleBtn.classList.add("open");
    renderDropdown();
  }

  function close() {
    dropdown.classList.add("hidden");
    toggleBtn.classList.remove("open");
    searchTerm = null;
    input.value = selectedOpt ? selectedOpt.label : "";
  }

  input.addEventListener("focus", open);
  input.addEventListener("input", () => { searchTerm = input.value; open(); });
  input.addEventListener("keydown", e => {
    if (e.key === "Escape") { close(); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      const term = (searchTerm ?? "").trim().toLowerCase();
      const filtered = term.length === 0
        ? options
        : options.filter(o => o.label.toLowerCase().includes(term));
      if (filtered.length > 0) { onChange(filtered[0].value); close(); }
    }
  });
  toggleBtn.addEventListener("click", () => {
    if (dropdown.classList.contains("hidden")) open(); else close();
  });

  document.addEventListener("click", e => {
    if (!wrap.contains(e.target)) close();
  });

  inputWrap.appendChild(input);
  inputWrap.appendChild(toggleBtn);
  wrap.appendChild(inputWrap);
  wrap.appendChild(dropdown);
  group.appendChild(wrap);
  return group;
}

function createMultiSelectField(label, value, options, placeholder, disabled, onChange) {
  const group = document.createElement("div");
  group.className = "field-group";

  const lbl = document.createElement("span");
  lbl.className = "field-label";
  lbl.textContent = label;
  group.appendChild(lbl);

  const wrap = document.createElement("div");
  wrap.className = "multi-select";

  const details = document.createElement("details");
  const summary = document.createElement("summary");
  if (disabled) summary.classList.add("disabled");
  summary.textContent = value.length > 0 ? `${value.length} selected` : placeholder;
  details.appendChild(summary);

  const listDiv = document.createElement("div");
  listDiv.className = "options-list";

  let filterTerm = "";

  function renderList() {
    listDiv.innerHTML = "";
    if (options.length > 5) {
      const si = document.createElement("input");
      si.type = "text";
      si.className = "search-input";
      si.placeholder = "Search options...";
      si.value = filterTerm;
      si.addEventListener("input", () => { filterTerm = si.value; renderList(); });
      listDiv.appendChild(si);
    }

    const term = filterTerm.trim().toLowerCase();
    const filtered = term.length === 0
      ? options
      : options.filter(o => o.toLowerCase().includes(term));

    if (options.length === 0) {
      const p = document.createElement("p");
      p.className = "no-options";
      p.textContent = "No options available yet.";
      listDiv.appendChild(p);
    } else if (filtered.length > 0) {
      filtered.forEach(opt => {
        const lbl = document.createElement("label");
        const span = document.createElement("span");
        span.textContent = opt;
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = value.includes(opt);
        cb.disabled = disabled;
        cb.addEventListener("change", () => {
          const newVal = cb.checked ? [...value, opt] : value.filter(v => v !== opt);
          onChange(newVal);
        });
        lbl.appendChild(span);
        lbl.appendChild(cb);
        listDiv.appendChild(lbl);
      });
    } else {
      const p = document.createElement("p");
      p.className = "no-options";
      p.textContent = "No matches found.";
      listDiv.appendChild(p);
    }
  }

  renderList();
  details.appendChild(listDiv);
  wrap.appendChild(details);

  // Tags
  if (value.length > 0) {
    const tags = document.createElement("div");
    tags.className = "selected-tags";
    value.forEach(v => {
      const tag = document.createElement("span");
      tag.textContent = v;
      tags.appendChild(tag);
    });
    wrap.appendChild(tags);
  }

  group.appendChild(wrap);
  return group;
}

function createNumberField(label, value, placeholder, disabled, onChange) {
  const group = document.createElement("div");
  group.className = "field-group";

  const lbl = document.createElement("span");
  lbl.className = "field-label";
  lbl.textContent = label;
  group.appendChild(lbl);

  const wrap = document.createElement("div");
  wrap.className = "number-field-wrap";

  const currency = document.createElement("span");
  currency.className = "currency";
  currency.textContent = "$";

  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.step = "0.01";
  input.value = value ?? "";
  input.placeholder = placeholder;
  input.disabled = disabled;
  input.addEventListener("input", () => {
    const v = input.value.trim();
    onChange(v ? Number(v) : null);
  });

  wrap.appendChild(currency);
  wrap.appendChild(input);
  group.appendChild(wrap);
  return group;
}

// ── Initial Render ──
renderServices();

// ── Sidebar Auto-Loader and Mode Logic ──
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("sidebar") === "true") {
  document.documentElement.classList.add("sidebar-mode");
  document.body.classList.add("sidebar-mode");
  
  const closeBtn = document.getElementById("close-sidebar-btn");
  if (closeBtn) {
    closeBtn.classList.remove("hidden");
    closeBtn.addEventListener("click", () => {
      window.parent.postMessage({ type: "CREPESALATTE_CLOSE_SIDEBAR" }, "*");
    });
  }
}

const autoDealId = urlParams.get("dealId");
if (autoDealId) {
  searchInput.value = autoDealId;
  selectDeal({ id: autoDealId, name: autoDealId });
  setTimeout(() => { searchInput.value = ""; }, 100);
}
