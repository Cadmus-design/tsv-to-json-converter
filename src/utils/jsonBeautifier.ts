import { JsonBeautifierSettings } from '../types';

export interface JsonFormatResult {
  isValid: boolean;
  parsedData: any;
  formattedJson: string;
  error?: {
    message: string;
    line?: number;
    column?: number;
    snippet?: string;
  };
  stats: {
    sizeBytes: number;
    keyCount: number;
    depth: number;
    type: 'object' | 'array' | 'primitive';
  };
}

export function sortObjectKeys(data: any): any {
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(sortObjectKeys);
  }
  const sorted: Record<string, any> = {};
  Object.keys(data)
    .sort((a, b) => a.localeCompare(b))
    .forEach((key) => {
      sorted[key] = sortObjectKeys(data[key]);
    });
  return sorted;
}

export function calculateJsonStats(data: any): { keyCount: number; depth: number; type: 'object' | 'array' | 'primitive' } {
  if (data === null || typeof data !== 'object') {
    return { keyCount: 0, depth: 1, type: 'primitive' };
  }

  let keyCount = 0;
  let maxDepth = 1;

  function traverse(current: any, depth: number) {
    if (depth > maxDepth) maxDepth = depth;
    if (current && typeof current === 'object') {
      if (Array.isArray(current)) {
        current.forEach((item) => traverse(item, depth + 1));
      } else {
        const keys = Object.keys(current);
        keyCount += keys.length;
        keys.forEach((k) => traverse(current[k], depth + 1));
      }
    }
  }

  traverse(data, 1);

  return {
    keyCount,
    depth: maxDepth,
    type: Array.isArray(data) ? 'array' : 'object',
  };
}

export function formatAndValidateJson(
  input: string,
  settings: JsonBeautifierSettings
): JsonFormatResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      isValid: true,
      parsedData: null,
      formattedJson: '',
      stats: { sizeBytes: 0, keyCount: 0, depth: 0, type: 'primitive' },
    };
  }

  try {
    let parsed = JSON.parse(trimmed);

    if (settings.sortKeys) {
      parsed = sortObjectKeys(parsed);
    }

    let indent: string | number = 2;
    if (settings.indentType === '4') indent = 4;
    else if (settings.indentType === 'tab') indent = '\t';
    else if (settings.indentType === 'compact') indent = 0;

    const formattedJson =
      settings.indentType === 'compact'
        ? JSON.stringify(parsed)
        : JSON.stringify(parsed, null, indent);

    const stats = calculateJsonStats(parsed);
    const sizeBytes = new Blob([formattedJson]).size;

    return {
      isValid: true,
      parsedData: parsed,
      formattedJson,
      stats: {
        ...stats,
        sizeBytes,
      },
    };
  } catch (err: any) {
    const errorMsg = err.message || 'Invalid JSON format';
    let line: number | undefined;
    let column: number | undefined;
    let snippet: string | undefined;

    // Extract line/column information from error message (e.g. "at position 123" or "line 3 column 5")
    const posMatch = errorMsg.match(/position\s+(\d+)/i);
    const lineColMatch = errorMsg.match(/line\s+(\d+)\s+column\s+(\d+)/i);

    if (lineColMatch) {
      line = parseInt(lineColMatch[1], 10);
      column = parseInt(lineColMatch[2], 10);
    } else if (posMatch) {
      const position = parseInt(posMatch[1], 10);
      const lines = trimmed.slice(0, position).split('\n');
      line = lines.length;
      column = lines[lines.length - 1].length + 1;
    }

    if (line !== undefined) {
      const allLines = trimmed.split('\n');
      const targetLine = allLines[line - 1] || '';
      snippet = targetLine.trim();
    }

    return {
      isValid: false,
      parsedData: null,
      formattedJson: input,
      error: {
        message: errorMsg,
        line,
        column,
        snippet,
      },
      stats: {
        sizeBytes: new Blob([input]).size,
        keyCount: 0,
        depth: 0,
        type: 'primitive',
      },
    };
  }
}

export function highlightJsonToHtml(json: string): string {
  if (!json) return '';

  const escaped = json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'text-amber-400'; // number default
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          // Key: cyan-400
          cls = 'text-cyan-400 font-semibold';
        } else {
          // String value: emerald-400
          cls = 'text-emerald-400';
        }
      } else if (/true|false/.test(match)) {
        // Boolean: purple-400
        cls = 'text-purple-400 font-semibold';
      } else if (/null/.test(match)) {
        // Null: red-400
        cls = 'text-rose-400 italic';
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}
