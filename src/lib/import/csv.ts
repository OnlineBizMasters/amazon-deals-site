/**
 * Minimal RFC 4180 CSV reader.
 *
 * Handles quoted fields, escaped quotes (`""`), embedded commas and newlines,
 * CRLF/LF line endings, a UTF-8 BOM, and comma/semicolon/tab delimiters. Written
 * by hand so feed parsing has no runtime dependency and is fully unit-testable.
 */

export interface CsvParseResult {
  headers: string[];
  /** Header-keyed rows. Missing trailing columns become empty strings. */
  rows: Record<string, string>[];
  /** Positional cells, useful for error reporting. */
  cells: string[][];
  delimiter: string;
  /** 1-based source line for each row, so errors can point at the file. */
  lineNumbers: number[];
}

const DELIMITER_CANDIDATES = [",", ";", "\t", "|"];

export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  let best = ",";
  let bestCount = 0;

  for (const candidate of DELIMITER_CANDIDATES) {
    // Count only delimiters outside quoted sections of the header line.
    let count = 0;
    let inQuotes = false;
    for (let i = 0; i < firstLine.length; i += 1) {
      const char = firstLine[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (!inQuotes && char === candidate) count += 1;
    }
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }

  return best;
}

/** Normalises a header cell: `Coupon Code` and `coupon-code` both become `coupon_code`. */
export function normalizeHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export function parseCsv(input: string, options: { delimiter?: string } = {}): CsvParseResult {
  const text = input.replace(/^\uFEFF/, "");
  const delimiter = options.delimiter ?? detectDelimiter(text);

  const records: string[][] = [];
  const recordLines: number[] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  let line = 1;
  let recordStartLine = 1;
  let sawContent = false;

  const pushField = () => {
    record.push(field);
    field = "";
  };

  const pushRecord = () => {
    pushField();
    // Skip blank lines entirely rather than emitting empty records.
    const isBlank = record.length === 1 && record[0].trim() === "";
    if (!isBlank) {
      records.push(record);
      recordLines.push(recordStartLine);
    }
    record = [];
    sawContent = false;
    recordStartLine = line + 1;
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        if (char === "\n") line += 1;
        field += char;
      }
      continue;
    }

    if (char === '"' && field.trim() === "") {
      field = "";
      inQuotes = true;
      sawContent = true;
      continue;
    }

    if (char === delimiter) {
      pushField();
      sawContent = true;
      continue;
    }

    if (char === "\r") continue;

    if (char === "\n") {
      pushRecord();
      line += 1;
      continue;
    }

    field += char;
    sawContent = true;
  }

  if (sawContent || field !== "" || record.length > 0) {
    pushRecord();
  }

  if (records.length === 0) {
    return { headers: [], rows: [], cells: [], delimiter, lineNumbers: [] };
  }

  const headers = records[0].map(normalizeHeader);
  const cells = records.slice(1);
  const lineNumbers = recordLines.slice(1);

  const rows = cells.map((cellRow) => {
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (!header) return;
      row[header] = (cellRow[index] ?? "").trim();
    });
    return row;
  });

  return { headers, rows, cells, delimiter, lineNumbers };
}

/** Serialises rows back to CSV — used for the downloadable import template. */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (value: string | number | null | undefined): string => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  return [headers.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))].join("\n");
}
