import { TsvConverterSettings } from '../types';

export interface TsvParseResult {
  data: any;
  jsonString: string;
  rowCount: number;
  colCount: number;
  headers: string[];
  error?: string;
}

export function parseDelimitedText(
  text: string,
  settings: TsvConverterSettings
): TsvParseResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      data: [],
      jsonString: '',
      rowCount: 0,
      colCount: 0,
      headers: [],
    };
  }

  // Determine delimiter
  let delimiter = '\t';
  if (settings.delimiter === 'comma') {
    delimiter = ',';
  } else if (settings.delimiter === 'tab') {
    delimiter = '\t';
  } else {
    // Auto detect: check first line
    const firstLine = trimmed.split('\n')[0] || '';
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;

    if (tabCount >= commaCount && tabCount >= semicolonCount && tabCount > 0) {
      delimiter = '\t';
    } else if (commaCount > tabCount && commaCount >= semicolonCount) {
      delimiter = ',';
    } else if (semicolonCount > 0) {
      delimiter = ';';
    } else {
      delimiter = '\t';
    }
  }

  // Parse lines with quote handling
  const rows = parseRows(trimmed, delimiter);
  if (rows.length === 0) {
    return {
      data: [],
      jsonString: '[]',
      rowCount: 0,
      colCount: 0,
      headers: [],
    };
  }

  const colCount = Math.max(...rows.map((r) => r.length), 0);

  const convertValue = (val: string) => {
    if (!settings.parseTypes) return val;
    const trimmedVal = val.trim();
    if (trimmedVal === '') return '';
    if (trimmedVal.toLowerCase() === 'true') return true;
    if (trimmedVal.toLowerCase() === 'false') return false;
    if (trimmedVal.toLowerCase() === 'null') return null;
    if (!isNaN(Number(trimmedVal)) && trimmedVal !== '') {
      return Number(trimmedVal);
    }
    // Check if value is itself a JSON object or array
    if (
      (trimmedVal.startsWith('{') && trimmedVal.endsWith('}')) ||
      (trimmedVal.startsWith('[') && trimmedVal.endsWith(']'))
    ) {
      try {
        return JSON.parse(trimmedVal);
      } catch {
        // keep as string
      }
    }
    return val;
  };

  if (settings.hasHeader && rows.length > 0) {
    const rawHeaders = rows[0];
    const headers = rawHeaders.map((h, i) => (h.trim() ? h.trim() : `column_${i + 1}`));
    const dataRows = rows.slice(1);
    const data = dataRows.map((row) => {
      const obj: Record<string, any> = {};
      headers.forEach((header, index) => {
        obj[header] = convertValue(row[index] !== undefined ? row[index] : '');
      });
      return obj;
    });

    const jsonString = JSON.stringify(data, null, 2);
    return {
      data,
      jsonString,
      rowCount: data.length,
      colCount: headers.length,
      headers,
    };
  } else {
    const data = rows.map((row) => row.map(convertValue));
    const jsonString = JSON.stringify(data, null, 2);
    return {
      data,
      jsonString,
      rowCount: data.length,
      colCount,
      headers: [],
    };
  }
}

// Helper to handle delimited strings respecting double quotes
function parseRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentVal);
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \r\n
      }
      currentRow.push(currentVal);
      rows.push(currentRow);
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal !== '' || currentRow.length > 0) {
    currentRow.push(currentVal);
    rows.push(currentRow);
  }

  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0].trim() !== ''));
}
