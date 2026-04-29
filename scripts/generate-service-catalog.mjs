import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import xlsx from "xlsx";

const workbookPath = process.argv[2];

if (!workbookPath) {
  console.error(
    "Usage: npm run generate:catalog -- \"C:/path/to/CAL workbook.xlsx\"",
  );
  process.exit(1);
}

const resolvedWorkbookPath = path.resolve(workbookPath);
const outputPath = path.resolve("data/service-catalog.json");
const targetSheetName = "Sheet1";

if (!fs.existsSync(resolvedWorkbookPath)) {
  console.error(`Workbook not found: ${resolvedWorkbookPath}`);
  process.exit(1);
}

function normalizeCellValue(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim();
}

function splitCellLines(value) {
  const normalized = normalizeCellValue(value);

  if (!normalized) {
    return [];
  }

  return Array.from(
    new Set(
      normalized
        .split(/\n+/)
        .map((line) => line.trim().replace(/^\d+\)\s*/, ""))
        .filter(Boolean),
    ),
  );
}

const workbook = xlsx.readFile(resolvedWorkbookPath, {
  cellDates: false,
  raw: false,
});

const worksheet = workbook.Sheets[targetSheetName] ?? workbook.Sheets[workbook.SheetNames[0]];

if (!worksheet) {
  console.error(`Sheet not found: ${targetSheetName}`);
  process.exit(1);
}

const rows = xlsx.utils.sheet_to_json(worksheet, {
  header: 1,
  defval: "",
  raw: false,
});

function getMergedCellValue(rowIndex, columnIndex) {
  const merge = (worksheet["!merges"] || []).find(
    (range) =>
      rowIndex >= range.s.r &&
      rowIndex <= range.e.r &&
      columnIndex >= range.s.c &&
      columnIndex <= range.e.c,
  );

  if (!merge) {
    return undefined;
  }

  return rows[merge.s.r]?.[merge.s.c];
}

function getCell(cells, rowIndex, columnIndex) {
  const value = cells[columnIndex];
  if (normalizeCellValue(value)) {
    return value;
  }

  return getMergedCellValue(rowIndex, columnIndex) ?? value;
}

function splitSemicolonValues(value) {
  const normalized = normalizeCellValue(value);

  if (!normalized) {
    return [];
  }

  return Array.from(
    new Set(
      normalized
        .split(/[;\n]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

const serviceRows = rows
  .slice(1)
  .map((row, index) => {
    const rowIndex = index + 1;
    const cells = Array.isArray(row) ? row : [];
    const status = getCell(cells, rowIndex, 0);
    const serviceOrderId = getCell(cells, rowIndex, 1);
    const category = getCell(cells, rowIndex, 2);
    const subCategory = getCell(cells, rowIndex, 3);
    const universalPlatform = getCell(cells, rowIndex, 4);
    const baseServiceName = getCell(cells, rowIndex, 5);
    const itemType = getCell(cells, rowIndex, 6);
    const flavorEnhancementItem = getCell(cells, rowIndex, 7);
    const aui = getCell(cells, rowIndex, 8);
    const updatedMainMachine = getCell(cells, rowIndex, 17);
    const updatedMachine2 = getCell(cells, rowIndex, 18);
    const updatedMachine3 = getCell(cells, rowIndex, 19);
    const normalizedType = normalizeCellValue(itemType).toLowerCase();
    const normalizedItem = normalizeCellValue(flavorEnhancementItem).replace(
      /^\d+\)\s*/,
      "",
    );

    return {
      rowNumber: index + 2,
      sourceRowNumber: index + 2,
      status: normalizeCellValue(status),
      serviceOrderId: normalizeCellValue(serviceOrderId),
      category: normalizeCellValue(category),
      subCategory: normalizeCellValue(subCategory),
      universalPlatform: normalizeCellValue(universalPlatform),
      baseServiceName: normalizeCellValue(baseServiceName),
      itemType: normalizeCellValue(itemType),
      flavorEnhancementItem: normalizedItem,
      flavors: normalizedType.includes("flavor") && normalizedItem
        ? [normalizedItem]
        : [],
      serviceSpecificEnhancements:
        (normalizedType.includes("enhancement") ||
          normalizedType.includes("enh.") ||
          normalizedType.includes("modifier")) &&
        normalizedItem
          ? [normalizedItem]
          : [],
      aui: splitCellLines(aui),
      groceryYN: normalizeCellValue(getCell(cells, rowIndex, 9)),
      groceryNeeds: normalizeCellValue(getCell(cells, rowIndex, 10)),
      kitchenPrepNeededYN: normalizeCellValue(getCell(cells, rowIndex, 11)),
      kitchenPrepItems: normalizeCellValue(getCell(cells, rowIndex, 12)),
      carryThroughYN: normalizeCellValue(getCell(cells, rowIndex, 13)),
      carryThroughItems: normalizeCellValue(getCell(cells, rowIndex, 14)),
      orderItemsFromCC: normalizeCellValue(getCell(cells, rowIndex, 15)),
      ccItems: normalizeCellValue(getCell(cells, rowIndex, 16)),
      updatedMainMachine: splitSemicolonValues(updatedMainMachine),
      updatedMachine2: splitSemicolonValues(updatedMachine2),
      updatedMachine3: splitSemicolonValues(updatedMachine3),
      strategicAttributes: normalizeCellValue(getCell(cells, rowIndex, 20)),
      exclusivityKeys: normalizeCellValue(getCell(cells, rowIndex, 21)),
      staff: normalizeCellValue(getCell(cells, rowIndex, 22)),
      preSupplyTier: normalizeCellValue(getCell(cells, rowIndex, 23)),
      twoDayPrice: normalizeCellValue(getCell(cells, rowIndex, 24)),
      threeDayPrice: normalizeCellValue(getCell(cells, rowIndex, 25)),
      fourDayPrice: normalizeCellValue(getCell(cells, rowIndex, 26)),
      notes: normalizeCellValue(getCell(cells, rowIndex, 27)),
    };
  })
  .filter(
    (row) =>
      row.category &&
      row.subCategory &&
      row.universalPlatform &&
      row.baseServiceName,
  );

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(serviceRows, null, 2)}\n`);

console.log(
  `Generated ${serviceRows.length} catalog rows in ${path.relative(process.cwd(), outputPath)}`,
);
