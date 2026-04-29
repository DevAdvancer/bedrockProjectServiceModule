"use client";

import Link from "next/link";
import { FormEvent, startTransition, useEffect, useState } from "react";
import {
  getReadOnlyServiceDetails,
  ServiceCatalogRow,
} from "@/lib/service-catalog";

type ServiceMapsResponse = {
  maps: ServiceCatalogRow[];
  error?: string;
};

type ServiceMapMutationResponse = {
  map: ServiceCatalogRow;
  error?: string;
};

type DeleteServiceMapResponse = {
  deletedId: string;
  error?: string;
};

type FormState = {
  sortOrder: string;
  isActive: boolean;
  status: string;
  serviceOrderId: string;
  category: string;
  subCategory: string;
  universalPlatform: string;
  baseServiceName: string;
  itemType: string;
  flavorEnhancementItem: string;
  flavors: string;
  serviceSpecificEnhancements: string;
  aui: string;
  groceryYN: string;
  groceryNeeds: string;
  kitchenPrepNeededYN: string;
  kitchenPrepItems: string;
  carryThroughYN: string;
  carryThroughItems: string;
  orderItemsFromCC: string;
  ccItems: string;
  updatedMainMachine: string;
  updatedMachine2: string;
  updatedMachine3: string;
  strategicAttributes: string;
  exclusivityKeys: string;
  staff: string;
  preSupplyTier: string;
  twoDayPrice: string;
  threeDayPrice: string;
  fourDayPrice: string;
  notes: string;
  sourceRowNumber: string;
};

const EMPTY_FORM: FormState = {
  sortOrder: "",
  isActive: true,
  status: "",
  serviceOrderId: "",
  category: "",
  subCategory: "",
  universalPlatform: "",
  baseServiceName: "",
  itemType: "",
  flavorEnhancementItem: "",
  flavors: "",
  serviceSpecificEnhancements: "",
  aui: "",
  groceryYN: "",
  groceryNeeds: "",
  kitchenPrepNeededYN: "",
  kitchenPrepItems: "",
  carryThroughYN: "",
  carryThroughItems: "",
  orderItemsFromCC: "",
  ccItems: "",
  updatedMainMachine: "",
  updatedMachine2: "",
  updatedMachine3: "",
  strategicAttributes: "",
  exclusivityKeys: "",
  staff: "",
  preSupplyTier: "",
  twoDayPrice: "",
  threeDayPrice: "",
  fourDayPrice: "",
  notes: "",
  sourceRowNumber: "",
};

function formatCsv(values: string[]) {
  return values.join(", ");
}

function createFormState(map?: ServiceCatalogRow): FormState {
  if (!map) {
    return EMPTY_FORM;
  }

  return {
    sortOrder: String(map.sortOrder),
    isActive: map.isActive,
    status: map.status,
    serviceOrderId: map.serviceOrderId,
    category: map.category,
    subCategory: map.subCategory,
    universalPlatform: map.universalPlatform,
    baseServiceName: map.baseServiceName,
    itemType: map.itemType,
    flavorEnhancementItem: map.flavorEnhancementItem,
    flavors: formatCsv(map.flavors),
    serviceSpecificEnhancements: formatCsv(map.serviceSpecificEnhancements),
    aui: formatCsv(map.aui),
    groceryYN: map.groceryYN,
    groceryNeeds: map.groceryNeeds,
    kitchenPrepNeededYN: map.kitchenPrepNeededYN,
    kitchenPrepItems: map.kitchenPrepItems,
    carryThroughYN: map.carryThroughYN,
    carryThroughItems: map.carryThroughItems,
    orderItemsFromCC: map.orderItemsFromCC,
    ccItems: map.ccItems,
    updatedMainMachine: formatCsv(map.updatedMainMachine),
    updatedMachine2: formatCsv(map.updatedMachine2),
    updatedMachine3: formatCsv(map.updatedMachine3),
    strategicAttributes: map.strategicAttributes,
    exclusivityKeys: map.exclusivityKeys,
    staff: map.staff,
    preSupplyTier: map.preSupplyTier,
    twoDayPrice: map.twoDayPrice,
    threeDayPrice: map.threeDayPrice,
    fourDayPrice: map.fourDayPrice,
    notes: map.notes,
    sourceRowNumber: String(map.sourceRowNumber),
  };
}

function sortMaps(maps: ServiceCatalogRow[]) {
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

async function fetchJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

function createMapMutationPayload(
  form: FormState | ServiceCatalogRow,
  isActiveOverride?: boolean,
) {
  if ("baseServiceName" in form && Array.isArray(form.flavors)) {
    return {
      sortOrder: String(form.sortOrder),
      isActive: isActiveOverride ?? form.isActive,
      status: form.status,
      serviceOrderId: form.serviceOrderId,
      category: form.category,
      subCategory: form.subCategory,
      universalPlatform: form.universalPlatform,
      baseServiceName: form.baseServiceName,
      itemType: form.itemType,
      flavorEnhancementItem: form.flavorEnhancementItem,
      flavors: form.flavors,
      serviceSpecificEnhancements: form.serviceSpecificEnhancements,
      aui: form.aui,
      groceryYN: form.groceryYN,
      groceryNeeds: form.groceryNeeds,
      kitchenPrepNeededYN: form.kitchenPrepNeededYN,
      kitchenPrepItems: form.kitchenPrepItems,
      carryThroughYN: form.carryThroughYN,
      carryThroughItems: form.carryThroughItems,
      orderItemsFromCC: form.orderItemsFromCC,
      ccItems: form.ccItems,
      updatedMainMachine: form.updatedMainMachine,
      updatedMachine2: form.updatedMachine2,
      updatedMachine3: form.updatedMachine3,
      strategicAttributes: form.strategicAttributes,
      exclusivityKeys: form.exclusivityKeys,
      staff: form.staff,
      preSupplyTier: form.preSupplyTier,
      twoDayPrice: form.twoDayPrice,
      threeDayPrice: form.threeDayPrice,
      fourDayPrice: form.fourDayPrice,
      notes: form.notes,
      sourceRowNumber: String(form.sourceRowNumber || form.sortOrder),
    };
  }

  return {
    ...form,
    sortOrder:
      typeof form.sortOrder === "string"
        ? form.sortOrder.trim()
        : String(form.sortOrder),
    isActive: isActiveOverride ?? form.isActive,
  };
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  type?: string;
}) {
  const className =
    "w-full rounded-2xl border border-[#d3c3c0]/40 bg-white px-4 py-3 text-sm text-[#271310] outline-none transition placeholder:text-[#504442]/40 focus:border-[#271310] focus:ring-1 focus:ring-[#271310]";

  return (
    <label className="grid gap-2">
      <span className="text-[11px] font-bold uppercase tracking-widest text-[#504442]/70">
        {label}
      </span>
      {multiline ? (
        <textarea
          rows={3}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`${className} resize-y`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={className}
        />
      )}
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description: string;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-2xl border border-[#d3c3c0]/30 bg-[#fdf9f6] px-4 py-3">
      <div className="grid gap-1">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#504442]/70">
          {label}
        </span>
        <span className="text-sm text-[#504442]/70">{description}</span>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-[#271310]"
      />
    </label>
  );
}

function MapValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid gap-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-[#504442]/50">
        {label}
      </span>
      <span className="text-sm text-[#271310]">{value || "None"}</span>
    </div>
  );
}

export default function ServiceMapAdmin() {
  const [maps, setMaps] = useState<ServiceCatalogRow[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("Loading current maps...");

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredMaps = maps.filter((map) => {
    if (!normalizedSearchQuery) {
      return true;
    }

    const searchableText = [
      map.category,
      map.subCategory,
      map.universalPlatform,
      map.baseServiceName,
      map.serviceOrderId,
      ...map.flavors,
      ...map.serviceSpecificEnhancements,
      ...map.aui,
      ...map.updatedMainMachine,
      ...map.updatedMachine2,
      ...map.updatedMachine3,
      ...getReadOnlyServiceDetails(
        [map],
        map.category,
        map.subCategory,
        map.universalPlatform,
        map.baseServiceName,
      ).map((detail) => detail.value),
      map.isActive ? "active" : "inactive",
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedSearchQuery);
  });
  const activeCount = maps.filter((map) => map.isActive).length;
  const inactiveCount = maps.length - activeCount;

  useEffect(() => {
    let isMounted = true;

    async function loadMaps() {
      try {
        const data = await fetchJson<ServiceMapsResponse>(
          "/api/service-maps?includeInactive=true",
        );

        if (!isMounted) {
          return;
        }

        startTransition(() => {
          const nextMaps = sortMaps(data.maps);
          setMaps(nextMaps);
          setForm((current) =>
            current.sortOrder
              ? current
              : {
                  ...current,
                  sortOrder: String(nextMaps.length + 1),
                },
          );
          setMessage(
            nextMaps.length > 0
              ? `${nextMaps.length} map row(s) loaded from the current catalog.`
              : "No map rows exist yet. Add the first one below.",
          );
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMessage(error instanceof Error ? error.message : "Unable to load maps.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadMaps();

    return () => {
      isMounted = false;
    };
  }, []);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm(nextSortOrder?: number) {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      sortOrder: nextSortOrder ? String(nextSortOrder) : "",
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(editingId ? "Updating map row..." : "Saving new map row...");
    const payload = createMapMutationPayload(form);

    try {
      const isEditing = Boolean(editingId);
      const data = await fetchJson<ServiceMapMutationResponse>(
        isEditing ? `/api/service-maps/${editingId}` : "/api/service-maps",
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      startTransition(() => {
        setMaps((current) => {
          const nextMaps = isEditing
            ? current.map((item) => (item.id === data.map.id ? data.map : item))
            : [...current, data.map];

          return sortMaps(nextMaps);
        });
      });

      const nextSortOrder =
        editingId === null ? maps.length + 2 : maps.length + 1;
      resetForm(nextSortOrder);
      setMessage(
        isEditing ? "Map row updated successfully." : "Map row created successfully.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save this map row.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEdit(map: ServiceCatalogRow) {
    setEditingId(map.id ?? null);
    setForm(createFormState(map));
    setMessage(`Editing "${map.baseServiceName}" in ${map.category}.`);
  }

  async function handleToggleActive(map: ServiceCatalogRow) {
    if (!map.id) {
      return;
    }

    const nextActiveState = !map.isActive;
    setMessage(
      `${nextActiveState ? "Activating" : "Deactivating"} "${map.baseServiceName}"...`,
    );

    try {
      const data = await fetchJson<ServiceMapMutationResponse>(
        `/api/service-maps/${map.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            createMapMutationPayload(map, nextActiveState),
          ),
        },
      );

      startTransition(() => {
        setMaps((current) =>
          sortMaps(
            current.map((item) => (item.id === data.map.id ? data.map : item)),
          ),
        );
        if (editingId === data.map.id) {
          setForm(createFormState(data.map));
        }
      });

      setMessage(
        nextActiveState
          ? `"${map.baseServiceName}" is active and will appear in dropdowns.`
          : `"${map.baseServiceName}" is inactive and hidden from dropdowns.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to update active status.",
      );
    }
  }

  async function handleDelete(map: ServiceCatalogRow) {
    if (!map.id) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${map.baseServiceName}" from ${map.category}?`,
    );

    if (!confirmed) {
      return;
    }

    setMessage(`Deleting "${map.baseServiceName}"...`);

    try {
      const data = await fetchJson<DeleteServiceMapResponse>(
        `/api/service-maps/${map.id}`,
        {
          method: "DELETE",
        },
      );

      startTransition(() => {
        setMaps((current) =>
          sortMaps(current.filter((item) => item.id !== data.deletedId)),
        );
      });
      resetForm(maps.length);
      setMessage("Map row deleted successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete this map row.");
    }
  }

  return (
    <main className="min-h-screen bg-[#fdf9f6] px-6 py-10 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-[#d3c3c0]/20 bg-white/90 p-8 shadow-[0_12px_48px_rgba(28,27,26,0.04)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="grid gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.35em] text-[#795c51]">
                Admin
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#271310]">
                Service Map Manager
              </h1>
              <p className="max-w-3xl text-sm text-[#504442]/70">
                Add, update, or delete the catalog rows that drive the service
                dropdowns. Only active rows appear in the main service
                dropdowns, and any multi-value field should be entered as
                comma-separated text.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="rounded-xl border border-[#d3c3c0]/40 px-4 py-2 text-sm font-semibold text-[#271310] transition hover:bg-[#f7f3f0]"
              >
                Back to dashboard
              </Link>
              <button
                type="button"
                onClick={() => resetForm(maps.length + 1)}
                className="rounded-xl bg-[#271310] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3e2723]"
              >
                New map row
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-[#fed7ca] bg-[#fff6f2] px-4 py-3 text-sm text-[#795c51]">
            {message}
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section className="rounded-[2rem] border border-[#d3c3c0]/20 bg-white p-6 shadow-[0_12px_48px_rgba(28,27,26,0.04)]">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[#271310]">
                  {editingId ? "Edit map row" : "Add map row"}
                </h2>
                <p className="mt-1 text-sm text-[#504442]/60">
                  CSV fields accept values like `Vanilla, Strawberry, Matcha`.
                </p>
              </div>
              {editingId ? (
                <button
                  type="button"
                  onClick={() => resetForm(maps.length + 1)}
                  className="rounded-lg border border-[#d3c3c0]/40 px-3 py-2 text-sm font-semibold text-[#271310] transition hover:bg-[#f7f3f0]"
                >
                  Cancel
                </button>
              ) : null}
            </div>

            <form className="grid gap-4" onSubmit={handleSubmit}>
              <Field
                label="Sort Order"
                type="number"
                value={form.sortOrder}
                onChange={(value) => updateField("sortOrder", value)}
                placeholder="1"
              />
              <ToggleField
                label="Active"
                checked={form.isActive}
                onChange={(checked) => updateField("isActive", checked)}
                description="Active rows appear in the main dashboard dropdowns. Inactive rows stay in admin only."
              />
              <Field
                label="Services Status"
                value={form.status}
                onChange={(value) => updateField("status", value)}
                placeholder="No Change"
              />
              <Field
                label="Service Order ID"
                value={form.serviceOrderId}
                onChange={(value) => updateField("serviceOrderId", value)}
                placeholder="NATL C AOB 0001"
              />
              <Field
                label="Category"
                value={form.category}
                onChange={(value) => updateField("category", value)}
                placeholder="CRM"
              />
              <Field
                label="Sub Category"
                value={form.subCategory}
                onChange={(value) => updateField("subCategory", value)}
                placeholder="Beverage"
              />
              <Field
                label="Universal Platform"
                value={form.universalPlatform}
                onChange={(value) => updateField("universalPlatform", value)}
                placeholder="ASSET PANDA"
              />
              <Field
                label="Base Service Name"
                value={form.baseServiceName}
                onChange={(value) => updateField("baseServiceName", value)}
                placeholder="ALC: Cold Brew"
              />
              <Field
                label="Type"
                value={form.itemType}
                onChange={(value) => updateField("itemType", value)}
                placeholder="Flavor, Enh., Modifier"
              />
              <Field
                label="Flavor / Enhancement Item"
                value={form.flavorEnhancementItem}
                onChange={(value) => updateField("flavorEnhancementItem", value)}
                placeholder="Granola Bites"
              />
              <Field
                label="Flavors"
                value={form.flavors}
                onChange={(value) => updateField("flavors", value)}
                placeholder="Cold Brew, Nitro"
                multiline
              />
              <Field
                label="Enhancements"
                value={form.serviceSpecificEnhancements}
                onChange={(value) =>
                  updateField("serviceSpecificEnhancements", value)
                }
                placeholder="CRM, Training"
                multiline
              />
              <Field
                label="AUI"
                value={form.aui}
                onChange={(value) => updateField("aui", value)}
                placeholder="ASSET PANDA, None"
                multiline
              />
              <Field
                label="Grocery Y/N"
                value={form.groceryYN}
                onChange={(value) => updateField("groceryYN", value)}
                placeholder="Y or N"
              />
              <Field
                label="Grocery Needs"
                value={form.groceryNeeds}
                onChange={(value) => updateField("groceryNeeds", value)}
                placeholder="Ingredient list"
                multiline
              />
              <Field
                label="Kitchen Prep Needed Y/N"
                value={form.kitchenPrepNeededYN}
                onChange={(value) => updateField("kitchenPrepNeededYN", value)}
                placeholder="Y or N"
              />
              <Field
                label="Kitchen Prep Items"
                value={form.kitchenPrepItems}
                onChange={(value) => updateField("kitchenPrepItems", value)}
                placeholder="Prep items"
                multiline
              />
              <Field
                label="Carry Through Y/N"
                value={form.carryThroughYN}
                onChange={(value) => updateField("carryThroughYN", value)}
                placeholder="Y or N"
              />
              <Field
                label="Carry Through Items"
                value={form.carryThroughItems}
                onChange={(value) => updateField("carryThroughItems", value)}
                placeholder="Carry through items"
                multiline
              />
              <Field
                label="Order Items from CC?"
                value={form.orderItemsFromCC}
                onChange={(value) => updateField("orderItemsFromCC", value)}
                placeholder="Y or N"
              />
              <Field
                label="CC Items"
                value={form.ccItems}
                onChange={(value) => updateField("ccItems", value)}
                placeholder="CC items"
                multiline
              />
              <Field
                label="Updated Main Machine"
                value={form.updatedMainMachine}
                onChange={(value) => updateField("updatedMainMachine", value)}
                placeholder="Machine A, Machine B"
                multiline
              />
              <Field
                label="Updated Machine 2"
                value={form.updatedMachine2}
                onChange={(value) => updateField("updatedMachine2", value)}
                placeholder="Optional comma-separated values"
                multiline
              />
              <Field
                label="Updated Machine 3"
                value={form.updatedMachine3}
                onChange={(value) => updateField("updatedMachine3", value)}
                placeholder="Optional comma-separated values"
                multiline
              />
              <Field
                label="Strategic Attributes"
                value={form.strategicAttributes}
                onChange={(value) => updateField("strategicAttributes", value)}
                placeholder="Wellness, Fuel and Energy"
                multiline
              />
              <Field
                label="Exclusivity Keys"
                value={form.exclusivityKeys}
                onChange={(value) => updateField("exclusivityKeys", value)}
                placeholder="None"
              />
              <Field
                label="Staff"
                value={form.staff}
                onChange={(value) => updateField("staff", value)}
                placeholder="1S"
              />
              <Field
                label="Pre-Supply Tier"
                value={form.preSupplyTier}
                onChange={(value) => updateField("preSupplyTier", value)}
                placeholder="n/a"
              />
              <Field
                label="2-Day ($)"
                value={form.twoDayPrice}
                onChange={(value) => updateField("twoDayPrice", value)}
                placeholder="n/a"
              />
              <Field
                label="3-Day ($)"
                value={form.threeDayPrice}
                onChange={(value) => updateField("threeDayPrice", value)}
                placeholder="n/a"
              />
              <Field
                label="4-Day ($)"
                value={form.fourDayPrice}
                onChange={(value) => updateField("fourDayPrice", value)}
                placeholder="n/a"
              />
              <Field
                label="Notes"
                value={form.notes}
                onChange={(value) => updateField("notes", value)}
                placeholder="Optional notes"
                multiline
              />
              <Field
                label="Source Row Number"
                type="number"
                value={form.sourceRowNumber}
                onChange={(value) => updateField("sourceRowNumber", value)}
                placeholder="2"
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 rounded-2xl bg-[#271310] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3e2723] disabled:cursor-not-allowed disabled:bg-[#d3c3c0]"
              >
                {isSubmitting
                  ? editingId
                    ? "Updating..."
                    : "Saving..."
                  : editingId
                    ? "Update map row"
                    : "Create map row"}
              </button>
            </form>
          </section>

          <section className="grid gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#271310]">
                  Current map rows
                </h2>
                <p className="mt-1 text-sm text-[#504442]/60">
                  These rows are saved in MongoDB and power the dashboard
                  selections.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[#271310]/5 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#271310]">
                  {maps.length} rows
                </span>
                <span className="rounded-full bg-[#4A6120]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#4A6120]">
                  {activeCount} active
                </span>
                <span className="rounded-full bg-[#8B6914]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#8B6914]">
                  {inactiveCount} inactive
                </span>
              </div>
            </div>
            <div className="rounded-[2rem] border border-[#d3c3c0]/20 bg-white p-4 shadow-[0_12px_48px_rgba(28,27,26,0.04)]">
              <Field
                label="Search"
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by service, category, platform, flavor, status..."
              />
            </div>

            {isLoading ? (
              <div className="rounded-[2rem] border border-dashed border-[#d3c3c0]/30 bg-white p-12 text-center text-sm text-[#504442]/60">
                Loading map rows...
              </div>
            ) : filteredMaps.length > 0 ? (
              filteredMaps.map((map) => (
                <article
                  key={map.id ?? `${map.sortOrder}-${map.baseServiceName}`}
                  className="rounded-[2rem] border border-[#d3c3c0]/20 bg-white p-6 shadow-[0_12px_48px_rgba(28,27,26,0.04)]"
                >
                  <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="grid gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#271310]/5 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#271310]">
                          Row {map.sortOrder}
                        </span>
                        <span className="rounded-full bg-[#fed7ca]/60 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#795c51]">
                          {map.category}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${
                            map.isActive
                              ? "bg-[#4A6120]/10 text-[#4A6120]"
                              : "bg-[#8B6914]/10 text-[#8B6914]"
                          }`}
                        >
                          {map.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-[#271310]">
                        {map.baseServiceName}
                      </h3>
                      <p className="text-sm text-[#504442]/65">
                        {map.subCategory} • {map.universalPlatform}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => void handleToggleActive(map)}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                          map.isActive
                            ? "border border-[#f0d7a8] bg-[#fff7e8] text-[#8B6914] hover:bg-[#fff0cd]"
                            : "border border-[#d8ebc3] bg-[#f5faee] text-[#4A6120] hover:bg-[#ebf5df]"
                        }`}
                      >
                        {map.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(map)}
                        className="rounded-xl border border-[#d3c3c0]/40 px-4 py-2 text-sm font-semibold text-[#271310] transition hover:bg-[#f7f3f0]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(map)}
                        className="rounded-xl border border-[#ffdad6] bg-[#fff5f4] px-4 py-2 text-sm font-semibold text-[#ba1a1a] transition hover:bg-[#ffe9e7]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <MapValue
                      label="Service Order ID"
                      value={map.serviceOrderId}
                    />
                    <MapValue label="Flavors" value={formatCsv(map.flavors)} />
                    <MapValue
                      label="Enhancements"
                      value={formatCsv(map.serviceSpecificEnhancements)}
                    />
                    <MapValue label="AUI" value={formatCsv(map.aui)} />
                    <MapValue
                      label="Updated Main Machine"
                      value={formatCsv(map.updatedMainMachine)}
                    />
                    <MapValue
                      label="Updated Machine 2"
                      value={formatCsv(map.updatedMachine2)}
                    />
                    <MapValue
                      label="Updated Machine 3"
                      value={formatCsv(map.updatedMachine3)}
                    />
                    {getReadOnlyServiceDetails(
                      [map],
                      map.category,
                      map.subCategory,
                      map.universalPlatform,
                      map.baseServiceName,
                    ).map((detail) => (
                      <MapValue
                        key={detail.label}
                        label={detail.label}
                        value={detail.value}
                      />
                    ))}
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[2rem] border border-dashed border-[#d3c3c0]/30 bg-white p-12 text-center text-sm text-[#504442]/60">
                {maps.length === 0
                  ? "No map rows saved yet."
                  : "No map rows match that search."}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
