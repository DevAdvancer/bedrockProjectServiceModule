"use client";

import Link from "next/link";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import {
  buildCombinedFinalValue,
  buildServiceFinalValue,
  DealSearchResult,
  PersistedDealService,
  ServiceFormValues,
} from "@/lib/deal-services";
import {
  buildBaseServiceSelectionKey,
  getAuiOptions,
  getBaseServiceSelectionOptions,
  getCategoryOptions,
  getEnhancementOptions,
  getFlavorOptions,
  ServiceCatalogRow,
  getSubCategoryOptions,
  getUniversalPlatformOptions,
  getUpdatedMachine2Options,
  getUpdatedMachine3Options,
  getUpdatedMainMachineOptions,
  parseBaseServiceSelectionKey,
} from "@/lib/service-catalog";
import { getIndexedFieldName } from "@/lib/service-fields";

type SaveState = "idle" | "saving" | "saved" | "error";

type ServiceCardState = PersistedDealService & {
  dirty: boolean;
  saveState: SaveState;
  note: string;
};

type SearchResponse = {
  deals: DealSearchResult[];
  error?: string;
};

type DealServicesResponse = {
  services: PersistedDealService[];
  combinedFinalValue: string;
  error?: string;
};

type ServiceMapsResponse = {
  maps: ServiceCatalogRow[];
  error?: string;
};

type ServiceMutationResponse = {
  service: PersistedDealService;
  combinedFinalValue: string;
  error?: string;
};

type DeleteServiceResponse = {
  deletedId: string;
  dealId: string;
  combinedFinalValue: string;
  error?: string;
};

type SelectOption = {
  value: string;
  label: string;
};

const DISPLAY_CURRENCY_CODE = "USD";

function toSelectOptions(values: string[]): SelectOption[] {
  return values.map((value) => ({
    value,
    label: value,
  }));
}

function createEmptyService(id: string, dealId: string): ServiceCardState {
  return {
    id,
    dealId,
    category: "",
    subCategory: "",
    baseServiceName: "",
    flavors: [],
    serviceSpecificEnhancements: [],
    universalPlatform: "",
    aui: "",
    updatedMainMachine: "",
    updatedMachine2: "",
    updatedMachine3: "",
    price: null,
    finalValue: "",
    dirty: true,
    saveState: "idle",
    note: "Complete the fields, add a price, and save.",
  };
}

function hydrateService(
  service: PersistedDealService,
  serviceMaps: ServiceCatalogRow[],
  saveState: SaveState = "idle",
  note = "",
): ServiceCardState {
  return syncRowDerivedFields(
    {
      ...service,
      finalValue: buildServiceFinalValue(service),
      dirty: false,
      saveState,
      note,
    },
    serviceMaps,
  );
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

function resolveSingleValue(currentValue: string, options: string[]) {
  if (options.length === 1) {
    return options[0];
  }

  return options.includes(currentValue) ? currentValue : "";
}

function resolveMultiValue(currentValue: string[], options: string[]) {
  return currentValue.filter((value) => options.includes(value));
}

function syncRowDerivedFields(
  service: ServiceCardState,
  serviceMaps: ServiceCatalogRow[],
): ServiceCardState {
  const enhancementOptions = getEnhancementOptions(
    serviceMaps,
    service.category,
    service.subCategory,
    service.universalPlatform,
    service.baseServiceName,
    service.flavors,
  );
  const auiOptions = getAuiOptions(
    serviceMaps,
    service.category,
    service.subCategory,
    service.universalPlatform,
    service.baseServiceName,
    service.flavors,
  );
  const updatedMainMachineOptions = getUpdatedMainMachineOptions(
    serviceMaps,
    service.category,
    service.subCategory,
    service.universalPlatform,
    service.baseServiceName,
    service.flavors,
  );
  const updatedMachine2Options = getUpdatedMachine2Options(
    serviceMaps,
    service.category,
    service.subCategory,
    service.universalPlatform,
    service.baseServiceName,
    service.flavors,
  );
  const updatedMachine3Options = getUpdatedMachine3Options(
    serviceMaps,
    service.category,
    service.subCategory,
    service.universalPlatform,
    service.baseServiceName,
    service.flavors,
  );

  return {
    ...service,
    serviceSpecificEnhancements: resolveMultiValue(
      service.serviceSpecificEnhancements,
      enhancementOptions,
    ),
    aui: resolveSingleValue(service.aui, auiOptions),
    updatedMainMachine: resolveSingleValue(
      service.updatedMainMachine,
      updatedMainMachineOptions,
    ),
    updatedMachine2: resolveSingleValue(
      service.updatedMachine2,
      updatedMachine2Options,
    ),
    updatedMachine3: resolveSingleValue(
      service.updatedMachine3,
      updatedMachine3Options,
    ),
  };
}

function FieldLabel({
  label,
}: {
  label: string;
}) {
  return (
    <span className="block text-[11px] font-bold uppercase tracking-widest text-[#504442]/70 font-[family-name:var(--font-inter)]">
      {label}
    </span>
  );
}

function SelectField({
  label,
  value,
  onChange,
  name,
  options,
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  name?: string;
  options: SelectOption[];
  placeholder: string;
  disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find((option) => option.value === value) ?? null;
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm(null);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  const inputValue = searchTerm ?? selectedOption?.label ?? "";
  const normalizedSearchTerm = (searchTerm ?? "").trim().toLowerCase();
  const filteredOptions =
    normalizedSearchTerm.length === 0
      ? options
      : options.filter((option) =>
          option.label.toLowerCase().includes(normalizedSearchTerm),
        );

  return (
    <div className="grid gap-3">
      <FieldLabel label={label} />
      <div className="relative" ref={containerRef}>
        <div className="relative">
          {name && <input type="hidden" name={name} value={value} />}
          <input
            type="text"
            value={inputValue}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full rounded-lg border border-[#d3c3c0]/30 bg-white px-4 py-3 pr-12 text-sm text-[#271310] outline-none transition focus:border-[#271310] focus:ring-1 focus:ring-[#271310] disabled:cursor-not-allowed disabled:bg-[#f1edea]"
            onFocus={() => { if (!disabled) setIsOpen(true); }}
            onChange={(event) => { setSearchTerm(event.target.value); setIsOpen(true); }}
            onKeyDown={(event) => {
              if (event.key === "Escape") { setIsOpen(false); setSearchTerm(null); return; }
              if (event.key === "Enter" && filteredOptions.length > 0) {
                event.preventDefault();
                onChange(filteredOptions[0].value);
                setSearchTerm(null);
                setIsOpen(false);
              }
            }}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[#504442]/40 transition hover:text-[#271310] disabled:cursor-not-allowed"
            onClick={() => { if (!disabled) setIsOpen((c) => !c); }}
            disabled={disabled}
            aria-label="Toggle options"
          >
            <svg viewBox="0 0 20 20" fill="none" className={`h-5 w-5 transition ${isOpen ? "rotate-180" : ""}`}>
              <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {isOpen ? (
          <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-[#d3c3c0]/30 bg-white p-1.5 shadow-[0_20px_50px_rgba(28,27,26,0.1)]">
            {value ? (
              <button type="button" className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-[#504442] transition hover:bg-[#f7f3f0]" onClick={() => { onChange(""); setSearchTerm(null); setIsOpen(false); }}>Clear selection</button>
            ) : null}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`flex w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                    option.value === value ? "bg-[#271310]/5 text-[#271310] font-medium" : "text-[#1c1b1a] hover:bg-[#f7f3f0]"
                  }`}
                  onClick={() => { onChange(option.value); setSearchTerm(null); setIsOpen(false); }}
                >{option.label}</button>
              ))
            ) : (
              <p className="px-3 py-2 text-sm text-[#504442]/60">No matches found.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MultiSelectField({
  label,
  value,
  onChange,
  name,
  options,
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  name?: string;
  options: string[];
  placeholder: string;
  disabled?: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredOptions = normalizedSearchTerm.length === 0 
    ? options 
    : options.filter(option => option.toLowerCase().includes(normalizedSearchTerm));

  return (
    <div className="grid gap-3">
      <FieldLabel label={label} />
      <details className="rounded-lg border border-[#d3c3c0]/30 bg-white p-4 open:shadow-sm">
        <summary
          className={`cursor-pointer list-none text-sm ${
            disabled ? "pointer-events-none text-[#504442]/30" : "text-[#271310]"
          }`}
        >
          {value.length > 0 ? `${value.length} selected` : placeholder}
        </summary>
        <div className="mt-4 grid gap-2">
          {options.length > 0 && (
            <div className="mb-2">
              <input
                type="text"
                placeholder="Search options..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-md border border-[#d3c3c0]/30 bg-white px-3 py-2 text-sm text-[#271310] outline-none transition focus:border-[#271310] focus:ring-1 focus:ring-[#271310]"
              />
            </div>
          )}
          {options.length === 0 ? (
            <p className="text-sm text-[#504442]/50">No options available yet.</p>
          ) : filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <label
                key={option}
                className="flex items-center justify-between gap-3 rounded-lg border border-[#d3c3c0]/20 px-3 py-2 text-sm text-[#1c1b1a] transition hover:bg-[#f7f3f0]"
              >
                <span>{option}</span>
                <input
                  type="checkbox"
                  name={name}
                  checked={value.includes(option)}
                  disabled={disabled}
                  onChange={(event) => {
                    if (event.target.checked) { onChange([...value, option]); return; }
                    onChange(value.filter((item) => item !== option));
                  }}
                />
              </label>
            ))
          ) : (
            <p className="text-sm text-[#504442]/50">No matches found.</p>
          )}
        </div>
      </details>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((item) => (
            <span key={item} className="rounded-full bg-[#271310]/5 px-3 py-1 text-xs font-bold text-[#271310]">
              {item}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-3">
      <FieldLabel label={label} />
      <div className="flex items-center rounded-lg border border-[#d3c3c0]/30 bg-white px-4 py-3 transition focus-within:border-[#271310] focus-within:ring-1 focus-within:ring-[#271310]">
        <span className="mr-3 text-sm font-semibold text-[#271310]/40">$</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value ?? ""}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full border-none bg-transparent p-0 text-sm font-semibold text-[#271310] outline-none focus:ring-0 disabled:cursor-not-allowed"
          onChange={(event) => {
            const nextValue = event.target.value.trim();
            onChange(nextValue ? Number(nextValue) : null);
          }}
        />
      </div>
    </label>
  );
}

function ServiceCard({
  service,
  serviceMaps,
  serviceNumber,
  baseServiceSelectionOptions,
  onCategoryChange,
  onSubCategoryChange,
  onUniversalPlatformChange,
  onBaseServiceSelect,
  onFlavorsChange,
  onEnhancementsChange,
  onFieldChange,
  onSave,
  onDelete,
}: {
  service: ServiceCardState;
  serviceMaps: ServiceCatalogRow[];
  serviceNumber: number;
  baseServiceSelectionOptions: SelectOption[];
  onCategoryChange: (serviceId: string, value: string) => void;
  onSubCategoryChange: (serviceId: string, value: string) => void;
  onUniversalPlatformChange: (serviceId: string, value: string) => void;
  onBaseServiceSelect: (serviceId: string, value: string) => void;
  onFlavorsChange: (serviceId: string, value: string[]) => void;
  onEnhancementsChange: (serviceId: string, value: string[]) => void;
  onFieldChange: <K extends keyof ServiceFormValues>(
    serviceId: string,
    field: K,
    value: ServiceFormValues[K],
  ) => void;
  onSave: (serviceId: string) => void;
  onDelete: (serviceId: string) => void;
}) {
  const subCategoryOptions = getSubCategoryOptions(
    serviceMaps,
    service.category,
  ).map(
    (item) => item.name,
  );
  const universalPlatformOptions = getUniversalPlatformOptions(
    serviceMaps,
    service.category,
    service.subCategory,
  ).map((item) => item.name);
  const flavorOptions = getFlavorOptions(
    serviceMaps,
    service.category,
    service.subCategory,
    service.universalPlatform,
    service.baseServiceName,
  );
  const enhancementOptions = getEnhancementOptions(
    serviceMaps,
    service.category,
    service.subCategory,
    service.universalPlatform,
    service.baseServiceName,
    service.flavors,
  );
  const auiOptions = getAuiOptions(
    serviceMaps,
    service.category,
    service.subCategory,
    service.universalPlatform,
    service.baseServiceName,
    service.flavors,
  );
  const updatedMainMachineOptions = getUpdatedMainMachineOptions(
    serviceMaps,
    service.category,
    service.subCategory,
    service.universalPlatform,
    service.baseServiceName,
    service.flavors,
  );
  const updatedMachine2Options = getUpdatedMachine2Options(
    serviceMaps,
    service.category,
    service.subCategory,
    service.universalPlatform,
    service.baseServiceName,
    service.flavors,
  );
  const updatedMachine3Options = getUpdatedMachine3Options(
    serviceMaps,
    service.category,
    service.subCategory,
    service.universalPlatform,
    service.baseServiceName,
    service.flavors,
  );
  const baseServiceSelectionKey = service.baseServiceName
    ? buildBaseServiceSelectionKey(
        service.category,
        service.subCategory,
        service.universalPlatform,
        service.baseServiceName,
      )
    : "";
  const enhancementStepReady = service.flavors.length > 0;
  const auiStepReady = auiOptions.length === 0 || Boolean(service.aui);
  const finalValue = buildServiceFinalValue(service);
  const statusLabel =
    service.saveState === "saved"
      ? "Saved"
      : service.saveState === "saving"
        ? "Saving…"
        : service.saveState === "error"
          ? "Error"
          : service.dirty
            ? "Draft"
            : "Idle";
  const statusStyle =
    service.saveState === "saved"
      ? "bg-[#4A6120]/10 text-[#4A6120]"
      : service.saveState === "saving"
        ? "bg-[#8B6914]/10 text-[#8B6914]"
        : service.saveState === "error"
          ? "bg-[#ba1a1a]/10 text-[#ba1a1a]"
          : "bg-[#f1edea] text-[#504442]";

  return (
    <article className="card-lift rounded-[2rem] border border-[#d3c3c0]/10 bg-white shadow-[0_12px_48px_rgba(28,27,26,0.04)]">
      {/* Card header */}
      <div className="flex flex-col gap-4 rounded-t-[2rem] border-b border-[#d3c3c0]/10 bg-[#fdf9f6] px-8 py-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fed7ca]">
            <svg viewBox="0 0 24 24" fill="none" stroke="#795c51" strokeWidth="1.5" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.992l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-[#271310] font-[family-name:var(--font-manrope)]">
                {service.baseServiceName || `Service ${serviceNumber}`}
              </h3>
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter ${statusStyle}`}>
                {statusLabel}
              </span>
            </div>
            <p className="mt-1 text-sm text-[#504442]/60 font-[family-name:var(--font-inter)]">
              {service.note || "Configure settings for this service."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="cursor-pointer rounded-xl border border-[#d3c3c0] px-5 py-2.5 text-sm font-semibold text-[#271310] transition hover:bg-[#f7f3f0] active:scale-95"
            onClick={() => onDelete(service.id)}
          >
            Delete
          </button>
          <button
            type="button"
            className="btn-shine cursor-pointer rounded-xl bg-[#271310] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#271310]/10 transition hover:bg-[#3e2723] active:scale-95 disabled:cursor-not-allowed disabled:bg-[#d3c3c0]"
            onClick={() => onSave(service.id)}
            disabled={service.saveState === "saving"}
          >
            {service.saveState === "saving" ? "Saving…" : "Save service"}
          </button>
        </div>
      </div>

      {/* Form body */}
      <div className="p-8">
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
          <SelectField
            label="Base Service Name"
            value={baseServiceSelectionKey}
            onChange={(value) => onBaseServiceSelect(service.id, value)}
            options={baseServiceSelectionOptions}
            placeholder="Select a base service"
          />
          <SelectField
            label="Category"
            value={service.category}
            onChange={(value) => onCategoryChange(service.id, value)}
            name={getIndexedFieldName("category", serviceNumber)}
            options={toSelectOptions(
              getCategoryOptions(serviceMaps).map((item) => item.name),
            )}
            placeholder="Select a category"
          />
          <SelectField
            label="Sub Category"
            value={service.subCategory}
            onChange={(value) => onSubCategoryChange(service.id, value)}
            options={toSelectOptions(subCategoryOptions)}
            placeholder="Select a sub category"
            disabled={!service.category}
          />
          <SelectField
            label="Universal Platform"
            value={service.universalPlatform}
            onChange={(value) => onUniversalPlatformChange(service.id, value)}
            options={toSelectOptions(universalPlatformOptions)}
            placeholder="Select a universal platform"
            disabled={!service.subCategory}
          />
          {service.baseServiceName ? (
            <MultiSelectField
              label="Flavors"
              value={service.flavors}
              onChange={(value) => onFlavorsChange(service.id, value)}
              options={flavorOptions}
              placeholder="Select one or more flavors"
            />
          ) : null}
          {service.flavors.length > 0 ? (
            <MultiSelectField
              label="Service-Specific Enhancements"
              value={service.serviceSpecificEnhancements}
              onChange={(value) => onEnhancementsChange(service.id, value)}
              options={enhancementOptions}
              placeholder="Select enhancements"
            />
          ) : null}
          {enhancementStepReady ? (
            <SelectField
              label="AUI"
              value={service.aui}
              onChange={(value) =>
                onFieldChange(service.id, "aui", value as ServiceFormValues["aui"])
              }
              options={toSelectOptions(auiOptions)}
              placeholder="Select an AUI value"
            />
          ) : null}
          {enhancementStepReady && auiStepReady ? (
            <SelectField
              label="Updated Main Machine"
              value={service.updatedMainMachine}
              onChange={(value) => onFieldChange(service.id, "updatedMainMachine", value)}
              options={toSelectOptions(updatedMainMachineOptions)}
              placeholder={updatedMainMachineOptions.length > 0 ? "Select a machine" : "No machine for this row"}
            />
          ) : null}
          {enhancementStepReady && auiStepReady ? (
            <SelectField
              label="Updated Machine 2"
              value={service.updatedMachine2}
              onChange={(value) => onFieldChange(service.id, "updatedMachine2", value)}
              options={toSelectOptions(updatedMachine2Options)}
              placeholder={updatedMachine2Options.length > 0 ? "Select a machine" : "No machine for this row"}
            />
          ) : null}
          {enhancementStepReady && auiStepReady ? (
            <SelectField
              label="Updated Machine 3"
              value={service.updatedMachine3}
              onChange={(value) => onFieldChange(service.id, "updatedMachine3", value)}
              options={toSelectOptions(updatedMachine3Options)}
              placeholder={updatedMachine3Options.length > 0 ? "Select a machine" : "No machine for this row"}
            />
          ) : null}
          <NumberField
            label="Price (USD)"
            value={service.price}
            onChange={(value) => onFieldChange(service.id, "price", value)}
            placeholder="0.00"
          />
        </div>
      </div>
    </article>
  );
}

export default function DealServiceDashboard({
  initialServiceMaps,
}: {
  initialServiceMaps: ServiceCatalogRow[];
}) {
  const [serviceMaps, setServiceMaps] = useState<ServiceCatalogRow[]>(
    () => initialServiceMaps,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DealSearchResult[]>([]);
  const [searchState, setSearchState] = useState<SaveState>("idle");
  const [searchNote, setSearchNote] = useState("Search by deal name to get started.");
  const [selectedDeal, setSelectedDeal] = useState<DealSearchResult | null>(null);
  const [services, setServices] = useState<ServiceCardState[]>([]);
  const [panelNote, setPanelNote] = useState(
    "Pick a deal to get started.",
  );
  const [lastSyncedValue, setLastSyncedValue] = useState("");
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isCreatingService, setIsCreatingService] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadServiceMaps() {
      try {
        const data = await fetchJson<ServiceMapsResponse>("/api/service-maps");

        if (!isMounted) {
          return;
        }

        startTransition(() => {
          setServiceMaps(data.maps);
        });
      } catch {
        // Keep the server-provided Mongo-backed mappings if refresh fails.
      }
    }

    void loadServiceMaps();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    startTransition(() => {
      setServices((current) =>
        current.map((service) => syncRowDerivedFields(service, serviceMaps)),
      );
    });
  }, [serviceMaps]);

  const runDealSearch = useEffectEvent(async (query: string, signal: AbortSignal) => {
    setSearchState("saving");
    setSearchNote("Searching deals...");

    try {
      const data = await fetchJson<SearchResponse>(
        `/api/deals/search?q=${encodeURIComponent(query)}`,
        { signal },
      );

      if (signal.aborted) {
        return;
      }

      startTransition(() => {
        if (data.deals.length === 1) {
          void loadServicesForDeal(data.deals[0]);
          setSearchQuery("");
          setSearchResults([]);
          setSearchState("idle");
          setSearchNote("Deal loaded.");
        } else {
          setSearchResults(data.deals);
          setSearchState("idle");
          setSearchNote(
            data.deals.length > 0
              ? "Select a deal to start managing services."
              : "No matching deals found for that search.",
          );
        }
      });
    } catch (error) {
      if (signal.aborted) {
        return;
      }

      setSearchState("error");
      setSearchNote(error instanceof Error ? error.message : "Search failed.");
      setSearchResults([]);
    }
  });

  async function loadServicesForDeal(deal: DealSearchResult) {
    setSelectedDeal(deal);
    setIsLoadingServices(true);
    setPanelNote(`Loading services for ${deal.name}...`);
    setServices([]);

    try {
      const data = await fetchJson<DealServicesResponse>(
        `/api/deal-services?dealId=${encodeURIComponent(deal.id)}`,
      );

      startTransition(() => {
        setServices(
          data.services.map((service) =>
            hydrateService(
              service,
              serviceMaps,
              "idle",
              "Loaded successfully.",
            ),
          ),
        );
        setLastSyncedValue(data.combinedFinalValue);
        setPanelNote(
          data.services.length > 0
            ? `${data.services.length} service(s) loaded for ${deal.name}.`
            : `No services yet for ${deal.name}. Add one to begin.`,
        );
      });
    } catch (error) {
      setPanelNote(error instanceof Error ? error.message : "Unable to load services.");
      setServices([]);
      setLastSyncedValue("");
    } finally {
      setIsLoadingServices(false);
    }
  }

  async function handleAddService() {
    if (!selectedDeal) {
      setPanelNote("Select a deal first.");
      return;
    }

    setIsCreatingService(true);

    try {
      const data = await fetchJson<{ id: string }>("/api/deal-services/id", {
        method: "POST",
      });

      startTransition(() => {
        setServices((current) => [
          ...current,
          createEmptyService(data.id, selectedDeal.id),
        ]);
        setPanelNote(
          `New service added for ${selectedDeal.name}. Fill it out and save when ready.`,
        );
      });
    } catch (error) {
      setPanelNote(
        error instanceof Error ? error.message : "Unable to create a service block.",
      );
    } finally {
      setIsCreatingService(false);
    }
  }

  function updateServiceState(
    serviceId: string,
    updater: (service: ServiceCardState) => ServiceCardState,
  ) {
    setServices((current) =>
      current.map((service) => (service.id === serviceId ? updater(service) : service)),
    );
  }

  function markDirty(service: ServiceCardState): ServiceCardState {
    return {
      ...service,
      finalValue: buildServiceFinalValue(service),
      dirty: true,
      saveState: service.saveState === "saving" ? "saving" : "idle",
      note: "You have unsaved changes.",
    };
  }

  function handleCategoryChange(serviceId: string, value: string) {
    updateServiceState(serviceId, (service) =>
      markDirty({
        ...service,
        category: value,
        subCategory: "",
        universalPlatform: "",
        baseServiceName: "",
        flavors: [],
        serviceSpecificEnhancements: [],
        aui: "",
        updatedMainMachine: "",
        updatedMachine2: "",
        updatedMachine3: "",
      }),
    );
  }

  function handleSubCategoryChange(serviceId: string, value: string) {
    updateServiceState(serviceId, (service) =>
      markDirty({
        ...service,
        subCategory: value,
        universalPlatform: "",
        baseServiceName: "",
        flavors: [],
        serviceSpecificEnhancements: [],
        aui: "",
        updatedMainMachine: "",
        updatedMachine2: "",
        updatedMachine3: "",
      }),
    );
  }

  function handleUniversalPlatformChange(serviceId: string, value: string) {
    updateServiceState(serviceId, (service) =>
      markDirty({
        ...service,
        universalPlatform: value,
        baseServiceName: "",
        flavors: [],
        serviceSpecificEnhancements: [],
        aui: "",
        updatedMainMachine: "",
        updatedMachine2: "",
        updatedMachine3: "",
      }),
    );
  }

  function handleBaseServiceSelect(serviceId: string, value: string) {
    const parsedSelection = parseBaseServiceSelectionKey(value, serviceMaps);

    updateServiceState(serviceId, (service) => {
      if (!parsedSelection) {
        return markDirty({
          ...service,
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
        });
      }

      return markDirty(
        syncRowDerivedFields(
          {
            ...service,
            category: parsedSelection.category,
            subCategory: parsedSelection.subCategory,
            universalPlatform: parsedSelection.universalPlatform,
            baseServiceName: parsedSelection.baseServiceName,
            flavors: [],
            serviceSpecificEnhancements: [],
            aui: "",
            updatedMainMachine: "",
            updatedMachine2: "",
            updatedMachine3: "",
          },
          serviceMaps,
        ),
      );
    });
  }

  function handleFlavorsChange(serviceId: string, value: string[]) {
    updateServiceState(serviceId, (service) =>
      markDirty(
        syncRowDerivedFields(
          {
            ...service,
            flavors: value,
            serviceSpecificEnhancements: [],
            aui: "",
            updatedMainMachine: "",
            updatedMachine2: "",
            updatedMachine3: "",
          },
          serviceMaps,
        ),
      ),
    );
  }

  function handleEnhancementsChange(serviceId: string, value: string[]) {
    updateServiceState(serviceId, (service) =>
      markDirty({
        ...service,
        serviceSpecificEnhancements: value,
      }),
    );
  }

  function handleFieldChange<K extends keyof ServiceFormValues>(
    serviceId: string,
    field: K,
    value: ServiceFormValues[K],
  ) {
    updateServiceState(serviceId, (service) =>
      markDirty({
        ...service,
        [field]: value,
      } as ServiceCardState),
    );
  }

  async function handleSaveService(serviceId: string) {
    const service = services.find((item) => item.id === serviceId);

    if (!service) {
      return;
    }

    updateServiceState(serviceId, (current) => ({
      ...current,
      saveState: "saving",
      note: "Saving your service...",
    }));

    try {
      const payload = {
        id: service.id,
        dealId: selectedDeal?.id ?? service.dealId,
        category: service.category,
        subCategory: service.subCategory,
        baseServiceName: service.baseServiceName,
        flavors: service.flavors,
        serviceSpecificEnhancements: service.serviceSpecificEnhancements,
        universalPlatform: service.universalPlatform,
        aui: service.aui,
        updatedMainMachine: service.updatedMainMachine,
        updatedMachine2: service.updatedMachine2,
        updatedMachine3: service.updatedMachine3,
        price: service.price,
      };

      const hasBeenSavedBefore = Boolean(service.createdAt);
      const url = hasBeenSavedBefore
        ? `/api/deal-services/${encodeURIComponent(service.id)}`
        : "/api/deal-services";
      const method = hasBeenSavedBefore ? "PUT" : "POST";
      const data = await fetchJson<ServiceMutationResponse>(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      startTransition(() => {
        setServices((current) =>
          current.map((item) =>
            item.id === serviceId
              ? hydrateService(
                  data.service,
                  serviceMaps,
                  "saved",
                  "Saved successfully.",
                )
              : item,
          ),
        );
        setLastSyncedValue(data.combinedFinalValue);
        setPanelNote(
          `Products updated for ${selectedDeal?.name ?? "this deal"}.`,
        );
      });
    } catch (error) {
      updateServiceState(serviceId, (current) => ({
        ...current,
        saveState: "error",
        note: error instanceof Error ? error.message : "Unable to save this service.",
      }));
      setPanelNote(
        error instanceof Error ? error.message : "Unable to save this service.",
      );
    }
  }

  async function handleDeleteService(serviceId: string) {
    const service = services.find((item) => item.id === serviceId);

    if (!service) {
      return;
    }

    if (!service.createdAt) {
      setServices((current) => current.filter((item) => item.id !== serviceId));
      setPanelNote("Draft service removed.");
      return;
    }

    updateServiceState(serviceId, (current) => ({
      ...current,
      saveState: "saving",
      note: "Deleting service...",
    }));

    try {
      const data = await fetchJson<DeleteServiceResponse>(
        `/api/deal-services/${encodeURIComponent(serviceId)}`,
        {
          method: "DELETE",
        },
      );

      startTransition(() => {
        setServices((current) => current.filter((item) => item.id !== serviceId));
        setLastSyncedValue(data.combinedFinalValue);
        setPanelNote("Service deleted successfully.");
      });
    } catch (error) {
      updateServiceState(serviceId, (current) => ({
        ...current,
        saveState: "error",
        note: error instanceof Error ? error.message : "Unable to delete this service.",
      }));
      setPanelNote(
        error instanceof Error ? error.message : "Unable to delete this service.",
      );
    }
  }

  const draftCombinedValue = buildCombinedFinalValue(services);

  return (
    <main className="min-h-screen bg-[#fdf9f6]">
      {/* ── Top Nav ── */}
      <nav className="animate-fade-in fixed top-0 z-50 w-full border-b border-[#e5e2df] bg-[#fdf9f6]/80 shadow-[0_12px_32px_rgba(28,27,26,0.06)] glass-nav">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-6 lg:px-8">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#271310]">
              <svg viewBox="0 0 20 20" fill="white" className="h-4 w-4">
                <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.789l1.599.799L9 4.323V3a1 1 0 011-1z" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tighter text-[#271310] font-[family-name:var(--font-manrope)]">
              CrepesALatte
            </span>
          </div>
          <Link
            href="/admin"
            className="hidden rounded-lg border border-[#d3c3c0]/40 px-3 py-1.5 text-sm font-semibold text-[#271310] transition hover:bg-white sm:inline-flex"
          >
            Manage maps
          </Link>

          {/* Search */}
          <form 
            className="relative hidden min-w-[240px] max-w-sm flex-1 sm:block"
            onSubmit={(e) => {
              e.preventDefault();
              const query = searchQuery.trim();
              if (query.length > 0) {
                void loadServicesForDeal({ id: query, name: query } as DealSearchResult);
                setSearchQuery("");
                setSearchResults([]);
              }
            }}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#504442]/40">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onPaste={(e) => {
                const pastedText = e.clipboardData.getData("Text").trim();
                // Extract ID if they paste a full freshsales URL
                const idMatch = pastedText.match(/(?:deals\/)?(\d{10,15})/);
                const finalId = idMatch ? idMatch[1] : pastedText;
                
                if (finalId.length > 0) {
                  setSearchQuery(finalId);
                  void loadServicesForDeal({ id: finalId, name: finalId } as DealSearchResult);
                  setTimeout(() => setSearchQuery(""), 100);
                }
              }}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                if (event.target.value.trim() === "") {
                  setSearchResults([]);
                }
              }}
              placeholder="Paste exact deal name here…"
              className="w-full rounded-lg border border-[#d3c3c0]/30 bg-white/60 py-2 pl-10 pr-4 text-sm text-[#271310] outline-none transition placeholder:text-[#504442]/40 focus:border-[#271310] focus:ring-1 focus:ring-[#271310]"
            />

            {/* Search dropdown */}
            {(searchResults.length > 0 || searchState === "saving") && searchQuery.length >= 2 ? (
              <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-72 overflow-y-auto rounded-xl border border-[#d3c3c0]/30 bg-white p-1.5 shadow-[0_20px_50px_rgba(28,27,26,0.12)]">
                {searchState === "saving" ? (
                  <p className="animate-pulse-soft px-3 py-4 text-center text-sm text-[#504442]/60">Searching…</p>
                ) : (
                  searchResults.map((deal) => (
                    <button
                      key={deal.id}
                      type="button"
                      onClick={() => { void loadServicesForDeal(deal); setSearchQuery(""); }}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition ${
                        selectedDeal?.id === deal.id
                          ? "bg-[#271310]/5 text-[#271310] font-medium"
                          : "text-[#1c1b1a] hover:bg-[#f7f3f0]"
                      }`}
                    >
                      <span>{deal.name}</span>
                      {selectedDeal?.id === deal.id ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#271310]/40">Selected</span>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </form>

          {/* Selected deal + Account */}
          <div className="ml-auto flex items-center gap-4">
            {selectedDeal ? (
              <div className="hidden items-center gap-2 lg:flex">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#504442]/40 font-[family-name:var(--font-inter)]">Active Deal</span>
                  <span className="max-w-[200px] truncate text-sm font-semibold text-[#271310]">{selectedDeal.name}</span>
                </div>
                <button
                  type="button"
                  className="cursor-pointer rounded-lg p-1.5 text-[#504442]/40 transition hover:bg-[#f7f3f0] hover:text-[#271310]"
                  onClick={() => { setSelectedDeal(null); setServices([]); setPanelNote("Pick a deal to get started."); }}
                  aria-label="Clear deal"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                    <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
                  </svg>
                </button>
              </div>
            ) : null}

            {/* Add service button */}
            <button
              type="button"
              onClick={() => void handleAddService()}
              disabled={!selectedDeal || isCreatingService}
              className="btn-shine flex cursor-pointer items-center gap-2 rounded-xl bg-[#271310] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3e2723] active:scale-95 disabled:cursor-not-allowed disabled:bg-[#d3c3c0]"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                <path d="M8.75 3.75a.75.75 0 00-1.5 0v3.5h-3.5a.75.75 0 000 1.5h3.5v3.5a.75.75 0 001.5 0v-3.5h3.5a.75.75 0 000-1.5h-3.5v-3.5z" />
              </svg>
              {isCreatingService ? "Adding…" : "Add service"}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Main content ── */}
      <div className="mx-auto max-w-5xl px-6 pb-12 pt-24 lg:px-8">
        {/* Page header */}
        <div className="animate-fade-in mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#271310] font-[family-name:var(--font-manrope)] md:text-4xl">
            Service Configuration
          </h1>
          {panelNote ? (
            <p className="mt-2 text-sm text-[#504442]/60 font-[family-name:var(--font-inter)]">{panelNote}</p>
          ) : null}
        </div>

        {/* Service cards */}
        {isLoadingServices ? (
          <div className="animate-shimmer overflow-hidden rounded-[2rem] border border-dashed border-[#d3c3c0]/30 bg-white p-20 text-center text-sm text-[#504442]/60">
            Loading services…
          </div>
        ) : services.length > 0 ? (
          <div className="grid gap-8">
            {services.map((service, index) => (
              <ServiceCard
                key={service.id}
                service={service}
                serviceMaps={serviceMaps}
                serviceNumber={index + 1}
                baseServiceSelectionOptions={getBaseServiceSelectionOptions(
                  serviceMaps,
                  service.category,
                  service.subCategory,
                  service.universalPlatform,
                ).map((option) => ({
                  value: option.key,
                  label: option.label,
                }))}
                onCategoryChange={handleCategoryChange}
                onSubCategoryChange={handleSubCategoryChange}
                onUniversalPlatformChange={handleUniversalPlatformChange}
                onBaseServiceSelect={handleBaseServiceSelect}
                onFlavorsChange={handleFlavorsChange}
                onEnhancementsChange={handleEnhancementsChange}
                onFieldChange={handleFieldChange}
                onSave={(cardId) => void handleSaveService(cardId)}
                onDelete={(cardId) => void handleDeleteService(cardId)}
              />
            ))}
          </div>
        ) : (
          <div className="animate-fade-in-delay-1 flex flex-col items-center justify-center overflow-hidden rounded-[2rem] border border-dashed border-[#d3c3c0]/20 bg-white px-6 py-24 text-center shadow-[0_12px_48px_rgba(28,27,26,0.04)]">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fed7ca]">
              <svg viewBox="0 0 24 24" fill="none" stroke="#795c51" strokeWidth="1.5" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[#271310] font-[family-name:var(--font-manrope)]">
              {selectedDeal ? "No services yet" : "Select a deal to begin"}
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-[#504442]/60 font-[family-name:var(--font-inter)]">
              {selectedDeal
                ? "Click \"Add service\" to create your first service for this deal."
                : "Use the search bar above to find and select a deal."}
            </p>
          </div>
        )}

        {/* Footer metadata */}
        <div className="mt-10 flex items-center justify-between text-[11px] text-[#504442]/30 font-[family-name:var(--font-inter)]">
          <span>CrepesALatte Service Studio</span>
          <span>Secure Configuration Environment</span>
        </div>
      </div>
    </main>
  );
}
