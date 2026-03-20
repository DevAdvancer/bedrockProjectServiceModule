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
const targetSheetName = "Reclassified Svcs for Base Svc";

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

const serviceRows = rows
  .slice(1)
  .map((row, index) => {
    const cells = Array.isArray(row) ? row : [];
    const [
      serviceOrderId,
      category,
      subCategory,
      universalPlatform,
      baseServiceName,
      flavors,
      serviceSpecificEnhancements,
      aui,
      updatedMainMachine,
      updatedMachine2,
      updatedMachine3,
    ] = cells;

    return {
      rowNumber: index + 2,
      serviceOrderId: normalizeCellValue(serviceOrderId),
      category: normalizeCellValue(category),
      subCategory: normalizeCellValue(subCategory),
      universalPlatform: normalizeCellValue(universalPlatform),
      baseServiceName: normalizeCellValue(baseServiceName),
      flavors: splitCellLines(flavors),
      serviceSpecificEnhancements: splitCellLines(serviceSpecificEnhancements),
      aui: normalizeCellValue(aui),
      updatedMainMachine: normalizeCellValue(updatedMainMachine),
      updatedMachine2: normalizeCellValue(updatedMachine2),
      updatedMachine3: normalizeCellValue(updatedMachine3),
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

