// CrepesALatte Service Studio — Chrome Extension Popup
// Ported from components/deal-service-dashboard.tsx (React → vanilla JS)

const API_BASE = "https://bedrock-project-service-module.vercel.app"
const SC = window.ServiceCatalog;
const ADMIN_ID = "admin";
const ADMIN_PASSWORD = "CAL2026!";
const CUSTOM_CATEGORY_VALUE = "__custom__";
let isCatalogReady = false;

// ── State ──
let serviceMaps = [];
let selectedDeal = null;
let services = [];
let isLoadingServices = false;
let isCreatingService = false;
let isSettingsOpen = false;
let isSettingsAuthenticated = false;
let isSettingsLoading = false;
let settingsBusyMapId = null;
let isSettingsCreateOpen = false;
let isSettingsCreateSubmitting = false;
let settingsEditingMapId = null;

// ── DOM refs ──
const $ = (s, el = document) => el.querySelector(s);
const addServiceBtn = $("#add-service-btn");
const navDealStatus = $("#nav-deal-status");
const navDealSignal = $("#nav-deal-signal");
const navDealTitle = $("#nav-deal-title");
const navDealMeta = $("#nav-deal-meta");
const servicesContainer = $("#services-container");
const emptyState = $("#empty-state");
const emptyTitle = $("#empty-title");
const emptySubtitle = $("#empty-subtitle");
const panelNoteEl = $("#panel-note");
const openSettingsBtn = $("#open-settings-btn");
const settingsOverlay = $("#settings-overlay");
const closeSettingsBtn = $("#close-settings-btn");
const settingsAuthView = $("#settings-auth-view");
const settingsManagerView = $("#settings-manager-view");
const settingsAuthForm = $("#settings-auth-form");
const settingsAdminIdInput = $("#settings-admin-id");
const settingsAdminPasswordInput = $("#settings-admin-password");
const settingsAuthNote = $("#settings-auth-note");
const settingsSearchInput = $("#settings-search-input");
const settingsNoteEl = $("#settings-note");
const settingsListEl = $("#settings-list");
const settingsTotalCountEl = $("#settings-total-count");
const settingsActiveCountEl = $("#settings-active-count");
const settingsInactiveCountEl = $("#settings-inactive-count");
const settingsNewRowBtn = $("#settings-new-row-btn");
const settingsCreateForm = $("#settings-create-form");
const settingsCreateCancelBtn = $("#settings-create-cancel-btn");
const settingsCreateResetBtn = $("#settings-create-reset-btn");
const settingsCreateSubmitBtn = $("#settings-create-submit-btn");
const settingsCreateSortOrderInput = $("#settings-create-sort-order");
const settingsCreateStatusInput = $("#settings-create-status");
const settingsCreateServiceOrderIdInput = $("#settings-create-service-order-id");
const settingsCreateCategoryInput = $("#settings-create-category");
const settingsCreateSubCategoryInput = $("#settings-create-sub-category");
const settingsCreateUniversalPlatformInput = $("#settings-create-universal-platform");
const settingsCreateBaseServiceNameInput = $("#settings-create-base-service-name");
const settingsCreateItemTypeInput = $("#settings-create-item-type");
const settingsCreateFlavorEnhancementItemInput = $("#settings-create-flavor-enhancement-item");
const settingsCreateFlavorsInput = $("#settings-create-flavors");
const settingsCreateEnhancementsInput = $("#settings-create-enhancements");
const settingsCreateAuiInput = $("#settings-create-aui");
const settingsCreateGroceryYnInput = $("#settings-create-grocery-yn");
const settingsCreateGroceryNeedsInput = $("#settings-create-grocery-needs");
const settingsCreateKitchenPrepNeededYnInput = $("#settings-create-kitchen-prep-needed-yn");
const settingsCreateKitchenPrepItemsInput = $("#settings-create-kitchen-prep-items");
const settingsCreateCarryThroughYnInput = $("#settings-create-carry-through-yn");
const settingsCreateCarryThroughItemsInput = $("#settings-create-carry-through-items");
const settingsCreateOrderItemsFromCcInput = $("#settings-create-order-items-from-cc");
const settingsCreateCcItemsInput = $("#settings-create-cc-items");
const settingsCreateMainMachineInput = $("#settings-create-main-machine");
const settingsCreateMachine2Input = $("#settings-create-machine-2");
const settingsCreateMachine3Input = $("#settings-create-machine-3");
const settingsCreateStrategicAttributesInput = $("#settings-create-strategic-attributes");
const settingsCreateExclusivityKeysInput = $("#settings-create-exclusivity-keys");
const settingsCreateStaffInput = $("#settings-create-staff");
const settingsCreatePreSupplyTierInput = $("#settings-create-pre-supply-tier");
const settingsCreateTwoDayPriceInput = $("#settings-create-two-day-price");
const settingsCreateThreeDayPriceInput = $("#settings-create-three-day-price");
const settingsCreateFourDayPriceInput = $("#settings-create-four-day-price");
const settingsCreateNotesInput = $("#settings-create-notes");
const settingsCreateSourceRowNumberInput = $("#settings-create-source-row-number");
const settingsCreateActiveInput = $("#settings-create-active");

// ── Helpers ──
async function fetchJson(url, init) {
  const res = await fetch(API_BASE + url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function setPanelNote(text) { panelNoteEl.textContent = text; }
function setSettingsAuthNote(text, tone = "info") {
  settingsAuthNote.textContent = text;
  if (tone === "info") {
    delete settingsAuthNote.dataset.tone;
    return;
  }
  settingsAuthNote.dataset.tone = tone;
}
function setSettingsNote(text, tone = "info") {
  settingsNoteEl.textContent = text;
  if (tone === "info") {
    delete settingsNoteEl.dataset.tone;
    return;
  }
  settingsNoteEl.dataset.tone = tone;
}

function normalizeText(v) { return (v || "").trim(); }
function normalizeStringArray(arr) { return [...new Set(arr.map(v => normalizeText(v)).filter(Boolean))]; }
function parseCommaSeparatedInput(value) {
  return normalizeStringArray(String(value ?? "").split(","));
}
function isServiceCustomEntry(service) {
  if (service?.isCustomEntry) return true;

  const category = normalizeText(service?.category);
  const subCategory = normalizeText(service?.subCategory);
  const baseServiceName = normalizeText(service?.baseServiceName);

  if (!category) return false;
  if (!SC.SERVICE_CATALOG.some(item => item.name === category)) return true;
  if (!subCategory || !baseServiceName) return false;

  return !SC.getBaseServiceSelectionOptions(category, subCategory)
    .some(option => option.baseServiceName === baseServiceName);
}
function sortServiceMaps(maps) {
  return [...maps].sort((left, right) => {
    if (left.isActive !== right.isActive) {
      return left.isActive ? -1 : 1;
    }
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }
    return `${left.category}-${left.baseServiceName}`.localeCompare(
      `${right.category}-${right.baseServiceName}`,
    );
  });
}
function applyServiceMaps(nextMaps) {
  serviceMaps = sortServiceMaps(Array.isArray(nextMaps) ? nextMaps : []);
  SC.setRows(serviceMaps);
}
function buildAdminHeaders(extraHeaders = {}) {
  const adminId = normalizeText(settingsAdminIdInput?.value);
  const adminPassword = settingsAdminPasswordInput?.value ?? "";
  return {
    ...extraHeaders,
    Authorization: `Basic ${btoa(`${adminId}:${adminPassword}`)}`,
  };
}
function syncSelectedDealUI() {
  const hasSelectedDeal = Boolean(selectedDeal);
  document.body.classList.toggle("has-selected-deal", hasSelectedDeal);
  navDealStatus.classList.toggle("is-selected", hasSelectedDeal);
  navDealStatus.classList.toggle("is-empty", !hasSelectedDeal);
  navDealSignal.classList.toggle("is-active", hasSelectedDeal);
  navDealSignal.classList.toggle("is-inactive", !hasSelectedDeal);

  if (!hasSelectedDeal) {
    navDealTitle.textContent = "No deal selected";
    navDealMeta.textContent = "Open this from a Freshsales deal page.";
    return;
  }

  const hasResolvedName =
    Boolean(selectedDeal.name) &&
    Boolean(selectedDeal.id) &&
    selectedDeal.name !== selectedDeal.id;
  navDealTitle.textContent = selectedDeal.name || selectedDeal.id;
  navDealMeta.textContent = hasResolvedName
    ? `Deal ID ${selectedDeal.id}`
    : selectedDeal.id
      ? "Resolving deal details..."
      : "Ready for service changes.";
}
function refreshServicesFromCatalog() {
  services = services.map(service => syncRowDerivedFields(service));
  renderServices();
}
function getNextServiceMapSortOrder() {
  const highestSortOrder = serviceMaps.reduce(
    (highest, map) => Math.max(highest, Number(map.sortOrder) || 0),
    0,
  );
  return String(highestSortOrder + 1 || 1);
}
function resetSettingsCreateForm() {
  settingsCreateForm.reset();
  settingsCreateSortOrderInput.value = getNextServiceMapSortOrder();
  settingsCreateSourceRowNumberInput.value = settingsCreateSortOrderInput.value;
  settingsCreateActiveInput.checked = true;
  settingsEditingMapId = null;
}
function syncSettingsCreateUI() {
  settingsCreateForm.classList.toggle("hidden", !isSettingsCreateOpen);
  settingsNewRowBtn.querySelector("span").textContent = isSettingsCreateOpen
    ? "Hide new row form"
    : "Add new row";
  settingsNewRowBtn.disabled = isSettingsCreateSubmitting;
  settingsCreateCancelBtn.disabled = isSettingsCreateSubmitting;
  settingsCreateResetBtn.disabled = isSettingsCreateSubmitting;
  settingsCreateSubmitBtn.disabled = isSettingsCreateSubmitting;
  settingsCreateSubmitBtn.textContent = isSettingsCreateSubmitting
    ? settingsEditingMapId
      ? "Updating..."
      : "Creating..."
    : settingsEditingMapId
      ? "Update row"
      : "Create row";
}
function openSettingsCreateForm() {
  isSettingsCreateOpen = true;
  resetSettingsCreateForm();
  syncSettingsCreateUI();
}
function openSettingsEditForm(map) {
  settingsEditingMapId = map.id || null;
  isSettingsCreateOpen = true;
  settingsCreateSortOrderInput.value = map.sortOrder || "";
  settingsCreateStatusInput.value = map.status || "";
  settingsCreateServiceOrderIdInput.value = map.serviceOrderId || "";
  settingsCreateCategoryInput.value = map.category || "";
  settingsCreateSubCategoryInput.value = map.subCategory || "";
  settingsCreateUniversalPlatformInput.value = map.universalPlatform || "";
  settingsCreateBaseServiceNameInput.value = map.baseServiceName || "";
  settingsCreateItemTypeInput.value = map.itemType || "";
  settingsCreateFlavorEnhancementItemInput.value = map.flavorEnhancementItem || "";
  settingsCreateFlavorsInput.value = (map.flavors || []).join(", ");
  settingsCreateEnhancementsInput.value = (map.serviceSpecificEnhancements || []).join(", ");
  settingsCreateAuiInput.value = (map.aui || []).join(", ");
  settingsCreateGroceryYnInput.value = map.groceryYN || "";
  settingsCreateGroceryNeedsInput.value = map.groceryNeeds || "";
  settingsCreateKitchenPrepNeededYnInput.value = map.kitchenPrepNeededYN || "";
  settingsCreateKitchenPrepItemsInput.value = map.kitchenPrepItems || "";
  settingsCreateCarryThroughYnInput.value = map.carryThroughYN || "";
  settingsCreateCarryThroughItemsInput.value = map.carryThroughItems || "";
  settingsCreateOrderItemsFromCcInput.value = map.orderItemsFromCC || "";
  settingsCreateCcItemsInput.value = map.ccItems || "";
  settingsCreateMainMachineInput.value = (map.updatedMainMachine || []).join(", ");
  settingsCreateMachine2Input.value = (map.updatedMachine2 || []).join(", ");
  settingsCreateMachine3Input.value = (map.updatedMachine3 || []).join(", ");
  settingsCreateStrategicAttributesInput.value = map.strategicAttributes || "";
  settingsCreateExclusivityKeysInput.value = map.exclusivityKeys || "";
  settingsCreateStaffInput.value = map.staff || "";
  settingsCreatePreSupplyTierInput.value = map.preSupplyTier || "";
  settingsCreateTwoDayPriceInput.value = map.twoDayPrice || "";
  settingsCreateThreeDayPriceInput.value = map.threeDayPrice || "";
  settingsCreateFourDayPriceInput.value = map.fourDayPrice || "";
  settingsCreateNotesInput.value = map.notes || "";
  settingsCreateSourceRowNumberInput.value = map.sourceRowNumber || map.sortOrder || "";
  settingsCreateActiveInput.checked = map.isActive !== false;
  setSettingsNote(`Editing "${map.baseServiceName}".`);
  syncSettingsCreateUI();
}
function closeSettingsCreateForm() {
  isSettingsCreateOpen = false;
  settingsEditingMapId = null;
  syncSettingsCreateUI();
}
function readSettingsCreatePayload() {
  return {
    sortOrder: normalizeText(settingsCreateSortOrderInput.value),
    isActive: settingsCreateActiveInput.checked,
    status: normalizeText(settingsCreateStatusInput.value),
    serviceOrderId: normalizeText(settingsCreateServiceOrderIdInput.value),
    category: normalizeText(settingsCreateCategoryInput.value),
    subCategory: normalizeText(settingsCreateSubCategoryInput.value),
    universalPlatform: normalizeText(settingsCreateUniversalPlatformInput.value),
    baseServiceName: normalizeText(settingsCreateBaseServiceNameInput.value),
    itemType: normalizeText(settingsCreateItemTypeInput.value),
    flavorEnhancementItem: normalizeText(settingsCreateFlavorEnhancementItemInput.value),
    flavors: settingsCreateFlavorsInput.value,
    serviceSpecificEnhancements: settingsCreateEnhancementsInput.value,
    aui: settingsCreateAuiInput.value,
    groceryYN: normalizeText(settingsCreateGroceryYnInput.value),
    groceryNeeds: normalizeText(settingsCreateGroceryNeedsInput.value),
    kitchenPrepNeededYN: normalizeText(settingsCreateKitchenPrepNeededYnInput.value),
    kitchenPrepItems: normalizeText(settingsCreateKitchenPrepItemsInput.value),
    carryThroughYN: normalizeText(settingsCreateCarryThroughYnInput.value),
    carryThroughItems: normalizeText(settingsCreateCarryThroughItemsInput.value),
    orderItemsFromCC: normalizeText(settingsCreateOrderItemsFromCcInput.value),
    ccItems: normalizeText(settingsCreateCcItemsInput.value),
    updatedMainMachine: settingsCreateMainMachineInput.value,
    updatedMachine2: settingsCreateMachine2Input.value,
    updatedMachine3: settingsCreateMachine3Input.value,
    strategicAttributes: normalizeText(settingsCreateStrategicAttributesInput.value),
    exclusivityKeys: normalizeText(settingsCreateExclusivityKeysInput.value),
    staff: normalizeText(settingsCreateStaffInput.value),
    preSupplyTier: normalizeText(settingsCreatePreSupplyTierInput.value),
    twoDayPrice: normalizeText(settingsCreateTwoDayPriceInput.value),
    threeDayPrice: normalizeText(settingsCreateThreeDayPriceInput.value),
    fourDayPrice: normalizeText(settingsCreateFourDayPriceInput.value),
    notes: normalizeText(settingsCreateNotesInput.value),
    sourceRowNumber: normalizeText(settingsCreateSourceRowNumberInput.value || settingsCreateSortOrderInput.value),
  };
}

async function loadCatalogMappings() {
  const data = await fetchJson("/api/service-maps?includeInactive=true");
  applyServiceMaps(data.maps || []);
  isCatalogReady = true;
  return serviceMaps;
}

function buildServiceFinalValue(s) {
  const cat = normalizeText(s.category);
  const sub = normalizeText(s.subCategory);
  const base = normalizeText(s.baseServiceName);
  const flavors = normalizeStringArray(s.flavors);
  const enhancements = normalizeStringArray(s.serviceSpecificEnhancements || []);
  const selectedItems = flavors.length > 0 ? flavors : enhancements;
  if (!cat || !sub || !base || selectedItems.length === 0) return "";
  return `${cat}_${sub}_${base}|${selectedItems.join(",")}`;
}

function getFlavorEnhancementOptions(service) {
  if (!service.baseServiceName) return [];

  const flavorOptions = SC.getFlavorOptions(
    service.category,
    service.subCategory,
    service.universalPlatform,
    service.baseServiceName,
  );
  const enhancementOptions = SC.getEnhancementOptions(
    service.category,
    service.subCategory,
    service.universalPlatform,
    service.baseServiceName,
    [],
  ).filter(value => value !== "None");

  return [...new Set([...flavorOptions, ...enhancementOptions])];
}

function getSelectedFlavorEnhancementValues(service) {
  return normalizeStringArray([
    ...service.flavors,
    ...service.serviceSpecificEnhancements,
  ]);
}

function resolveSingleValue(current, options) {
  if (options.length === 1) return options[0];
  return options.includes(current) ? current : "";
}

function resolveMultiValue(current, options) {
  return current.filter(v => options.includes(v));
}

function syncRowDerivedFields(s) {
  if (isServiceCustomEntry(s)) {
    return {
      ...s,
      isCustomEntry: true,
      flavors: normalizeStringArray(s.flavors || []),
      serviceSpecificEnhancements: normalizeStringArray(s.serviceSpecificEnhancements || []),
      aui: "",
      updatedMainMachine: "",
      updatedMachine2: "",
      updatedMachine3: "",
    };
  }

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
    isCustomEntry: false,
    finalValue: "", dirty: true, saveState: "idle",
    note: "Complete the fields, add a price, and save.",
  };
}

function hydrateService(s, saveState = "idle", note = "") {
  return syncRowDerivedFields({
    ...s,
    isCustomEntry: isServiceCustomEntry(s),
    finalValue: buildServiceFinalValue(s),
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

function createServiceMapPayload(map, isActiveOverride = map.isActive) {
  return {
    sortOrder: String(map.sortOrder),
    isActive: isActiveOverride,
    status: map.status,
    serviceOrderId: map.serviceOrderId,
    category: map.category,
    subCategory: map.subCategory,
    universalPlatform: map.universalPlatform,
    baseServiceName: map.baseServiceName,
    itemType: map.itemType,
    flavorEnhancementItem: map.flavorEnhancementItem,
    flavors: map.flavors,
    serviceSpecificEnhancements: map.serviceSpecificEnhancements,
    aui: map.aui,
    groceryYN: map.groceryYN,
    groceryNeeds: map.groceryNeeds,
    kitchenPrepNeededYN: map.kitchenPrepNeededYN,
    kitchenPrepItems: map.kitchenPrepItems,
    carryThroughYN: map.carryThroughYN,
    carryThroughItems: map.carryThroughItems,
    orderItemsFromCC: map.orderItemsFromCC,
    ccItems: map.ccItems,
    updatedMainMachine: map.updatedMainMachine,
    updatedMachine2: map.updatedMachine2,
    updatedMachine3: map.updatedMachine3,
    strategicAttributes: map.strategicAttributes,
    exclusivityKeys: map.exclusivityKeys,
    staff: map.staff,
    preSupplyTier: map.preSupplyTier,
    twoDayPrice: map.twoDayPrice,
    threeDayPrice: map.threeDayPrice,
    fourDayPrice: map.fourDayPrice,
    notes: map.notes,
    sourceRowNumber: map.sourceRowNumber || map.sortOrder,
  };
}

function getFilteredServiceMaps() {
  const query = normalizeText(settingsSearchInput.value).toLowerCase();
  if (!query) return serviceMaps;

  return serviceMaps.filter(map =>
    [
      map.category,
      map.subCategory,
      map.universalPlatform,
      map.baseServiceName,
      map.serviceOrderId,
      ...(map.flavors || []),
      ...(map.serviceSpecificEnhancements || []),
      map.isActive ? "active" : "inactive",
    ]
      .join(" ")
      .toLowerCase()
      .includes(query),
  );
}

function renderSettingsList() {
  const activeCount = serviceMaps.filter(map => map.isActive).length;
  const inactiveCount = serviceMaps.length - activeCount;
  settingsTotalCountEl.textContent = `${serviceMaps.length} rows`;
  settingsActiveCountEl.textContent = `${activeCount} active`;
  settingsInactiveCountEl.textContent = `${inactiveCount} inactive`;
  settingsListEl.innerHTML = "";

  if (isSettingsLoading) {
    const loading = document.createElement("div");
    loading.className = "settings-empty animate-shimmer";
    loading.textContent = "Loading service availability...";
    settingsListEl.appendChild(loading);
    return;
  }

  const filteredMaps = getFilteredServiceMaps();
  if (filteredMaps.length === 0) {
    const empty = document.createElement("div");
    empty.className = "settings-empty";
    empty.textContent = serviceMaps.length === 0
      ? "No service rows found yet."
      : "No service rows match that search.";
    settingsListEl.appendChild(empty);
    return;
  }

  filteredMaps.forEach(map => {
    const row = document.createElement("article");
    row.className = `settings-item ${map.isActive ? "is-active" : "is-inactive"}`;

    const copy = document.createElement("div");
    copy.className = "settings-item-copy";

    const topline = document.createElement("div");
    topline.className = "settings-item-topline";

    const rowPill = document.createElement("span");
    rowPill.className = "settings-pill";
    rowPill.textContent = `Row ${map.sortOrder}`;
    topline.appendChild(rowPill);

    const categoryPill = document.createElement("span");
    categoryPill.className = "settings-pill";
    categoryPill.textContent = map.category || "Uncategorized";
    topline.appendChild(categoryPill);

    const statusPill = document.createElement("span");
    statusPill.className = `settings-pill settings-status-pill ${map.isActive ? "active" : "inactive"}`;
    const statusSignal = document.createElement("span");
    statusSignal.className = `signal-dot ${map.isActive ? "is-active" : "is-inactive"}`;
    statusSignal.setAttribute("aria-hidden", "true");
    statusPill.appendChild(statusSignal);
    statusPill.append(map.isActive ? "Active" : "Inactive");
    topline.appendChild(statusPill);

    const title = document.createElement("strong");
    title.className = "settings-item-title";
    title.textContent = map.baseServiceName;

    const meta = document.createElement("p");
    meta.className = "settings-item-meta";
    meta.textContent = [map.subCategory, map.universalPlatform]
      .filter(Boolean)
      .join(" - ") || "No extra service metadata";

    copy.appendChild(topline);
    copy.appendChild(title);
    copy.appendChild(meta);

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = `settings-toggle-btn ${map.isActive ? "is-active" : "is-inactive"}`;
    toggleBtn.disabled = settingsBusyMapId === map.id;
    toggleBtn.textContent =
      settingsBusyMapId === map.id
        ? "Saving..."
        : map.isActive
          ? "Deactivate"
          : "Activate";
    toggleBtn.addEventListener("click", () => { void handleToggleServiceMapActive(map); });

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "settings-toggle-btn";
    editBtn.disabled = settingsBusyMapId === map.id;
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => openSettingsEditForm(map));

    row.appendChild(copy);
    row.appendChild(editBtn);
    row.appendChild(toggleBtn);
    settingsListEl.appendChild(row);
  });
}

async function loadSettingsCatalog() {
  isSettingsLoading = true;
  renderSettingsList();

  try {
    const data = await fetchJson("/api/service-maps?includeInactive=true", {
      headers: buildAdminHeaders(),
    });
    applyServiceMaps(data.maps || []);
    isCatalogReady = true;
    setSettingsNote(
      serviceMaps.length > 0
        ? `${serviceMaps.length} service row(s) loaded. Toggle any row to manage active availability.`
        : "No service rows are available yet.",
      serviceMaps.length > 0 ? "success" : "info",
    );
    resetSettingsCreateForm();
  } catch (err) {
    setSettingsNote(err.message || "Unable to load service settings.", "error");
  } finally {
    isSettingsLoading = false;
    renderSettingsList();
  }
}

function renderSettingsPanel() {
  settingsAuthView.classList.toggle("hidden", isSettingsAuthenticated);
  settingsManagerView.classList.toggle("hidden", !isSettingsAuthenticated);
  if (isSettingsAuthenticated) {
    syncSettingsCreateUI();
    renderSettingsList();
  }
}

function openSettingsPanel() {
  isSettingsOpen = true;
  settingsOverlay.classList.remove("hidden");
  document.body.classList.add("settings-open");
  renderSettingsPanel();
  if (isSettingsAuthenticated) {
    void loadSettingsCatalog();
  }
}

function closeSettingsPanel() {
  isSettingsOpen = false;
  settingsOverlay.classList.add("hidden");
  document.body.classList.remove("settings-open");
}

async function handleToggleServiceMapActive(map) {
  if (!map?.id || settingsBusyMapId) return;

  const nextActiveState = !map.isActive;
  settingsBusyMapId = map.id;
  renderSettingsList();
  setSettingsNote(
    `${nextActiveState ? "Activating" : "Deactivating"} "${map.baseServiceName}"...`,
  );

  try {
    const data = await fetchJson(`/api/service-maps/${encodeURIComponent(map.id)}`, {
      method: "PUT",
      headers: buildAdminHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(createServiceMapPayload(map, nextActiveState)),
    });

    applyServiceMaps(serviceMaps.map(item => item.id === data.map.id ? data.map : item));
    refreshServicesFromCatalog();
    setSettingsNote(
      nextActiveState
        ? `"${map.baseServiceName}" is now active in the extension catalog.`
        : `"${map.baseServiceName}" is now inactive and hidden from service selectors.`,
      "success",
    );
    setPanelNote("Service settings updated. Active service options were refreshed.");
  } catch (err) {
    setSettingsNote(err.message || "Unable to update this service row.", "error");
  } finally {
    settingsBusyMapId = null;
    renderSettingsList();
  }
}

async function handleCreateServiceMap() {
  if (isSettingsCreateSubmitting) return;

  const payload = readSettingsCreatePayload();
  if (
    !payload.sortOrder ||
    !payload.category ||
    !payload.subCategory ||
    !payload.universalPlatform ||
    !payload.baseServiceName ||
    (!normalizeText(payload.flavors) && !normalizeText(payload.serviceSpecificEnhancements))
  ) {
    setSettingsNote(
      "Sort Order, Category, Sub Category, Universal Platform, Base Service Name, and at least one Flavor or Enhancement are required.",
      "error",
    );
    return;
  }

  isSettingsCreateSubmitting = true;
  syncSettingsCreateUI();
  const editingMapId = settingsEditingMapId;
  setSettingsNote(`${editingMapId ? "Updating" : "Creating"} "${payload.baseServiceName}"...`);

  try {
    const data = await fetchJson(
      editingMapId
        ? `/api/service-maps/${encodeURIComponent(editingMapId)}`
        : "/api/service-maps",
      {
        method: editingMapId ? "PUT" : "POST",
        headers: buildAdminHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(payload),
      },
    );

    applyServiceMaps(
      editingMapId
        ? serviceMaps.map(item => item.id === data.map.id ? data.map : item)
        : [...serviceMaps, data.map],
    );
    refreshServicesFromCatalog();
    resetSettingsCreateForm();
    closeSettingsCreateForm();
    renderSettingsList();
    setSettingsNote(
      `"${data.map.baseServiceName}" was ${editingMapId ? "updated" : "added"} in the extension catalog.`,
      "success",
    );
    setPanelNote("Service settings updated. Active service options were refreshed.");
  } catch (err) {
    setSettingsNote(err.message || "Unable to create this service row.", "error");
  } finally {
    isSettingsCreateSubmitting = false;
    syncSettingsCreateUI();
  }
}

// ── Deal selection ──
function selectDeal(deal) {
  if (!isCatalogReady) {
    setPanelNote("Service mappings are still loading.");
    return;
  }
  selectedDeal = deal;
  syncSelectedDealUI();
  addServiceBtn.disabled = false;
  setPanelNote(`Deal selected: ${deal.name || deal.id}. Loading services...`);
  loadServicesForDeal(deal);
}

async function loadServicesForDeal(deal) {
  isLoadingServices = true;
  services = [];
  setPanelNote(`Loading services for ${deal.name || deal.id}...`);
  renderServices();

  try {
    const data = await fetchJson(`/api/deal-services?dealId=${encodeURIComponent(deal.id)}`);

    // Auto-correct the deal ID and Name if the backend resolved it!
    if (data.deal && (data.deal.id !== deal.id || data.deal.name !== deal.name)) {
      selectedDeal = data.deal;
      syncSelectedDealUI();
    } else if (data.deal) {
      selectedDeal = data.deal;
      syncSelectedDealUI();
    }

    services = data.services.map(s => hydrateService(s, "idle", "Loaded successfully."));
    setPanelNote(
      services.length > 0
        ? `${services.length} service(s) loaded for ${selectedDeal?.name ?? deal.name ?? deal.id}.`
        : `No services yet for ${selectedDeal?.name ?? deal.name ?? deal.id}. Add one to begin.`,
    );
  } catch (err) {
    setPanelNote(err.message || "Unable to load services.");
    services = [];
  } finally {
    isLoadingServices = false;
    renderServices();
  }
}

openSettingsBtn.addEventListener("click", () => {
  openSettingsPanel();
});

closeSettingsBtn.addEventListener("click", () => {
  closeSettingsPanel();
});

settingsOverlay.addEventListener("click", e => {
  if (e.target === settingsOverlay) {
    closeSettingsPanel();
  }
});

settingsAuthForm.addEventListener("submit", e => {
  e.preventDefault();

  const adminId = normalizeText(settingsAdminIdInput.value);
  const adminPassword = settingsAdminPasswordInput.value;

  if (adminId !== ADMIN_ID || adminPassword !== ADMIN_PASSWORD) {
    setSettingsAuthNote("Use the extension admin credentials to open service settings.", "error");
    return;
  }

  isSettingsAuthenticated = true;
  setSettingsAuthNote("Admin access confirmed. Service settings are ready.", "success");
  renderSettingsPanel();
  void loadSettingsCatalog();
});

settingsSearchInput.addEventListener("input", () => {
  renderSettingsList();
});

settingsNewRowBtn.addEventListener("click", () => {
  if (isSettingsCreateOpen) {
    closeSettingsCreateForm();
    return;
  }
  openSettingsCreateForm();
});

settingsCreateCancelBtn.addEventListener("click", () => {
  closeSettingsCreateForm();
});

settingsCreateResetBtn.addEventListener("click", () => {
  resetSettingsCreateForm();
});

settingsCreateForm.addEventListener("submit", e => {
  e.preventDefault();
  void handleCreateServiceMap();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && isSettingsOpen) {
    closeSettingsPanel();
  }
});

// ── Add / Save / Delete ──
addServiceBtn.addEventListener("click", async () => {
  if (!isCatalogReady || !selectedDeal || isCreatingService) return;
  isCreatingService = true;
  addServiceBtn.querySelector("span").textContent = "Adding…";

  try {
    const data = await fetchJson("/api/deal-services/id", { method: "POST" });
    services.push(createEmptyService(data.id, selectedDeal.id));
    setPanelNote(`New service added for ${selectedDeal.name || selectedDeal.id}. Fill it out and save when ready.`);
    renderServices();
  } catch (err) {
    setPanelNote(err.message || "Unable to create a service block.");
  } finally {
    isCreatingService = false;
    addServiceBtn.querySelector("span").textContent = "Add service";
  }
});

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
  if (value === CUSTOM_CATEGORY_VALUE) {
    updateService(id, s => markDirty({
      ...s,
      isCustomEntry: true,
      category: "",
      subCategory: "",
      universalPlatform: "",
      baseServiceName: "",
      flavors: [],
      serviceSpecificEnhancements: [],
      aui: "",
      updatedMainMachine: "",
      updatedMachine2: "",
      updatedMachine3: "",
    }));
    return;
  }

  updateService(id, s => markDirty({
    ...s, isCustomEntry: false, category: value, subCategory: "", universalPlatform: "",
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

function handleBaseServiceSelect(id, value) {
  const parsed = SC.parseBaseServiceSelectionKey(value);
  updateService(id, s => {
    if (!parsed) {
      return markDirty({
        ...s, isCustomEntry: false, category: "", subCategory: "", universalPlatform: "",
        baseServiceName: "", flavors: [], serviceSpecificEnhancements: [],
        aui: "", updatedMainMachine: "", updatedMachine2: "", updatedMachine3: "",
      });
    }
    return markDirty(syncRowDerivedFields({
      ...s, isCustomEntry: false, category: parsed.category, subCategory: parsed.subCategory,
      universalPlatform: parsed.universalPlatform,
      baseServiceName: parsed.baseServiceName,
      flavors: [], serviceSpecificEnhancements: [],
      aui: "", updatedMainMachine: "", updatedMachine2: "", updatedMachine3: "",
    }));
  });
}

function handleFlavorEnhancementChange(id, value) {
  updateService(id, s => markDirty(syncRowDerivedFields({
    ...s,
    flavors: value.filter(option =>
      SC.getFlavorOptions(
        s.category,
        s.subCategory,
        s.universalPlatform,
        s.baseServiceName,
      ).includes(option),
    ),
    serviceSpecificEnhancements: value.filter(option =>
      SC.getEnhancementOptions(
        s.category,
        s.subCategory,
        s.universalPlatform,
        s.baseServiceName,
        [],
      )
        .filter(item => item !== "None")
        .includes(option),
    ),
    aui: "", updatedMainMachine: "", updatedMachine2: "", updatedMachine3: "",
  })));
}

function handleCustomFlavorEnhancementFieldChange(id, rawValue) {
  const nextValue = parseCommaSeparatedInput(rawValue);
  updateService(id, s => markDirty({
    ...s,
    isCustomEntry: true,
    flavors: nextValue,
    serviceSpecificEnhancements: [],
    aui: "",
    updatedMainMachine: "",
    updatedMachine2: "",
    updatedMachine3: "",
  }));
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
      emptyTitle.textContent = "Open a deal to begin";
      emptySubtitle.textContent = "Launch this from a Freshsales deal page to load that deal here.";
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
  buildFormFields(grid, s);
  return card;
}

function buildFormFields(grid, s) {
  const isCustomEntry = isServiceCustomEntry(s);
  const baseKey = s.baseServiceName
    ? SC.buildBaseServiceSelectionKey(s.category, s.subCategory, s.baseServiceName)
    : "";
  const baseOpts = SC.getBaseServiceSelectionOptions(s.category, s.subCategory)
    .map(o => ({ value: o.key, label: o.label }));
  const subCatOpts = SC.getSubCategoryOptions(s.category).map(o => o.name);
  const flavorEnhancementOptions = getFlavorEnhancementOptions(s);
  const categoryOptions = [
    ...SC.SERVICE_CATALOG.map(c => ({ value: c.name, label: c.name })),
    { value: CUSTOM_CATEGORY_VALUE, label: "CUSTOM" },
  ];

  // Category
  grid.appendChild(createSelectField("Category", isCustomEntry ? CUSTOM_CATEGORY_VALUE : s.category,
    categoryOptions,
    "Select a category", false, v => handleCategoryChange(s.id, v)));

  if (isCustomEntry) {
    grid.appendChild(createTextField("Custom Category", s.category,
      "Enter a category", false, v => handleFieldChange(s.id, "category", v)));
    grid.appendChild(createTextField("Sub Category", s.subCategory,
      "Enter a sub category", false, v => handleFieldChange(s.id, "subCategory", v)));
    grid.appendChild(createTextField("Universal Platform", s.universalPlatform,
      "Enter a platform", false, v => handleFieldChange(s.id, "universalPlatform", v)));
    grid.appendChild(createTextField("Base Service Name", s.baseServiceName,
      "Enter a base service name", false, v => handleFieldChange(s.id, "baseServiceName", v)));
    grid.appendChild(createTextareaField("Flavor / Enhancements", getSelectedFlavorEnhancementValues(s).join(", "),
      "Vanilla, Strawberry, Matcha", false,
      v => handleCustomFlavorEnhancementFieldChange(s.id, v)));
  } else {
  // Sub Category
    grid.appendChild(createSelectField("Sub Category", s.subCategory,
      subCatOpts.map(v => ({ value: v, label: v })),
      "Select a sub category", !s.category, v => handleSubCategoryChange(s.id, v)));

  // Base Service Name
    grid.appendChild(createSelectField("Base Service Name", baseKey, baseOpts.map(o => ({ value: o.value, label: o.label })),
      "Select a base service", !s.subCategory, v => handleBaseServiceSelect(s.id, v)));

  // Flavor / Enhancements
    if (s.baseServiceName) {
      grid.appendChild(createMultiSelectField("Flavor / Enhancements",
        getSelectedFlavorEnhancementValues(s), flavorEnhancementOptions,
        "Select one or more values", false, v => handleFlavorEnhancementChange(s.id, v)));
    }
  }

  appendReadOnlyCatalogDetails(grid, s);
}

// ── Reusable Field Builders ──
function appendReadOnlyCatalogDetails(grid, s) {
  const details = SC.getReadOnlyServiceDetails(
    s.category,
    s.subCategory,
    s.universalPlatform,
    s.baseServiceName,
    s.flavors,
    s.serviceSpecificEnhancements,
  );

  if (details.length === 0) return;

  const panel = document.createElement("div");
  panel.className = "readonly-details";

  const header = document.createElement("div");
  header.className = "readonly-details-header";

  const title = document.createElement("span");
  title.className = "field-label";
  title.textContent = "Catalog Details";

  const badge = document.createElement("span");
  badge.className = "readonly-badge";
  badge.textContent = "View only";

  header.appendChild(title);
  header.appendChild(badge);
  panel.appendChild(header);

  const list = document.createElement("div");
  list.className = "readonly-details-grid";

  details.forEach(detail => {
    const item = document.createElement("div");
    item.className = "readonly-detail-item";

    const label = document.createElement("span");
    label.className = "field-label";
    label.textContent = detail.label;

    const value = document.createElement("span");
    value.className = "readonly-detail-value";
    value.textContent = detail.value;

    item.appendChild(label);
    item.appendChild(value);
    list.appendChild(item);
  });

  panel.appendChild(list);
  grid.appendChild(panel);
}

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

function createTextField(label, value, placeholder, disabled, onChange) {
  const group = document.createElement("div");
  group.className = "field-group";

  const lbl = document.createElement("span");
  lbl.className = "field-label";
  lbl.textContent = label;
  group.appendChild(lbl);

  const wrap = document.createElement("div");
  wrap.className = "text-field";

  const input = document.createElement("input");
  input.type = "text";
  input.value = value ?? "";
  input.placeholder = placeholder;
  input.disabled = disabled;
  input.addEventListener("change", () => {
    onChange(input.value);
  });

  wrap.appendChild(input);
  group.appendChild(wrap);
  return group;
}

function createTextareaField(label, value, placeholder, disabled, onChange) {
  const group = document.createElement("div");
  group.className = "field-group";

  const lbl = document.createElement("span");
  lbl.className = "field-label";
  lbl.textContent = label;
  group.appendChild(lbl);

  const wrap = document.createElement("div");
  wrap.className = "text-field textarea-field";

  const textarea = document.createElement("textarea");
  textarea.rows = 3;
  textarea.value = value ?? "";
  textarea.placeholder = placeholder;
  textarea.disabled = disabled;
  textarea.addEventListener("change", () => {
    onChange(textarea.value);
  });

  wrap.appendChild(textarea);
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

async function initPopup() {
  setSettingsAuthNote("Enter the extension admin credentials to continue.");
  setSettingsNote("Loading current service availability...");
  syncSelectedDealUI();
  syncSettingsCreateUI();
  setPanelNote("Loading service mappings...");
  addServiceBtn.disabled = true;
  renderServices();

  try {
    await loadCatalogMappings();
    resetSettingsCreateForm();
    setPanelNote("Open a Freshsales deal to get started.");

    if (autoDealId) {
      selectDeal({ id: autoDealId, name: autoDealId });
      return;
    }

    renderServices();
  } catch (err) {
    setPanelNote(err.message || "Unable to load service mappings from MongoDB.");
  }
}

void initPopup();
