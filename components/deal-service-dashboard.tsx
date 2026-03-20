"use client";

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
  getEnhancementOptions,
  getFlavorOptions,
  getSubCategoryOptions,
  getUniversalPlatformOptions,
  getUpdatedMachine2Options,
  getUpdatedMachine3Options,
  getUpdatedMainMachineOptions,
  parseBaseServiceSelectionKey,
  SERVICE_CATALOG,
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
  saveState: SaveState = "idle",
  note = "",
): ServiceCardState {
  return syncRowDerivedFields({
    ...service,
    finalValue: buildServiceFinalValue(service),
    dirty: false,
    saveState,
    note,
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

function resolveSingleValue(currentValue: string, options: string[]) {
  if (options.length === 1) {
    return options[0];
  }

  return options.includes(currentValue) ? currentValue : "";
}

function resolveMultiValue(currentValue: string[], options: string[]) {
  return currentValue.filter((value) => options.includes(value));
}

function syncRowDerivedFields(service: ServiceCardState): ServiceCardState {
  const enhancementOptions = getEnhancementOptions(
    service.category,
    service.subCategory,
    service.universalPlatform,
    service.baseServiceName,
    service.flavors,
  );
  const auiOptions = getAuiOptions(
    service.category,
    service.subCategory,
    service.universalPlatform,
    service.baseServiceName,
    service.flavors,
  );
  const updatedMainMachineOptions = getUpdatedMainMachineOptions(
    service.category,
    service.subCategory,
    service.universalPlatform,
    service.baseServiceName,
    service.flavors,
  );
  const updatedMachine2Options = getUpdatedMachine2Options(
    service.category,
    service.subCategory,
    service.universalPlatform,
    service.baseServiceName,
    service.flavors,
  );
  const updatedMachine3Options = getUpdatedMachine3Options(
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
  hint,
}: {
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold text-[#3B2314]">{label}</span>
      {hint ? (
        <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#5C4A3A]">
          {hint}
        </span>
      ) : null}
    </div>
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
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  name?: string;
  options: SelectOption[];
  placeholder: string;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <label className="grid gap-2">
      <FieldLabel label={label} hint={hint} />
      <select
        name={name}
        className="rounded-2xl border border-[#E0D5C7] bg-[#FFFAF2] px-4 py-3 text-sm text-[#3B2314] outline-none transition focus:border-[#6F4E37] focus:ring-2 focus:ring-[#6F4E3720] disabled:cursor-not-allowed disabled:bg-[#F0E8DD]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SearchableSelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  disabled?: boolean;
  hint?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find((option) => option.value === value) ?? null;
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
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
    <div className="grid gap-2">
      <FieldLabel label={label} hint={hint} />
      <div className="relative" ref={containerRef}>
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full rounded-2xl border border-[#E0D5C7] bg-[#FFFAF2] px-4 py-3 pr-12 text-sm text-[#3B2314] outline-none transition focus:border-[#6F4E37] focus:ring-2 focus:ring-[#6F4E3720] disabled:cursor-not-allowed disabled:bg-[#F0E8DD]"
            onFocus={() => {
              if (!disabled) {
                setIsOpen(true);
              }
            }}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setIsOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setIsOpen(false);
                setSearchTerm(null);
                return;
              }

              if (event.key === "Enter" && filteredOptions.length > 0) {
                event.preventDefault();
                const [firstOption] = filteredOptions;
                onChange(firstOption.value);
                setSearchTerm(null);
                setIsOpen(false);
              }
            }}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[#5C4A3A] transition hover:text-[#3B2314] disabled:cursor-not-allowed"
            onClick={() => {
              if (disabled) {
                return;
              }

              setIsOpen((current) => !current);
            }}
            disabled={disabled}
            aria-label="Toggle base service options"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              className={`h-5 w-5 transition ${isOpen ? "rotate-180" : ""}`}
            >
              <path
                d="M5 7.5L10 12.5L15 7.5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {isOpen ? (
          <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-[#E0D5C7] bg-[#FFFAF2] p-2 shadow-[0_20px_50px_rgba(44,26,14,0.12)]">
            {value ? (
              <button
                type="button"
                className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-[#5C4A3A] transition hover:bg-[#FAF5EE] hover:text-[#3B2314]"
                onClick={() => {
                  onChange("");
                  setSearchTerm(null);
                  setIsOpen(false);
                }}
              >
                Clear selection
              </button>
            ) : null}

            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`flex w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                      isSelected
                        ? "bg-[#6F4E3715] text-[#6F4E37]"
                        : "text-[#3B2314] hover:bg-[#FAF5EE]"
                    }`}
                    onClick={() => {
                      onChange(option.value);
                      setSearchTerm(null);
                      setIsOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-2 text-sm text-[#5C4A3A]">
                No base services match your search.
              </p>
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
  hint,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  name?: string;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="grid gap-2">
      <FieldLabel label={label} hint={hint} />
      <details className="rounded-2xl border border-[#E0D5C7] bg-[#FFFAF2] p-4 open:shadow-sm">
        <summary
          className={`cursor-pointer list-none text-sm ${
            disabled ? "pointer-events-none text-[#B8A898]" : "text-[#3B2314]"
          }`}
        >
          {value.length > 0 ? `${value.length} selected` : placeholder}
        </summary>
        <div className="mt-4 grid gap-2">
          {options.length > 0 ? (
            options.map((option) => {
              const checked = value.includes(option);

              return (
                <label
                  key={option}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#E0D5C7] px-3 py-2 text-sm text-[#3B2314]"
                >
                  <span>{option}</span>
                  <input
                    type="checkbox"
                    name={name}
                    checked={checked}
                    disabled={disabled}
                    onChange={(event) => {
                      if (event.target.checked) {
                        onChange([...value, option]);
                        return;
                      }

                      onChange(value.filter((item) => item !== option));
                    }}
                  />
                </label>
              );
            })
          ) : (
            <p className="text-sm text-[#5C4A3A]">No options available yet.</p>
          )}
        </div>
      </details>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((item) => (
            <span
              key={item}
              className="rounded-full bg-[#6F4E3712] px-3 py-1 text-xs font-semibold text-[#6F4E37]"
            >
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
  hint,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  placeholder: string;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <label className="grid gap-2">
      <FieldLabel label={label} hint={hint} />
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-semibold text-[#5C4A3A]">
          $
        </span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value ?? ""}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-2xl border border-[#E0D5C7] bg-[#FFFAF2] px-9 py-3 pr-16 text-sm text-[#3B2314] outline-none transition focus:border-[#6F4E37] focus:ring-2 focus:ring-[#6F4E3720] disabled:cursor-not-allowed disabled:bg-[#F0E8DD]"
          onChange={(event) => {
            const nextValue = event.target.value.trim();
            onChange(nextValue ? Number(nextValue) : null);
          }}
        />
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center font-mono text-[11px] uppercase tracking-[0.2em] text-[#5C4A3A]">
          {DISPLAY_CURRENCY_CODE}
        </span>
      </div>
    </label>
  );
}

function ServiceCard({
  service,
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
  const subCategoryOptions = getSubCategoryOptions(service.category).map(
    (item) => item.name,
  );
  const universalPlatformOptions = getUniversalPlatformOptions(
    service.category,
    service.subCategory,
  ).map((item) => item.name);
  const flavorOptions = getFlavorOptions(
    service.category,
    service.subCategory,
    service.universalPlatform,
    service.baseServiceName,
  );
  const enhancementOptions = getEnhancementOptions(
    service.category,
    service.subCategory,
    service.universalPlatform,
    service.baseServiceName,
    service.flavors,
  );
  const auiOptions = getAuiOptions(
    service.category,
    service.subCategory,
    service.universalPlatform,
    service.baseServiceName,
    service.flavors,
  );
  const updatedMainMachineOptions = getUpdatedMainMachineOptions(
    service.category,
    service.subCategory,
    service.universalPlatform,
    service.baseServiceName,
    service.flavors,
  );
  const updatedMachine2Options = getUpdatedMachine2Options(
    service.category,
    service.subCategory,
    service.universalPlatform,
    service.baseServiceName,
    service.flavors,
  );
  const updatedMachine3Options = getUpdatedMachine3Options(
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
  const statusTone =
    service.saveState === "saved"
      ? "bg-[#6B7F3A20] text-[#4A6120]"
      : service.saveState === "saving"
        ? "bg-[#C5984920] text-[#8B6914]"
        : service.saveState === "error"
          ? "bg-[#A0522D20] text-[#A0522D]"
          : "bg-[#F0E8DD] text-[#3B2314]";

  return (
    <article className="card-hover rounded-[32px] border border-[#E0D5C7]/70 bg-[#FFFAF2]/85 p-6 shadow-[0_24px_80px_rgba(44,26,14,0.08)] backdrop-blur">
      <div className="flex flex-col gap-4 border-b border-[#E0D5C7] pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#B8860B18] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em] text-[#8B6914]">
              #{serviceNumber}
            </span>
          </div>
          <h3 className="text-2xl font-semibold text-[#2C1A0E]">
            {service.baseServiceName || `Service ${serviceNumber}`}
          </h3>
          <p className="max-w-3xl text-sm text-[#4A3728]">
            {service.note || "Define the service configuration and save it independently."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone}`}>
            {service.saveState === "idle" && service.dirty ? "Draft" : service.saveState}
          </span>
          <button
            type="button"
            className="rounded-full border border-[#E0D5C7] px-4 py-2 text-sm font-semibold text-[#3B2314] transition hover:border-[#C9B9A8] hover:bg-[#FAF5EE] cursor-pointer"
            onClick={() => onDelete(service.id)}
          >
            Delete
          </button>
          <button
            type="button"
            className="btn-primary rounded-full bg-[#6F4E37] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#5A3D2B] disabled:cursor-not-allowed disabled:bg-[#C4A882] cursor-pointer"
            onClick={() => onSave(service.id)}
            disabled={service.saveState === "saving"}
          >
            {service.saveState === "saving" ? "Saving..." : "Save service"}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <SearchableSelectField
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
          options={toSelectOptions(SERVICE_CATALOG.map((item) => item.name))}
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
            placeholder={
              updatedMainMachineOptions.length > 0
                ? "Select a machine"
                : "No machine value for this row"
            }

          />
        ) : null}
        {enhancementStepReady && auiStepReady ? (
          <SelectField
            label="Updated Machine 2"
            value={service.updatedMachine2}
            onChange={(value) => onFieldChange(service.id, "updatedMachine2", value)}
            options={toSelectOptions(updatedMachine2Options)}
            placeholder={
              updatedMachine2Options.length > 0
                ? "Select a machine"
                : "No machine value for this row"
            }

          />
        ) : null}
        {enhancementStepReady && auiStepReady ? (
          <SelectField
            label="Updated Machine 3"
            value={service.updatedMachine3}
            onChange={(value) => onFieldChange(service.id, "updatedMachine3", value)}
            options={toSelectOptions(updatedMachine3Options)}
            placeholder={
              updatedMachine3Options.length > 0
                ? "Select a machine"
                : "No machine value for this row"
            }

          />
        ) : null}
        <NumberField
          label="Price (USD)"
          value={service.price}
          onChange={(value) => onFieldChange(service.id, "price", value)}
          placeholder="Enter the service price in USD"

        />
      </div>

      <div className="mt-6 rounded-3xl border border-dashed border-[#6F4E3730] bg-[#6F4E370A] p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#6F4E37]">
          Service Summary
        </p>
        <p className="mt-2 break-all text-sm text-[#3B2314]">
          {finalValue || "Fill in the fields above to see a summary."}
        </p>
      </div>
    </article>
  );
}

export default function DealServiceDashboard() {
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

  const deferredSearchQuery = useDeferredValue(searchQuery);

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
        setSearchResults(data.deals);
        setSearchState("idle");
        setSearchNote(
          data.deals.length > 0
            ? "Select a deal to start managing services."
            : "No matching deals found for that search.",
        );
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

  useEffect(() => {
    if (deferredSearchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearchState("idle");
      setSearchNote("Search by deal name to get started.");
      return;
    }

    const controller = new AbortController();
    void runDealSearch(deferredSearchQuery.trim(), controller.signal);

    return () => controller.abort();
  }, [deferredSearchQuery]);

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
            hydrateService(service, "idle", "Loaded successfully."),
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
    const parsedSelection = parseBaseServiceSelectionKey(value);

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
        syncRowDerivedFields({
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
        }),
      );
    });
  }

  function handleFlavorsChange(serviceId: string, value: string[]) {
    updateServiceState(serviceId, (service) =>
      markDirty(
        syncRowDerivedFields({
          ...service,
          flavors: value,
          serviceSpecificEnhancements: [],
          aui: "",
          updatedMainMachine: "",
          updatedMachine2: "",
          updatedMachine3: "",
        }),
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
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-10">
      <section className="animate-fade-in relative overflow-hidden rounded-[36px] border border-[#E0D5C7]/60 bg-[#FFFAF2]/55 p-6 shadow-[0_28px_90px_rgba(44,26,14,0.08)] backdrop-blur md:p-8">
        <div className="gradient-accent-bar absolute top-0 left-0 right-0 h-1 rounded-t-[36px]" />
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#6F4E3718] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.28em] text-[#6F4E37]">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.789l1.599.799L9 4.323V3a1 1 0 011-1z" /></svg>
              CrepesALatte
            </span>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-[#2C1A0E] md:text-5xl">
              Deal service orchestration for Freshsales.
            </h1>
            <p className="max-w-3xl text-base leading-7 text-[#4A3728] md:text-lg">
              Search a Freshsales deal, add multiple service records, create a CPQ product
              for each service, and attach the saved products back to
              <code className="mx-1 rounded bg-[#F0E8DD] px-2 py-1 font-mono text-sm">
                /deals/{"{deal_id}"}?include=products
              </code>
              in Freshsales.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="stat-card card-hover rounded-3xl border border-[#E0D5C7]/80 bg-[#FFFAF2]/90 p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#5C4A3A]">
                Services
              </p>
              <p className="mt-3 text-3xl font-semibold text-[#2C1A0E]">{services.length}</p>
              <p className="mt-2 text-sm text-[#5C4A3A]">Active service records</p>
            </div>
            <div className="stat-card card-hover rounded-3xl border border-[#E0D5C7]/80 bg-[#FFFAF2]/90 p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#5C4A3A]">
                Deal ID
              </p>
              <p className="mt-3 break-all text-lg font-semibold text-[#2C1A0E]">
                {selectedDeal?.id ?? "Not selected"}
              </p>
              <p className="mt-2 text-sm text-[#5C4A3A]">Freshsales link target</p>
            </div>
            <div className="stat-card card-hover rounded-3xl border border-[#E0D5C7]/80 bg-[#FFFAF2]/90 p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#5C4A3A]">
                Sync Status
              </p>
              <p className="mt-3 text-lg font-semibold text-[#2C1A0E]">
                {lastSyncedValue ? "Last sync ready" : "Awaiting save"}
              </p>
              <p className="mt-2 text-sm text-[#5C4A3A]">Products update after each save</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <div className="animate-fade-in-delay-1 card-hover rounded-[32px] border border-[#E0D5C7]/70 bg-[#FFFAF2]/85 p-6 shadow-[0_24px_80px_rgba(44,26,14,0.08)] backdrop-blur overflow-hidden">
            <div className="space-y-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#5C4A3A]">
                1. Deal Selection
              </p>
              <h2 className="text-2xl font-semibold text-[#2C1A0E]">Search Freshsales</h2>
              <p className="text-sm text-[#4A3728]">{searchNote}</p>
            </div>

            <label className="mt-5 grid gap-2">
              <span className="text-sm font-semibold text-[#3B2314]">Deal search</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Type at least 2 characters"
                className="rounded-2xl border border-[#E0D5C7] bg-[#FFFAF2] px-4 py-3 text-sm text-[#3B2314] outline-none transition focus:border-[#6F4E37] focus:ring-2 focus:ring-[#6F4E3720]"
              />
            </label>

            <div className="mt-5 rounded-2xl bg-[#FAF5EE] p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-[#3B2314]">Matches</span>
                <span className="rounded-full bg-[#FFFAF2] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-[#5C4A3A]">
                  {searchState === "saving" ? "Searching" : `${searchResults.length} result(s)`}
                </span>
              </div>

              <div className="grid gap-2">
                {searchResults.length > 0 ? (
                  searchResults.map((deal) => (
                    <button
                      key={deal.id}
                      type="button"
                      onClick={() => void loadServicesForDeal(deal)}
                      className={`rounded-2xl border px-4 py-3 text-left transition cursor-pointer ${
                        selectedDeal?.id === deal.id
                          ? "border-[#6F4E37] bg-[#6F4E370D]"
                          : "border-[#E0D5C7] bg-[#FFFAF2] hover:border-[#C9B9A8]"
                      }`}
                    >
                      <p className="font-semibold text-[#2C1A0E]">{deal.name}</p>
                      <p className="mt-1 font-mono text-xs text-[#5C4A3A]">{deal.id}</p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#E0D5C7] bg-[#FFFAF2] px-4 py-6 text-sm text-[#5C4A3A]">
                    Search results will appear here.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="animate-fade-in-delay-2 card-hover rounded-[32px] border border-[#E0D5C7]/70 bg-[#FFFAF2]/85 p-6 shadow-[0_24px_80px_rgba(44,26,14,0.08)] backdrop-blur overflow-hidden">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#5C4A3A]">
              2. Service Summary
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[#2C1A0E]">Combined final value</h2>
            <p className="mt-2 text-sm text-[#4A3728] break-words">
              Each service becomes
              <code className="mx-1 rounded bg-[#F0E8DD] px-2 py-1 font-mono text-xs break-all">
                Category_SubCategory_BaseService|Flavor1,Flavor2
              </code>
              and all saved services join with semicolons.
            </p>

            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl border border-dashed border-[#6F4E3730] bg-[#6F4E370A] p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#6F4E37]">
                  Draft payload
                </p>
                <p className="mt-2 break-all text-sm text-[#3B2314]">
                  {draftCombinedValue || "Draft payload will build as you configure services."}
                </p>
              </div>
              <div className="rounded-2xl border border-dashed border-[#B8860B30] bg-[#B8860B0A] p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#8B6914]">
                  Last synced summary
                </p>
                <p className="mt-2 break-all text-sm text-[#3B2314]">
                  {lastSyncedValue || "No sync has happened yet for the current deal."}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <section className="space-y-6">
          <div className="animate-fade-in-delay-1 flex flex-col gap-4 rounded-[32px] border border-[#E0D5C7]/70 bg-[#FFFAF2]/85 p-6 shadow-[0_24px_80px_rgba(44,26,14,0.08)] backdrop-blur md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#5C4A3A]">
                3. Service Records
              </p>
              <h2 className="text-2xl font-semibold text-[#2C1A0E]">
                {selectedDeal ? selectedDeal.name : "Select a deal to begin"}
              </h2>
              <p className="text-sm text-[#4A3728]">{panelNote}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleAddService()}
              disabled={!selectedDeal || isCreatingService}
              className="btn-primary rounded-full bg-[#2C1A0E] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3B2314] disabled:cursor-not-allowed disabled:bg-[#C4A882] cursor-pointer"
            >
              {isCreatingService ? "Creating..." : "Add service"}
            </button>
          </div>

          {isLoadingServices ? (
            <div className="animate-shimmer rounded-[32px] border border-dashed border-[#D4C5B3] bg-[#FFFAF2]/70 p-10 text-center text-sm text-[#5C4A3A]">
              Loading service records...
            </div>
          ) : services.length > 0 ? (
            <div className="grid gap-6">
              {services.map((service, index) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  serviceNumber={index + 1}
                  baseServiceSelectionOptions={getBaseServiceSelectionOptions(
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
            <div className="animate-fade-in-delay-2 rounded-[32px] border border-dashed border-[#D4C5B3] bg-[#FFFAF2]/70 p-10 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#6F4E3712]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-[#6F4E37]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#5C4A3A]">
                Getting Started
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-[#2C1A0E]">
                No service blocks yet
              </h3>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#4A3728]">
                Choose a Freshsales deal, then create service blocks. Every block gets its own
                UUID, becomes its own Freshsales CPQ product, and gets attached to the
                selected deal when saved.
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
