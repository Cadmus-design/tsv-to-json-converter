import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clipboard, 
  Check, 
  Trash2, 
  Settings, 
  Code, 
  Sparkles, 
  History, 
  Copy, 
  RefreshCw, 
  FileCode, 
  ChevronRight, 
  HelpCircle, 
  ArrowRight,
  Info,
  FileSpreadsheet,
  Braces,
  Download,
  Upload,
  Code2,
  ListTree,
  ExternalLink,
  AlertCircle,
  FileText
} from 'lucide-react';
import { 
  PRESET_EXAMPLES, 
  PRESET_TEXT_EXAMPLES, 
  PRESET_TSV_EXAMPLES, 
  PRESET_JSON_EXAMPLES 
} from './data/examples';
import { cleanCode, purifyText } from './utils/cleaner';
import { parseDelimitedText } from './utils/tsvConverter';
import { formatAndValidateJson, highlightJsonToHtml } from './utils/jsonBeautifier';
import { JsonTreeView } from './components/JsonTreeView';
import { 
  CleanPattern, 
  CleanerSettings, 
  TextPurifierSettings, 
  TsvConverterSettings, 
  JsonBeautifierSettings, 
  HistoryItem 
} from './types';

// Default settings
const DEFAULT_SETTINGS: CleanerSettings = {
  pattern: 'Auto',
  customRegex: '^\\s*\\d+[:.)]\\s?',
  trimLines: false,
  removeBlankLines: false,
  autoCopy: true,
  preserveIndent: true,
  stripMarkdown: true,
  stripBullets: false,
  newlineMode: 'enter'
};

const DEFAULT_TEXT_SETTINGS: TextPurifierSettings = {
  removeLeadingSpaces: true,
  removeTrailingSpaces: true,
  collapseNewlines: true,
  removeLineBreakInParagraph: false,
  removeSpacesBetweenChinese: true,
  normalizeSpaces: true,
  stripEmoji: false,
  stripBullets: false,
  autoCopy: true,
  newlineMode: 'enter'
};

const DEFAULT_TSV_SETTINGS: TsvConverterSettings = {
  delimiter: 'auto',
  hasHeader: true,
  parseTypes: true,
  autoCopy: true
};

const DEFAULT_JSON_SETTINGS: JsonBeautifierSettings = {
  indentType: '2',
  sortKeys: false,
  viewMode: 'code'
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default function App() {
  // Active Tab: 4 tools
  const [activeTab, setActiveTab] = useState<'code' | 'text' | 'tsv' | 'json'>(() => {
    const saved = localStorage.getItem('codestripper_active_tab_v14');
    if (saved === 'code' || saved === 'text' || saved === 'tsv' || saved === 'json') {
      return saved;
    }
    return 'code';
  });

  // Inputs
  const [inputText, setInputText] = useState('');
  const [tsvInput, setTsvInput] = useState('');
  const [jsonInput, setJsonInput] = useState('');

  // Settings
  const [settings, setSettings] = useState<CleanerSettings>(() => {
    const saved = localStorage.getItem('code_cleaner_settings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [textSettings, setTextSettings] = useState<TextPurifierSettings>(() => {
    const saved = localStorage.getItem('text_purifier_settings');
    if (saved) {
      try {
        return { ...DEFAULT_TEXT_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_TEXT_SETTINGS;
      }
    }
    return DEFAULT_TEXT_SETTINGS;
  });

  const [tsvSettings, setTsvSettings] = useState<TsvConverterSettings>(() => {
    const saved = localStorage.getItem('tsv_converter_settings');
    if (saved) {
      try {
        return { ...DEFAULT_TSV_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_TSV_SETTINGS;
      }
    }
    return DEFAULT_TSV_SETTINGS;
  });

  const [jsonSettings, setJsonSettings] = useState<JsonBeautifierSettings>(() => {
    const saved = localStorage.getItem('json_beautifier_settings');
    if (saved) {
      try {
        return { ...DEFAULT_JSON_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_JSON_SETTINGS;
      }
    }
    return DEFAULT_JSON_SETTINGS;
  });

  // History & Sidebar
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('code_cleaner_history_v2');
    return saved ? JSON.parse(saved) : [];
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Status flags
  const [isCopied, setIsCopied] = useState(false);
  const [isPasted, setIsPasted] = useState(false);
  const [showSettingsHelp, setShowSettingsHelp] = useState(false);
  const [regexError, setRegexError] = useState<string | null>(null);
  const [handoffNotice, setHandoffNotice] = useState<string | null>(null);

  // References
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local storage persistence
  useEffect(() => {
    localStorage.setItem('codestripper_active_tab_v14', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('code_cleaner_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('text_purifier_settings', JSON.stringify(textSettings));
  }, [textSettings]);

  useEffect(() => {
    localStorage.setItem('tsv_converter_settings', JSON.stringify(tsvSettings));
  }, [tsvSettings]);

  useEffect(() => {
    localStorage.setItem('json_beautifier_settings', JSON.stringify(jsonSettings));
  }, [jsonSettings]);

  useEffect(() => {
    localStorage.setItem('code_cleaner_history_v2', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  // Check custom regex validity
  useEffect(() => {
    if (settings.pattern === 'Custom' && settings.customRegex) {
      try {
        new RegExp(settings.customRegex);
        setRegexError(null);
      } catch (e: any) {
        setRegexError(e.message || 'Invalid Regular Expression');
      }
    } else {
      setRegexError(null);
    }
  }, [settings.pattern, settings.customRegex]);

  // Code & Text Cleaner Results
  const cleanResult = useMemo(() => {
    if (activeTab === 'code') {
      return cleanCode(inputText, settings);
    } else if (activeTab === 'text') {
      const cleaned = purifyText(inputText, textSettings);
      return {
        cleanedText: cleaned,
        detectedPattern: 'Text Purify',
        detectionConfidence: undefined
      };
    }
    return { cleanedText: '', detectedPattern: '', detectionConfidence: undefined };
  }, [inputText, settings, textSettings, activeTab]);

  // TSV Converter Results
  const tsvResult = useMemo(() => {
    if (activeTab !== 'tsv') return { data: [], jsonString: '', rowCount: 0, colCount: 0, headers: [] };
    return parseDelimitedText(tsvInput, tsvSettings);
  }, [tsvInput, tsvSettings, activeTab]);

  // JSON Beautifier Results
  const jsonResult = useMemo(() => {
    if (activeTab !== 'json') {
      return {
        isValid: true,
        parsedData: null,
        formattedJson: '',
        stats: { sizeBytes: 0, keyCount: 0, depth: 0, type: 'primitive' as const }
      };
    }
    return formatAndValidateJson(jsonInput, jsonSettings);
  }, [jsonInput, jsonSettings, activeTab]);

  // Clipboard copy handler
  const handleCopy = async (textToCopy?: string) => {
    let target = textToCopy;
    if (target === undefined) {
      if (activeTab === 'code' || activeTab === 'text') {
        target = cleanResult.cleanedText;
      } else if (activeTab === 'tsv') {
        target = tsvResult.jsonString;
      } else if (activeTab === 'json') {
        target = jsonResult.formattedJson;
      }
    }

    if (!target) return;

    try {
      if (activeTab === 'code' || activeTab === 'text') {
        const mode = activeTab === 'code' ? settings.newlineMode : textSettings.newlineMode;
        const selectMode = mode || 'enter';

        if (selectMode === 'shiftEnter') {
          await navigator.clipboard.writeText(target);
        } else {
          let plainText = target;
          if (selectMode === 'doubleEnter') {
            const lines = target.split(/\r?\n/);
            const reconstructedLines: string[] = [];
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].trim() === '') {
                if (reconstructedLines.length > 0 && reconstructedLines[reconstructedLines.length - 1] === '') {
                  continue;
                }
                reconstructedLines.push('');
              } else {
                reconstructedLines.push(lines[i]);
              }
            }
            plainText = reconstructedLines.join('\r\n\r\n');
          } else {
            plainText = target.replace(/\r?\n/g, '\r\n');
          }

          const htmlLines = (selectMode === 'doubleEnter' ? plainText : target).split(/\r?\n/);
          const htmlContent = htmlLines.map(line => {
            if (line.trim() === '') {
              return '<p>&nbsp;</p>';
            }
            const leadingMatch = line.match(/^([ \t]+)/);
            const leadingSpaces = leadingMatch ? leadingMatch[1] : '';
            const trailingText = line.substring(leadingSpaces.length);
            const escaped = escapeHtml(trailingText);
            const padding = '&nbsp;'.repeat(leadingSpaces.length);
            return `<p style="margin: 0 0 8px 0; font-family: monospace; white-space: pre;">${padding}${escaped}</p>`;
          }).join('');

          if (navigator.clipboard && window.ClipboardItem) {
            try {
              const textBlob = new Blob([plainText], { type: 'text/plain' });
              const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
              const item = new ClipboardItem({
                'text/plain': textBlob,
                'text/html': htmlBlob
              });
              await navigator.clipboard.write([item]);
            } catch {
              await navigator.clipboard.writeText(plainText);
            }
          } else {
            await navigator.clipboard.writeText(plainText);
          }
        }
      } else {
        // Plain text copy for TSV and JSON
        await navigator.clipboard.writeText(target);
      }

      setIsCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      try {
        await navigator.clipboard.writeText(target);
        setIsCopied(true);
      } catch (fallbackErr) {
        console.error('Absolute fallback copy failed: ', fallbackErr);
      }
    }
  };

  // Paste handler
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;

      if (activeTab === 'code' || activeTab === 'text') {
        setInputText(text);
        setIsPasted(true);
        setTimeout(() => setIsPasted(false), 1500);

        const isAutoCopy = activeTab === 'code' ? settings.autoCopy : textSettings.autoCopy;
        if (isAutoCopy) {
          const cleanText = activeTab === 'code'
            ? cleanCode(text, settings).cleanedText
            : purifyText(text, textSettings);
          if (cleanText) {
            await handleCopy(cleanText);
          }
        }
      } else if (activeTab === 'tsv') {
        setTsvInput(text);
        setIsPasted(true);
        setTimeout(() => setIsPasted(false), 1500);
        if (tsvSettings.autoCopy) {
          const parsed = parseDelimitedText(text, tsvSettings);
          if (parsed.jsonString) {
            await handleCopy(parsed.jsonString);
          }
        }
      } else if (activeTab === 'json') {
        setJsonInput(text);
        setIsPasted(true);
        setTimeout(() => setIsPasted(false), 1500);
      }
    } catch {
      // Fallback message
      alert('請直接按 Ctrl+V (或 Cmd+V) 貼到輸入框中。瀏覽器安全防護不允許直接存取剪貼簿。');
    }
  };

  // Save to history snapshot
  const handleSaveToHistory = () => {
    let original = '';
    let cleaned = '';
    let patternLabel = '';

    if (activeTab === 'code') {
      original = inputText;
      cleaned = cleanResult.cleanedText;
      patternLabel = `${cleanResult.detectedPattern} ${cleanResult.detectionConfidence ? `(${cleanResult.detectionConfidence}%)` : ''}`;
    } else if (activeTab === 'text') {
      original = inputText;
      cleaned = cleanResult.cleanedText;
      patternLabel = 'Text Purify';
    } else if (activeTab === 'tsv') {
      original = tsvInput;
      cleaned = tsvResult.jsonString;
      patternLabel = `TSV -> JSON (${tsvResult.rowCount} 列)`;
    } else if (activeTab === 'json') {
      original = jsonInput;
      cleaned = jsonResult.formattedJson;
      patternLabel = `JSON Beautifier (${jsonSettings.indentType} spaces)`;
    }

    if (!original.trim() || !cleaned.trim()) return;
    if (history.length > 0 && history[0].originalText === original) return;

    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      originalText: original,
      cleanedText: cleaned,
      detectedPattern: patternLabel,
      mode: activeTab
    };

    setHistory(prev => [newItem, ...prev].slice(0, 50));
  };

  // Clear current inputs
  const handleClear = () => {
    if (activeTab === 'code' || activeTab === 'text') {
      setInputText('');
    } else if (activeTab === 'tsv') {
      setTsvInput('');
    } else if (activeTab === 'json') {
      setJsonInput('');
    }
  };

  // Download converted or formatted JSON
  const handleDownloadJson = (content: string, filenamePrefix: string) => {
    if (!content) return;
    const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // File upload for TSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setTsvInput(content);
        if (tsvSettings.autoCopy) {
          const parsed = parseDelimitedText(content, tsvSettings);
          if (parsed.jsonString) {
            handleCopy(parsed.jsonString);
          }
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Cross-tool Handoff: Send TSV output to JSON Beautifier
  const handleSendTsvToJsonBeautifier = () => {
    if (!tsvResult.jsonString) return;
    setJsonInput(tsvResult.jsonString);
    setActiveTab('json');
    setHandoffNotice('已成功將 TSV 轉換結果送入 JSON 美化工具！');
    setTimeout(() => setHandoffNotice(null), 3000);
  };

  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const handleClearAllHistory = () => {
    setHistory([]);
  };

  // Check if current view has active input
  const currentInputLength = useMemo(() => {
    if (activeTab === 'code' || activeTab === 'text') return inputText.length;
    if (activeTab === 'tsv') return tsvInput.length;
    if (activeTab === 'json') return jsonInput.length;
    return 0;
  }, [activeTab, inputText, tsvInput, jsonInput]);

  return (
    <div className="min-h-screen bg-elegant-dark text-elegant-gray font-sans flex flex-col selection:bg-elegant-cyan selection:text-elegant-dark">
      
      {/* Background Subtle Tech Ambient Gradients */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px] z-0" />
      <div className="fixed top-0 left-1/3 w-[600px] h-[350px] bg-elegant-cyan/5 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-12 right-1/4 w-[500px] h-[300px] bg-elegant-teal/5 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* TOP HEADER BAR (CODESTRIPPER v1.5) */}
      <header className="border-b border-elegant-border bg-elegant-dark/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-elegant-cyan to-elegant-teal rounded-lg flex items-center justify-center shadow-lg shadow-elegant-cyan/10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5.5 w-5.5 text-elegant-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758L5 19m0-14l4.121 4.121" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white font-display">
                  CODESTRIPPER <span className="text-elegant-cyan">v1.5</span>
                </span>
                <span className="text-[10px] tracking-wider uppercase font-mono bg-elegant-teal/10 text-elegant-teal border border-elegant-teal/30 px-2 py-0.5 rounded">
                  Gemini Tool Suite
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                快速在本地端清除 AI CLI 代碼行號、淨化文本空白、TSV 轉 JSON 與樹狀圖 JSON 美化檢視
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-[#45A29E]">
            {/* Dynamic Status Indicator */}
            {activeTab === 'code' && inputText && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-elegant-teal/5 border border-elegant-teal/25 rounded-md text-xs text-elegant-teal">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>動態格式: <strong className="text-white">{cleanResult.detectedPattern}</strong></span>
              </div>
            )}
            {activeTab === 'text' && inputText && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-elegant-teal/5 border border-elegant-teal/25 rounded-md text-xs text-elegant-teal">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>文本淨化已套用</span>
              </div>
            )}
            {activeTab === 'tsv' && tsvInput && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-elegant-teal/5 border border-elegant-teal/25 rounded-md text-xs text-elegant-teal">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span>TSV 轉換: <strong className="text-white">{tsvResult.rowCount} 列</strong></span>
              </div>
            )}
            {activeTab === 'json' && jsonInput && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-elegant-teal/5 border border-elegant-teal/25 rounded-md text-xs text-elegant-teal">
                <span className={`w-2 h-2 rounded-full ${jsonResult.isValid ? 'bg-emerald-400' : 'bg-rose-500'} animate-pulse`}></span>
                <span>{jsonResult.isValid ? 'JSON 格式有效' : 'JSON 格式異常'}</span>
              </div>
            )}

            <a
              href="./v1.5-source.tar.gz"
              download="v1.5-source.tar.gz"
              className="flex items-center gap-1.5 px-3 py-2 rounded bg-gradient-to-r from-elegant-cyan/20 to-elegant-teal/20 hover:from-elegant-cyan/30 hover:to-elegant-teal/30 border border-elegant-cyan/40 text-xs font-semibold text-elegant-cyan hover:text-white transition-all shadow-sm"
              title="下載 v1.5 完整專案代碼包"
            >
              <Download className="w-3.5 h-3.5 text-elegant-cyan" />
              <span>下載 v1.5 原始碼 (.tar.gz)</span>
            </a>

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded border border-elegant-border text-xs font-semibold tracking-wide transition-colors ${
                sidebarOpen 
                  ? 'bg-elegant-border text-white border-elegant-teal/40' 
                  : 'bg-transparent text-slate-400 hover:text-white hover:bg-[#1a212a]'
              }`}
            >
              <History className="w-4 h-4 text-elegant-teal" />
              <span>紀錄 ({history.length})</span>
            </button>
          </div>

        </div>
      </header>

      {/* Cross-Tool Handoff Notification Toast */}
      <AnimatePresence>
        {handoffNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-cyan-600 to-teal-600 text-white px-5 py-2.5 rounded-lg shadow-2xl border border-cyan-400 flex items-center gap-2 font-medium text-xs"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>{handoffNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WORKSPACE AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 relative z-10 overflow-hidden">
        
        {/* Main interactive workflow */}
        <div className="flex-1 flex flex-col gap-6">

          {/* 4-TOOL SEGMENTED NAVIGATION TAB BAR */}
          <div className="flex bg-[#0b1016] p-1.5 rounded-xl border border-elegant-border w-full shadow-lg">
            
            {/* TAB 1: CLI Stripper */}
            <button
              onClick={() => setActiveTab('code')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === 'code'
                  ? 'bg-gradient-to-r from-elegant-cyan to-elegant-teal text-elegant-dark shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span className="truncate">CLI 程式行號清除</span>
            </button>

            {/* TAB 2: Text Purifier */}
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === 'text'
                  ? 'bg-gradient-to-r from-elegant-cyan to-elegant-teal text-elegant-dark shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span className="truncate">AI 文字空白淨化</span>
            </button>

            {/* TAB 3: TSV -> JSON */}
            <button
              onClick={() => setActiveTab('tsv')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === 'tsv'
                  ? 'bg-gradient-to-r from-elegant-cyan to-elegant-teal text-elegant-dark shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="truncate">TSV &rarr; JSON</span>
            </button>

            {/* TAB 4: JSON Beautifier */}
            <button
              onClick={() => setActiveTab('json')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
                activeTab === 'json'
                  ? 'bg-gradient-to-r from-elegant-cyan to-elegant-teal text-elegant-dark shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Braces className="w-4 h-4" />
              <span className="truncate">JSON 美化</span>
            </button>

          </div>
          
          {/* ======================================================== */}
          {/* TAB 1: CODE CLEANER & TAB 2: TEXT PURIFIER                */}
          {/* ======================================================== */}
          {(activeTab === 'code' || activeTab === 'text') && (
            <>
              {/* Preset Buttons Panel */}
              <section className="bg-elegant-card border border-elegant-border rounded-xl p-4.5 shadow-xl shadow-black/40">
                <span className="text-xs font-mono font-bold text-elegant-teal block mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-elegant-cyan" />
                  {activeTab === 'code' ? '快速載入典型 CLI 格式範例：' : '快速載入典型 AI 亂空白文本範例：'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {(activeTab === 'code' ? PRESET_EXAMPLES : PRESET_TEXT_EXAMPLES).map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setInputText(preset.text);
                        const isAutoCopy = activeTab === 'code' ? settings.autoCopy : textSettings.autoCopy;
                        if (isAutoCopy) {
                          const cleanResultText = activeTab === 'code'
                            ? cleanCode(preset.text, settings).cleanedText
                            : purifyText(preset.text, textSettings);
                          if (cleanResultText) {
                            setTimeout(() => handleCopy(cleanResultText), 100);
                          }
                        }
                      }}
                      className="group text-left p-3 rounded-lg bg-elegant-dark/60 hover:bg-[#13171e] border border-elegant-border/70 hover:border-elegant-cyan/40 transition-all text-xs cursor-pointer"
                    >
                      <p className="font-semibold text-white group-hover:text-elegant-cyan transition-colors truncate">
                        {preset.title}
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono block mt-1 truncate">
                        {preset.description}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {/* TWO TEXTAREAS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                
                {/* Input card */}
                <div className="flex flex-col bg-elegant-card border border-elegant-border rounded-xl overflow-hidden focus-within:border-elegant-teal/60 transition-colors shadow-2xl">
                  <div className="px-5 py-3.5 bg-elegant-border/30 border-b border-elegant-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-elegant-teal" />
                      <span className="text-xs font-bold uppercase tracking-widest font-display text-elegant-teal">
                        {activeTab === 'code' ? '原始帶行號代碼 (CLI INPUT)' : '原始帶多餘空白文本 (RAW TEXT)'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePaste}
                        className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-elegant-cyan bg-elegant-cyan/5 border border-elegant-cyan/30 rounded hover:bg-elegant-cyan hover:text-elegant-dark transition-all cursor-pointer"
                      >
                        <Clipboard className="w-3 h-3" />
                        <span>貼上剪貼簿</span>
                      </button>
                      {inputText && (
                        <button
                          onClick={handleClear}
                          className="p-1 text-slate-500 hover:text-rose-450 transition-colors cursor-pointer"
                          title="清除輸入"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="relative flex-1 min-h-[350px] flex flex-col">
                    <textarea
                      id="input-editor"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={
                        activeTab === 'code'
                          ? "在此貼上您的程式碼片段。範例格式：\n 1: import express from 'express';\n 2: const app = express();\n\n或是點上方「載入 CLI 格式範例」瞭解詳情！"
                          : "在此貼上帶有多餘空格、空行或不自然排版換行的中文或對話文本。\n\n例如：\n  目前的計畫是：\n   1. 正式上線月份之前：我們進行清理...\n   2. 正式上線月份之後：維持對帳流程...\n\n可點上方「快速載入典型 AI 亂空白文本範例」快速試用！"
                      }
                      className="w-full flex-1 p-5 bg-transparent outline-none font-mono text-sm leading-relaxed text-slate-300 resize-none min-h-[350px]"
                    />
                    
                    {isPasted && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute bg-elegant-teal text-elegant-dark text-xs font-bold px-3 py-1.5 rounded shadow-lg bottom-3 left-3 flex items-center gap-1.5 pointer-events-none"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>內容已自動貼上！</span>
                      </motion.div>
                    )}

                    <div className="px-5 py-2.5 bg-elegant-dark/85 border-t border-elegant-border flex justify-between items-center text-[10px] font-mono text-slate-400 select-none">
                      <span>
                        輸入行數: <strong className="text-white">{inputText.split('\n').filter(Boolean).length}</strong> 行
                      </span>
                      <span>
                        大小: <strong className="text-white">{inputText.length}</strong> 字元
                      </span>
                    </div>
                  </div>
                </div>

                {/* Output card */}
                <div className="flex flex-col bg-elegant-dark border border-elegant-border rounded-xl overflow-hidden focus-within:border-elegant-cyan/60 transition-colors shadow-2xl">
                  <div className="px-5 py-3.5 bg-[#1F2833]/50 border-b border-elegant-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-elegant-cyan" />
                      <span className="text-xs font-bold uppercase tracking-widest font-display text-elegant-cyan">
                        {activeTab === 'code' ? '乾淨無行號結果 (SANITIZED)' : '清洗與美化後結果 (PURIFIED)'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-elegant-teal/20 text-elegant-cyan font-semibold hidden sm:inline select-none">
                        Ready to Paste
                      </span>
                    </div>
                  </div>

                  <div className="relative flex-1 min-h-[350px] flex flex-col bg-elegant-darker/50">
                    <textarea
                      id="output-editor"
                      ref={outputRef}
                      value={cleanResult.cleanedText}
                      readOnly
                      placeholder={
                        activeTab === 'code' 
                          ? "// 清洗出的乾淨代碼將顯示在此..." 
                          : "// 淨化後的潔淨電子郵件、文本將顯示在此..."
                      }
                      className="w-full flex-1 p-5 bg-transparent outline-none font-mono text-sm leading-relaxed text-elegant-cyan resize-none select-all cursor-text min-h-[350px]"
                    />

                    {inputText && (
                      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                        <span className="px-3 py-1.5 bg-elegant-card border border-elegant-border text-[10px] font-mono rounded shadow-lg text-white flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-elegant-cyan" />
                          {activeTab === 'code' ? (
                            <>偵測為 <strong>{cleanResult.detectedPattern}</strong></>
                          ) : (
                            <>文本格式已自動淨化</>
                          )}
                        </span>
                        {activeTab === 'code' && cleanResult.detectionConfidence !== undefined && settings.pattern === 'Auto' && (
                          <span className="px-2 py-0.5 bg-elegant-card text-[9px] text-slate-400 font-mono rounded border border-elegant-border/80 shadow">
                            信心度: <strong className={cleanResult.detectionConfidence > 70 ? 'text-elegant-cyan' : 'text-amber-500'}>{cleanResult.detectionConfidence}%</strong>
                          </span>
                        )}
                      </div>
                    )}

                    <div className="px-5 py-2.5 bg-elegant-card border-t border-elegant-border flex justify-between items-center text-[10px] font-mono text-slate-400 select-none">
                      <span>
                        輸出行數: <strong className="text-white">{cleanResult.cleanedText.split('\n').filter(Boolean).length}</strong> 行
                      </span>
                      <div className="flex items-center gap-2">
                        {(activeTab === 'code' ? settings.autoCopy : textSettings.autoCopy) && (
                          <span className="bg-elegant-cyan/15 text-elegant-cyan border border-elegant-cyan/20 px-2 py-0.5 rounded text-[8px] tracking-wider uppercase font-bold">
                            ⚡ 貼上自動複製
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* DOCK OPTIONS PANEL */}
              <section className="bg-elegant-card border border-elegant-border rounded-xl p-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-elegant-border pb-4 mb-6 select-none">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-elegant-cyan" />
                    <h3 className="text-base font-bold font-display text-white tracking-wide">
                      {activeTab === 'code' ? '過濾規則與正則設定 (Settings)' : '文本空白與空行規則 (Settings)'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowSettingsHelp(!showSettingsHelp)}
                    className="text-xs text-slate-400 hover:text-elegant-cyan flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>怎麼使用？</span>
                  </button>
                </div>

                <AnimatePresence>
                  {showSettingsHelp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mb-6"
                    >
                      <div className="bg-[#121c24] border border-elegant-teal/30 p-4 rounded-lg text-xs leading-relaxed text-slate-300 shadow-inner">
                        <p className="font-bold text-white mb-1.5 flex items-center gap-1">
                          <Info className="w-3.5 h-3.5 text-elegant-cyan" />
                          {activeTab === 'code' ? '行號清除器說明' : '文本空白淨化器說明'}
                        </p>
                        {activeTab === 'code' ? (
                          <>
                            <p className="mb-2">
                              當 AI CLI 產出程式片段時（或從特定 IDE 複製代碼時），程式前會代行號如 <code className="text-elegant-cyan font-mono">1: const a = 1</code>。本程式會在點擊<strong>「貼上剪貼簿」</strong>之後，自動為您精準清除首碼。
                            </p>
                            <p>
                              如果開啟了「貼上時自動清洗+自動複製」，貼入原始片段後會直接清好代碼並寫回您的系統剪貼簿。
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="mb-2">
                              專為處理 AI 寫作、翻譯、或郵件輸出時產生的雜亂多重空白、不自然空格而設計。
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-slate-400">
                              <li><strong>去除半形空格：</strong> 自動剔除中文和中文、中文和中文標點間因格式轉換莫名夾雜的空格。</li>
                              <li><strong>段落合併折行：</strong> 清除句中的不正常折行，但保留雙換行的段落架構，完美左對齊。</li>
                              <li><strong>收緊連續空行：</strong> 壓縮過多的換行，只保留清爽的單一空行，並依需求清除表情符號。</li>
                              <li><strong>剝除清單與序列：</strong> 一鍵剝除行首清單符號（如 <code className="text-elegant-cyan font-mono">-</code>、<code className="text-elegant-cyan font-mono">*</code>）、數字排版序列（如 <code className="text-elegant-cyan font-mono">1.</code>、<code className="text-elegant-cyan font-mono">(1)</code>）及單獨干擾數字，方便直貼 Slack、Teams 發言。</li>
                            </ul>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {activeTab === 'code' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Patterns selection */}
                    <div className="lg:col-span-12 xl:col-span-7 flex flex-col gap-4">
                      <span className="text-xs font-bold text-slate-400 font-mono tracking-wider uppercase flex items-center gap-1">
                        1. 選擇或指定匹配格式 Pattern
                      </span>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <button
                          onClick={() => setSettings(prev => ({ ...prev, pattern: 'Auto' }))}
                          className={`px-3.5 py-4 rounded-lg border text-left transition-all flex flex-col justify-between h-[85px] cursor-pointer ${
                            settings.pattern === 'Auto'
                              ? 'bg-elegant-cyan/10 border-elegant-cyan text-elegant-cyan shadow-lg shadow-elegant-cyan/5'
                              : 'bg-elegant-darker/60 border-elegant-border hover:border-slate-700 text-slate-450 hover:text-white'
                          }`}
                        >
                          <span className="text-xs font-bold font-display">✨ 自動偵測</span>
                          <span className="text-[9px] font-mono opacity-80">常規最佳選擇</span>
                        </button>

                        <button
                          onClick={() => setSettings(prev => ({ ...prev, pattern: 'Colon' }))}
                          className={`px-3.5 py-4 rounded-lg border text-left transition-all flex flex-col justify-between h-[85px] cursor-pointer ${
                            settings.pattern === 'Colon'
                              ? 'bg-elegant-cyan/10 border-elegant-cyan text-elegant-cyan shadow-lg'
                              : 'bg-elegant-darker/60 border-elegant-border hover:border-slate-700 text-slate-450 hover:text-white'
                          }`}
                        >
                          <span className="text-xs font-bold font-display">1: 冒號 style</span>
                          <span className="text-[10px] font-mono text-slate-400 truncate w-full">1: main()...</span>
                        </button>

                        <button
                          onClick={() => setSettings(prev => ({ ...prev, pattern: 'Dot' }))}
                          className={`px-3.5 py-4 rounded-lg border text-left transition-all flex flex-col justify-between h-[85px] cursor-pointer ${
                            settings.pattern === 'Dot'
                              ? 'bg-elegant-cyan/10 border-elegant-cyan text-elegant-cyan shadow-lg'
                              : 'bg-elegant-darker/60 border-elegant-border hover:border-slate-700 text-slate-450 hover:text-white'
                          }`}
                        >
                          <span className="text-xs font-bold font-display">1. 點點 style</span>
                          <span className="text-[10px] font-mono text-slate-400 truncate w-full">1. func()...</span>
                        </button>

                        <button
                          onClick={() => setSettings(prev => ({ ...prev, pattern: 'Pipe' }))}
                          className={`px-3.5 py-4 rounded-lg border text-left transition-all flex flex-col justify-between h-[85px] cursor-pointer ${
                            settings.pattern === 'Pipe'
                              ? 'bg-elegant-cyan/10 border-elegant-cyan text-elegant-cyan shadow-lg'
                              : 'bg-elegant-darker/60 border-elegant-border hover:border-slate-700 text-slate-450 hover:text-white'
                          }`}
                        >
                          <span className="text-xs font-bold font-display">01 | 直線 style</span>
                          <span className="text-[10px] font-mono text-slate-400 truncate w-full">01 | import...</span>
                        </button>

                        <button
                          onClick={() => setSettings(prev => ({ ...prev, pattern: 'Bracket' }))}
                          className={`px-3.5 py-4 rounded-lg border text-left transition-all flex flex-col justify-between h-[85px] cursor-pointer ${
                            settings.pattern === 'Bracket'
                              ? 'bg-elegant-cyan/10 border-elegant-cyan text-elegant-cyan shadow-lg'
                              : 'bg-elegant-darker/60 border-elegant-border hover:border-slate-700 text-slate-450 hover:text-white'
                          }`}
                        >
                          <span className="text-xs font-bold font-display">[1] 中括號 style</span>
                          <span className="text-[10px] font-mono text-slate-400 truncate w-full">[1] class...</span>
                        </button>

                        <button
                          onClick={() => setSettings(prev => ({ ...prev, pattern: 'Parenthesis' }))}
                          className={`px-3.5 py-4 rounded-lg border text-left transition-all flex flex-col justify-between h-[85px] cursor-pointer ${
                            settings.pattern === 'Parenthesis'
                              ? 'bg-elegant-cyan/10 border-elegant-cyan text-elegant-cyan shadow-lg'
                              : 'bg-elegant-darker/60 border-elegant-border hover:border-slate-700 text-slate-450 hover:text-white'
                          }`}
                        >
                          <span className="text-xs font-bold font-display">(1) 括號 style</span>
                          <span className="text-[10px] font-mono text-slate-400 truncate w-full">(1) echo...</span>
                        </button>

                        <button
                          onClick={() => setSettings(prev => ({ ...prev, pattern: 'RawNumber' }))}
                          className={`px-3.5 py-4 rounded-lg border text-left transition-all flex flex-col justify-between h-[85px] cursor-pointer ${
                            settings.pattern === 'RawNumber'
                              ? 'bg-elegant-cyan/10 border-elegant-cyan text-elegant-cyan shadow-lg'
                              : 'bg-elegant-darker/60 border-elegant-border hover:border-slate-700 text-slate-450 hover:text-white'
                          }`}
                        >
                          <span className="text-xs font-bold font-display">1 純數字 style</span>
                          <span className="text-[10px] font-mono text-slate-400 truncate w-full">1 print...</span>
                        </button>

                        <button
                          onClick={() => setSettings(prev => ({ ...prev, pattern: 'Custom' }))}
                          className={`px-3.5 py-4 rounded-lg border text-left transition-all flex flex-col justify-between h-[85px] cursor-pointer ${
                            settings.pattern === 'Custom'
                              ? 'bg-gradient-to-tr from-[#66FCF1]/10 to-[#45A29E]/10 border-elegant-cyan text-white shadow-lg'
                              : 'bg-elegant-darker/60 border-elegant-border hover:border-slate-700 text-slate-450 hover:text-white'
                          }`}
                        >
                          <span className="text-xs font-bold font-display">⚙️ 自訂 Regular</span>
                          <span className="text-[9px] font-mono text-elegant-cyan">客製 regex 規則</span>
                        </button>
                      </div>

                      {settings.pattern === 'Custom' && (
                        <div className="bg-[#121820] border border-cyan-800/60 rounded-lg p-3">
                          <label className="text-[10px] text-cyan-400 font-mono block mb-1">自訂正則表達式 Regular Expression:</label>
                          <input
                            type="text"
                            value={settings.customRegex}
                            onChange={(e) => setSettings(prev => ({ ...prev, customRegex: e.target.value }))}
                            className="w-full bg-[#050608] border border-slate-700 px-3 py-1.5 text-xs font-mono text-white rounded outline-none focus:border-cyan-400"
                            placeholder="例如: ^\s*\d+[:.)]\s?"
                          />
                          {regexError && (
                            <span className="text-[10px] text-rose-400 mt-1 block">{regexError}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Settings preferences */}
                    <div className="lg:col-span-12 xl:col-span-5 flex flex-col gap-3">
                      <span className="text-xs font-bold text-slate-400 font-mono tracking-wider uppercase">
                        2. 過濾喜好設定 SETTINGS
                      </span>

                      <label className="flex items-center justify-between p-3 bg-[#131922] border border-elegant-border rounded-lg hover:border-slate-700 cursor-pointer transition-colors">
                        <div className="flex flex-col pr-3">
                          <span className="text-xs font-bold text-white">剝除前後 Markdown 代碼塊 (```)</span>
                          <span className="text-[10px] text-slate-400">去掉開頭結尾的 ```javascript 等標記</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.stripMarkdown}
                          onChange={(e) => setSettings(prev => ({ ...prev, stripMarkdown: e.target.checked }))}
                          className="w-4 h-4 rounded text-elegant-cyan bg-[#050608] border-elegant-border accent-elegant-cyan"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3 bg-[#131922] border border-elegant-border rounded-lg hover:border-slate-700 cursor-pointer transition-colors">
                        <div className="flex flex-col pr-3">
                          <span className="text-xs font-bold text-white">貼上時自動清洗與複製 (Auto Copy)</span>
                          <span className="text-[10px] text-slate-400">點擊「貼上剪貼簿」時自動複製淨化結果</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.autoCopy}
                          onChange={(e) => setSettings(prev => ({ ...prev, autoCopy: e.target.checked }))}
                          className="w-4 h-4 rounded text-elegant-cyan bg-[#050608] border-elegant-border accent-elegant-cyan"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3 bg-[#131922] border border-elegant-border rounded-lg hover:border-slate-700 cursor-pointer transition-colors">
                        <div className="flex flex-col pr-3">
                          <span className="text-xs font-bold text-white">保留原始縮排空白 (Preserve Indent)</span>
                          <span className="text-[10px] text-slate-400">去除行號後保留代碼本身的層級縮排</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.preserveIndent}
                          onChange={(e) => setSettings(prev => ({ ...prev, preserveIndent: e.target.checked }))}
                          className="w-4 h-4 rounded text-elegant-cyan bg-[#050608] border-elegant-border accent-elegant-cyan"
                        />
                      </label>
                    </div>

                  </div>
                ) : (
                  /* Text purifier settings */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="flex items-center justify-between p-3 bg-[#131922] border border-elegant-border rounded-lg hover:border-slate-700 cursor-pointer transition-colors">
                      <div className="flex flex-col pr-3">
                        <span className="text-xs font-bold text-white">去除中文間與標點多餘半形空格</span>
                        <span className="text-[10px] text-slate-400">剔除中文詞彙之間因轉換誤夾的半形空白</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={textSettings.removeSpacesBetweenChinese}
                        onChange={(e) => setTextSettings(prev => ({ ...prev, removeSpacesBetweenChinese: e.target.checked }))}
                        className="w-4 h-4 rounded text-elegant-cyan bg-[#050608] border-elegant-border accent-elegant-cyan"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-[#131922] border border-elegant-border rounded-lg hover:border-slate-700 cursor-pointer transition-colors">
                      <div className="flex flex-col pr-3">
                        <span className="text-xs font-bold text-white">收縮連續空行至多剩一行</span>
                        <span className="text-[10px] text-slate-400">多個空白行直接收縮為一個清爽的空行</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={textSettings.collapseNewlines}
                        onChange={(e) => setTextSettings(prev => ({ ...prev, collapseNewlines: e.target.checked }))}
                        className="w-4 h-4 rounded text-elegant-cyan bg-[#050608] border-elegant-border accent-elegant-cyan"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-[#131922] border border-elegant-border rounded-lg hover:border-slate-700 cursor-pointer transition-colors">
                      <div className="flex flex-col pr-3">
                        <span className="text-xs font-bold text-white">剝除清單符號、引言塊與時序序列</span>
                        <span className="text-[10px] text-slate-400">剔除行首 -, *, •, 1., (1) 方便轉貼通訊軟體</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={textSettings.stripBullets ?? false}
                        onChange={(e) => setTextSettings(prev => ({ ...prev, stripBullets: e.target.checked }))}
                        className="w-4 h-4 rounded text-elegant-cyan bg-[#050608] border-elegant-border accent-elegant-cyan"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-[#131922] border border-elegant-border rounded-lg hover:border-slate-700 cursor-pointer transition-colors">
                      <div className="flex flex-col pr-3">
                        <span className="text-xs font-bold text-white">去除文章中所有 Emoji 表情符號</span>
                        <span className="text-[10px] text-slate-400">拿掉小紅箭、打勾、火箭等符號 (適合正式報告)</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={textSettings.stripEmoji}
                        onChange={(e) => setTextSettings(prev => ({ ...prev, stripEmoji: e.target.checked }))}
                        className="w-4 h-4 rounded text-elegant-cyan bg-[#050608] border-elegant-border accent-elegant-cyan"
                      />
                    </label>
                  </div>
                )}
              </section>

              {/* Sticky Action Trigger Block */}
              {inputText && (
                <div className="bg-[#121820] border-t-4 border-elegant-cyan p-6 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl select-none">
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] text-elegant-teal uppercase font-bold tracking-wider">
                      {activeTab === 'code' ? 'Code Clipped Successfully' : 'Text Purified Successfully'}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {activeTab === 'code' 
                        ? '程式片段格式優化完成，行號前綴字元已精準移除。' 
                        : '多餘空白與段落不自然空行已徹底美化。底層對齊左側。'}
                    </span>
                  </div>
                  <div className="flex gap-3 w-full sm:w-auto shrink-0">
                    <button
                      onClick={() => {
                        handleCopy();
                        handleSaveToHistory();
                      }}
                      className="px-8 py-3 w-full sm:w-auto bg-elegant-teal text-white font-bold rounded shadow-lg shadow-elegant-teal/20 hover:bg-elegant-cyan hover:text-elegant-dark transition-all duration-200 uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer outline-none"
                    >
                      <Copy className="w-4 h-4" />
                      {isCopied ? '已複製潔好成品' : '複製潔好成品'}
                    </button>
                    <button
                      onClick={handleClear}
                      className="px-6 py-3 w-full sm:w-auto bg-transparent border border-elegant-border text-slate-300 font-semibold rounded hover:bg-elegant-border hover:text-white transition-all duration-200 cursor-pointer"
                    >
                      重置內容
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ======================================================== */}
          {/* TAB 3: TSV -> JSON CONVERTER                              */}
          {/* ======================================================== */}
          {activeTab === 'tsv' && (
            <>
              {/* Preset TSV / CSV Panel */}
              <section className="bg-elegant-card border border-elegant-border rounded-xl p-4.5 shadow-xl shadow-black/40">
                <span className="text-xs font-mono font-bold text-elegant-teal block mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-elegant-cyan" />
                  快速載入 TSV / CSV 表格範例：
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PRESET_TSV_EXAMPLES.map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setTsvInput(preset.text);
                        if (tsvSettings.autoCopy) {
                          const parsed = parseDelimitedText(preset.text, tsvSettings);
                          if (parsed.jsonString) {
                            setTimeout(() => handleCopy(parsed.jsonString), 100);
                          }
                        }
                      }}
                      className="group text-left p-3 rounded-lg bg-elegant-dark/60 hover:bg-[#13171e] border border-elegant-border/70 hover:border-elegant-cyan/40 transition-all text-xs cursor-pointer"
                    >
                      <p className="font-semibold text-white group-hover:text-elegant-cyan transition-colors truncate">
                        {preset.title}
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono block mt-1 truncate">
                        {preset.description}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {/* TWO PANELS: TSV INPUT & JSON OUTPUT */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                
                {/* Left: TSV Input */}
                <div className="flex flex-col bg-elegant-card border border-elegant-border rounded-xl overflow-hidden focus-within:border-cyan-500/60 transition-colors shadow-2xl">
                  <div className="px-5 py-3.5 bg-elegant-border/30 border-b border-elegant-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span className="text-xs font-bold uppercase tracking-widest font-display text-cyan-400">
                        TSV / CSV 原始表格資料
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".tsv,.csv,.txt"
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-300 bg-slate-800/80 border border-slate-700 rounded hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
                        title="上傳 .tsv 或 .csv 檔案"
                      >
                        <Upload className="w-3 h-3 text-cyan-400" />
                        <span>上傳檔案</span>
                      </button>
                      <button
                        onClick={handlePaste}
                        className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-elegant-cyan bg-elegant-cyan/5 border border-elegant-cyan/30 rounded hover:bg-elegant-cyan hover:text-elegant-dark transition-all cursor-pointer"
                      >
                        <Clipboard className="w-3 h-3" />
                        <span>貼上剪貼簿</span>
                      </button>
                      {tsvInput && (
                        <button
                          onClick={handleClear}
                          className="p-1 text-slate-500 hover:text-rose-450 transition-colors cursor-pointer"
                          title="清除輸入"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="relative flex-1 min-h-[360px] flex flex-col">
                    <textarea
                      value={tsvInput}
                      onChange={(e) => setTsvInput(e.target.value)}
                      placeholder="在此貼上 Tab 分隔 (TSV) 或 逗號分隔 (CSV) 表格數據。例如：&#10;id&#9;name&#9;role&#9;email&#10;1&#9;Alice&#9;Admin&#9;alice@studio.dev&#10;2&#9;Bob&#9;Engineer&#9;bob@studio.dev"
                      className="w-full flex-1 p-5 bg-transparent outline-none font-mono text-sm leading-relaxed text-slate-300 resize-none min-h-[360px]"
                    />

                    <div className="px-5 py-2.5 bg-elegant-dark/85 border-t border-elegant-border flex justify-between items-center text-[10px] font-mono text-slate-400 select-none">
                      <span>
                        資料列數: <strong className="text-white">{tsvInput.split('\n').filter(Boolean).length}</strong> 列
                      </span>
                      <span>
                        分隔符: <strong className="text-cyan-400 uppercase">{tsvSettings.delimiter}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: JSON Output */}
                <div className="flex flex-col bg-elegant-dark border border-elegant-border rounded-xl overflow-hidden focus-within:border-cyan-400/60 transition-colors shadow-2xl">
                  <div className="px-5 py-3.5 bg-[#1F2833]/50 border-b border-elegant-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-teal-400" />
                      <span className="text-xs font-bold uppercase tracking-widest font-display text-teal-300">
                        轉換產出 JSON (CONVERTED)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {tsvResult.jsonString && (
                        <>
                          <button
                            onClick={handleSendTsvToJsonBeautifier}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-700/80 rounded hover:bg-cyan-900 transition-all cursor-pointer shadow-sm"
                            title="一鍵送往 JSON 美化工具進行互動樹狀檢視與排版"
                          >
                            <ExternalLink className="w-3 h-3 text-cyan-400" />
                            <span>送往 JSON 美化</span>
                          </button>
                          <button
                            onClick={() => handleDownloadJson(tsvResult.jsonString, 'tsv-to-json')}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 rounded hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
                            title="下載為 .json 檔案"
                          >
                            <Download className="w-3 h-3 text-teal-400" />
                            <span>下載</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="relative flex-1 min-h-[360px] flex flex-col bg-elegant-darker/50">
                    <textarea
                      value={tsvResult.jsonString}
                      readOnly
                      placeholder="// 轉換後的 JSON 將顯示在此..."
                      className="w-full flex-1 p-5 bg-transparent outline-none font-mono text-sm leading-relaxed text-cyan-300 resize-none select-all cursor-text min-h-[360px]"
                    />

                    <div className="px-5 py-2.5 bg-elegant-card border-t border-elegant-border flex justify-between items-center text-[10px] font-mono text-slate-400 select-none">
                      <span>
                        JSON 筆數: <strong className="text-white">{tsvResult.rowCount}</strong> 筆記錄
                        {tsvResult.headers.length > 0 && (
                          <span className="ml-2 text-slate-500">
                            ({tsvResult.headers.length} 個欄位)
                          </span>
                        )}
                      </span>
                      <span>
                        大小: <strong className="text-white">{new Blob([tsvResult.jsonString]).size}</strong> 位元組
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* TSV CONVERTER SETTINGS */}
              <section className="bg-elegant-card border border-elegant-border rounded-xl p-6 shadow-xl">
                <div className="flex items-center gap-2 border-b border-elegant-border pb-4 mb-4 select-none">
                  <Settings className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-bold font-display text-white tracking-wide">
                    TSV / CSV 轉換偏好設定
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Delimiter Selection */}
                  <div className="flex flex-col gap-1.5 p-3 bg-[#131922] border border-elegant-border rounded-lg">
                    <span className="text-xs font-bold text-white">分隔符號 (Delimiter)</span>
                    <select
                      value={tsvSettings.delimiter}
                      onChange={(e) => setTsvSettings(prev => ({ ...prev, delimiter: e.target.value as any }))}
                      className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 outline-none focus:border-cyan-400"
                    >
                      <option value="auto">✨ 自動判斷 (Auto Detect)</option>
                      <option value="tab">Tab 定位點 (\t)</option>
                      <option value="comma">Comma 逗點 (,)</option>
                    </select>
                  </div>

                  {/* Header Row */}
                  <label className="flex items-center justify-between p-3 bg-[#131922] border border-elegant-border rounded-lg hover:border-slate-700 cursor-pointer transition-colors">
                    <div className="flex flex-col pr-2">
                      <span className="text-xs font-bold text-white">首行作為鍵名 (Header Row)</span>
                      <span className="text-[10px] text-slate-400">第一列轉換為物件 Key 名稱</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={tsvSettings.hasHeader}
                      onChange={(e) => setTsvSettings(prev => ({ ...prev, hasHeader: e.target.checked }))}
                      className="w-4 h-4 rounded text-elegant-cyan bg-[#050608] border-elegant-border accent-elegant-cyan"
                    />
                  </label>

                  {/* Parse Types */}
                  <label className="flex items-center justify-between p-3 bg-[#131922] border border-elegant-border rounded-lg hover:border-slate-700 cursor-pointer transition-colors">
                    <div className="flex flex-col pr-2">
                      <span className="text-xs font-bold text-white">智慧型別轉換 (Parse Types)</span>
                      <span className="text-[10px] text-slate-400">數字轉 number、true/false 轉 boolean</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={tsvSettings.parseTypes}
                      onChange={(e) => setTsvSettings(prev => ({ ...prev, parseTypes: e.target.checked }))}
                      className="w-4 h-4 rounded text-elegant-cyan bg-[#050608] border-elegant-border accent-elegant-cyan"
                    />
                  </label>

                  {/* Auto Copy */}
                  <label className="flex items-center justify-between p-3 bg-[#131922] border border-elegant-border rounded-lg hover:border-slate-700 cursor-pointer transition-colors">
                    <div className="flex flex-col pr-2">
                      <span className="text-xs font-bold text-white">貼上時自動複製 (Auto Copy)</span>
                      <span className="text-[10px] text-slate-400">貼上時直接將轉好 JSON 寫入剪貼簿</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={tsvSettings.autoCopy}
                      onChange={(e) => setTsvSettings(prev => ({ ...prev, autoCopy: e.target.checked }))}
                      className="w-4 h-4 rounded text-elegant-cyan bg-[#050608] border-elegant-border accent-elegant-cyan"
                    />
                  </label>
                </div>
              </section>

              {/* TSV Action Bar */}
              {tsvInput && (
                <div className="bg-[#121820] border-t-4 border-cyan-400 p-6 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl select-none">
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] text-teal-400 uppercase font-bold tracking-wider">
                      TSV &rarr; JSON Converted Successfully
                    </span>
                    <span className="text-sm font-semibold text-white">
                      已轉換為標準 JSON 陣列，共有 {tsvResult.rowCount} 筆資料結構。
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 w-full sm:w-auto shrink-0">
                    <button
                      onClick={handleSendTsvToJsonBeautifier}
                      className="px-5 py-3 bg-cyan-950/90 text-cyan-300 font-bold rounded border border-cyan-500/80 hover:bg-cyan-900 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>一鍵送往 JSON 美化</span>
                    </button>
                    <button
                      onClick={() => {
                        handleCopy(tsvResult.jsonString);
                        handleSaveToHistory();
                      }}
                      className="px-6 py-3 bg-elegant-teal text-white font-bold rounded shadow-lg shadow-elegant-teal/20 hover:bg-elegant-cyan hover:text-elegant-dark transition-all duration-200 uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer text-xs"
                    >
                      <Copy className="w-4 h-4" />
                      {isCopied ? '已複製 JSON' : '複製 JSON 成品'}
                    </button>
                    <button
                      onClick={handleClear}
                      className="px-4 py-3 bg-transparent border border-elegant-border text-slate-300 font-semibold rounded hover:bg-elegant-border hover:text-white transition-all duration-200 cursor-pointer text-xs"
                    >
                      重置
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ======================================================== */}
          {/* TAB 4: JSON BEAUTIFIER (JSON 美化工具)                    */}
          {/* ======================================================== */}
          {activeTab === 'json' && (
            <>
              {/* Preset JSON Panel */}
              <section className="bg-elegant-card border border-elegant-border rounded-xl p-4.5 shadow-xl shadow-black/40">
                <span className="text-xs font-mono font-bold text-elegant-teal block mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                  <Braces className="w-3.5 h-3.5 text-elegant-cyan" />
                  快速載入 JSON 範例：
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PRESET_JSON_EXAMPLES.map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setJsonInput(preset.text);
                        setTimeout(() => handleCopy(preset.text), 100);
                      }}
                      className="group text-left p-3 rounded-lg bg-elegant-dark/60 hover:bg-[#13171e] border border-elegant-border/70 hover:border-elegant-cyan/40 transition-all text-xs cursor-pointer"
                    >
                      <p className="font-semibold text-white group-hover:text-elegant-cyan transition-colors truncate">
                        {preset.title}
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono block mt-1 truncate">
                        {preset.description}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {/* TWO PANELS: RAW INPUT & BEAUTIFIED VIEWER */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                
                {/* Left: Raw JSON Input (5 cols on lg) */}
                <div className="lg:col-span-5 flex flex-col bg-elegant-card border border-elegant-border rounded-xl overflow-hidden focus-within:border-cyan-500/60 transition-colors shadow-2xl">
                  <div className="px-5 py-3.5 bg-elegant-border/30 border-b border-elegant-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span className="text-xs font-bold uppercase tracking-widest font-display text-cyan-400">
                        原始 JSON 輸入 (RAW JSON)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePaste}
                        className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-elegant-cyan bg-elegant-cyan/5 border border-elegant-cyan/30 rounded hover:bg-elegant-cyan hover:text-elegant-dark transition-all cursor-pointer"
                      >
                        <Clipboard className="w-3 h-3" />
                        <span>貼上剪貼簿</span>
                      </button>
                      {jsonInput && (
                        <button
                          onClick={handleClear}
                          className="p-1 text-slate-500 hover:text-rose-450 transition-colors cursor-pointer"
                          title="清除輸入"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="relative flex-1 min-h-[440px] flex flex-col">
                    <textarea
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      placeholder='在此貼上需要格式化、美化或除錯的 JSON 字串。例如：&#10;{"id":1001,"name":"Cadmus","roles":["developer","admin"],"active":true}'
                      className="w-full flex-1 p-5 bg-transparent outline-none font-mono text-sm leading-relaxed text-slate-300 resize-none min-h-[440px]"
                    />

                    {/* Invalid JSON banner */}
                    {!jsonResult.isValid && jsonResult.error && (
                      <div className="p-3 bg-rose-950/80 border-t border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div className="flex flex-col">
                          <span className="font-bold">JSON 格式錯誤：{jsonResult.error.message}</span>
                          {jsonResult.error.line && (
                            <span className="text-[11px] text-rose-200 font-mono mt-0.5">
                              行號: 第 {jsonResult.error.line} 行，第 {jsonResult.error.column || 0} 欄
                            </span>
                          )}
                          {jsonResult.error.snippet && (
                            <span className="mt-1 font-mono text-[10px] bg-rose-900/60 p-1 rounded text-rose-100">
                              &gt; {jsonResult.error.snippet}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="px-5 py-2.5 bg-elegant-dark/85 border-t border-elegant-border flex justify-between items-center text-[10px] font-mono text-slate-400 select-none">
                      <span>
                        輸入字元數: <strong className="text-white">{jsonInput.length}</strong>
                      </span>
                      <span>
                        狀態: <strong className={jsonResult.isValid ? 'text-emerald-400' : 'text-rose-400'}>
                          {jsonResult.isValid ? '有效 VALID' : '無效 SYNTAX ERROR'}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Beautified Viewer with View Toggle (7 cols on lg) */}
                <div className="lg:col-span-7 flex flex-col bg-elegant-dark border border-elegant-border rounded-xl overflow-hidden focus-within:border-cyan-400/60 transition-colors shadow-2xl">
                  
                  {/* Top Bar with View Mode Toggle and Actions */}
                  <div className="px-4 py-3 bg-[#1F2833]/50 border-b border-elegant-border flex flex-wrap items-center justify-between gap-2">
                    
                    {/* View Switcher: Code View vs Tree View */}
                    <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                      <button
                        onClick={() => setJsonSettings(prev => ({ ...prev, viewMode: 'code' }))}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                          jsonSettings.viewMode === 'code'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>程式碼檢視</span>
                      </button>
                      <button
                        onClick={() => setJsonSettings(prev => ({ ...prev, viewMode: 'tree' }))}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                          jsonSettings.viewMode === 'tree'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <ListTree className="w-3.5 h-3.5" />
                        <span>互動樹狀圖</span>
                      </button>
                    </div>

                    {/* Download & Copy */}
                    <div className="flex items-center gap-2">
                      {jsonResult.isValid && jsonResult.formattedJson && (
                        <>
                          <button
                            onClick={() => handleDownloadJson(jsonResult.formattedJson, 'beautified-json')}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 rounded hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
                            title="下載格式化後的 .json 檔案"
                          >
                            <Download className="w-3 h-3 text-cyan-400" />
                            <span>下載</span>
                          </button>
                          <button
                            onClick={() => handleCopy(jsonResult.formattedJson)}
                            className="flex items-center gap-1 px-3 py-1 text-xs font-bold bg-cyan-950 text-cyan-300 border border-cyan-700 rounded hover:bg-cyan-900 transition-all cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{isCopied ? '已複製' : '複製'}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="relative flex-1 min-h-[440px] flex flex-col bg-elegant-darker/60">
                    
                    {jsonSettings.viewMode === 'tree' ? (
                      /* Tree View */
                      <div className="flex-1 p-3 overflow-hidden flex flex-col">
                        {jsonResult.isValid && jsonResult.parsedData !== null ? (
                          <JsonTreeView data={jsonResult.parsedData} />
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 font-mono text-sm">
                            <ListTree className="w-10 h-10 text-slate-600 mb-2" />
                            <span>請先在左側貼入有效的 JSON 即可顯示展開樹狀結構</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Formatted Code View */
                      <div className="flex-1 flex flex-col overflow-hidden relative">
                        <textarea
                          value={jsonResult.formattedJson}
                          readOnly
                          placeholder="// 美化後的標準 JSON 將顯示在此..."
                          className="w-full flex-1 p-5 bg-transparent outline-none font-mono text-sm leading-relaxed text-cyan-300 resize-none select-all cursor-text min-h-[440px] custom-scrollbar"
                        />
                      </div>
                    )}

                    {/* Stats footer bar */}
                    <div className="px-5 py-2.5 bg-elegant-card border-t border-elegant-border flex flex-wrap justify-between items-center text-[10px] font-mono text-slate-400 select-none gap-2">
                      <div className="flex items-center gap-4">
                        <span>
                          位元組: <strong className="text-white">{(jsonResult.stats.sizeBytes / 1024).toFixed(2)} KB</strong>
                        </span>
                        <span>
                          鍵值數量: <strong className="text-cyan-400">{jsonResult.stats.keyCount}</strong> keys
                        </span>
                        <span>
                          層級深度: <strong className="text-teal-400">{jsonResult.stats.depth}</strong> 級
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">縮排: {jsonSettings.indentType}</span>
                        {jsonSettings.sortKeys && (
                          <span className="px-1.5 py-0.2 bg-teal-950/60 text-teal-400 border border-teal-800/40 rounded text-[9px]">
                            A-Z 鍵名已排序
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* JSON BEAUTIFIER CONTROLS & SETTINGS */}
              <section className="bg-elegant-card border border-elegant-border rounded-xl p-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-elegant-border pb-4 mb-4 select-none">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-base font-bold font-display text-white tracking-wide">
                      JSON 美化與排版偏好 (Formatting Controls)
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    即時本地格式化，不發送任何資料到外部伺服器
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  
                  {/* Indent 2 */}
                  <button
                    onClick={() => setJsonSettings(prev => ({ ...prev, indentType: '2' }))}
                    className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      jsonSettings.indentType === '2'
                        ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 shadow-md'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-bold">2 空格縮排 (2 Spaces)</span>
                    <span className="text-[10px] text-slate-500 font-mono mt-1">前端 / JavaScript 標準</span>
                  </button>

                  {/* Indent 4 */}
                  <button
                    onClick={() => setJsonSettings(prev => ({ ...prev, indentType: '4' }))}
                    className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      jsonSettings.indentType === '4'
                        ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 shadow-md'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-bold">4 空格縮排 (4 Spaces)</span>
                    <span className="text-[10px] text-slate-500 font-mono mt-1">後端 / Python / Java 風格</span>
                  </button>

                  {/* Tab Indent */}
                  <button
                    onClick={() => setJsonSettings(prev => ({ ...prev, indentType: 'tab' }))}
                    className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      jsonSettings.indentType === 'tab'
                        ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 shadow-md'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-bold">Tab 定位點 (\t)</span>
                    <span className="text-[10px] text-slate-500 font-mono mt-1">自訂編輯器寬度</span>
                  </button>

                  {/* Compact / Minify */}
                  <button
                    onClick={() => setJsonSettings(prev => ({ ...prev, indentType: 'compact' }))}
                    className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      jsonSettings.indentType === 'compact'
                        ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 shadow-md'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-bold">單行壓縮 (Minify)</span>
                    <span className="text-[10px] text-slate-500 font-mono mt-1">去除空格、最小化體積</span>
                  </button>

                  {/* Sort Keys A-Z */}
                  <button
                    onClick={() => setJsonSettings(prev => ({ ...prev, sortKeys: !prev.sortKeys }))}
                    className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      jsonSettings.sortKeys
                        ? 'bg-teal-500/15 border-teal-400 text-teal-300 shadow-md'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-bold flex items-center justify-between">
                      <span>鍵名字母排序 (A-Z)</span>
                      <span className={`w-2 h-2 rounded-full ${jsonSettings.sortKeys ? 'bg-teal-400' : 'bg-slate-600'}`} />
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono mt-1">
                      {jsonSettings.sortKeys ? '已開啟物件遞迴排序' : '點擊啟用排序'}
                    </span>
                  </button>

                </div>
              </section>

              {/* JSON Action Bar */}
              {jsonInput && (
                <div className="bg-[#121820] border-t-4 border-cyan-400 p-6 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl select-none">
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] text-teal-400 uppercase font-bold tracking-wider">
                      {jsonResult.isValid ? 'JSON Beautified Successfully' : 'Syntax Correction Required'}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {jsonResult.isValid 
                        ? `JSON 已成功依照 ${jsonSettings.indentType} 規格美化排版，可直接複製或切換互動樹狀圖檢視。`
                        : 'JSON 字串格式存在語法錯誤，請查看上方標記修正後重試。'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 w-full sm:w-auto shrink-0">
                    <button
                      disabled={!jsonResult.isValid}
                      onClick={() => {
                        handleCopy(jsonResult.formattedJson);
                        handleSaveToHistory();
                      }}
                      className={`px-8 py-3 w-full sm:w-auto font-bold rounded shadow-lg transition-all duration-200 uppercase tracking-wide flex items-center justify-center gap-2 text-xs ${
                        jsonResult.isValid
                          ? 'bg-elegant-teal text-white shadow-elegant-teal/20 hover:bg-elegant-cyan hover:text-elegant-dark cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Copy className="w-4 h-4" />
                      {isCopied ? '已複製美化結果' : '複製美化結果'}
                    </button>
                    <button
                      onClick={handleClear}
                      className="px-6 py-3 w-full sm:w-auto bg-transparent border border-elegant-border text-slate-300 font-semibold rounded hover:bg-elegant-border hover:text-white transition-all duration-200 cursor-pointer text-xs"
                    >
                      重置內容
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* SIDEBAR DETAILED HISTORY */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 340 }}
              exit={{ opacity: 0, width: 0 }}
              className="w-full lg:w-[340px] flex flex-col bg-elegant-card border border-elegant-border rounded-xl overflow-hidden shrink-0 shadow-2xl"
            >
              <div className="p-4 bg-[#12171E] border-b border-elegant-border flex items-center justify-between select-none">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-elegant-cyan" />
                  <span className="text-sm font-bold font-display text-white tracking-wide">
                    本地歷史清洗紀錄
                  </span>
                </div>
                {history.length > 0 && (
                  <button
                    onClick={handleClearAllHistory}
                    className="text-[10px] text-slate-500 hover:text-rose-450 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>清除</span>
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 max-h-[500px] lg:max-h-[640px] custom-scrollbar">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-16 px-4">
                    <div className="w-12 h-12 rounded-full border border-elegant-border flex items-center justify-center bg-elegant-dark text-slate-600 mb-3">
                      <Code className="w-5 h-5 text-elegant-teal" />
                    </div>
                    <p className="text-xs font-bold text-slate-400">尚無快照紀錄</p>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] leading-relaxed">
                      處理並點選「複製成品」時，系統會為您將舊檔自動備份於此。
                    </p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (item.mode === 'code' || item.mode === 'text') {
                          setInputText(item.originalText);
                          setActiveTab(item.mode);
                        } else if (item.mode === 'tsv') {
                          setTsvInput(item.originalText);
                          setActiveTab('tsv');
                        } else if (item.mode === 'json') {
                          setJsonInput(item.originalText);
                          setActiveTab('json');
                        }
                        handleCopy(item.cleanedText);
                      }}
                      className="group p-3 bg-elegant-dark hover:bg-[#12161D] border border-elegant-border hover:border-elegant-cyan/30 rounded-lg cursor-pointer transition-all text-left relative overflow-hidden"
                    >
                      {/* Badge format type */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 border rounded text-[8px] font-mono font-bold ${
                            item.mode === 'text'
                              ? 'bg-elegant-teal/10 border-elegant-teal text-elegant-teal'
                              : item.mode === 'tsv'
                              ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                              : item.mode === 'json'
                              ? 'bg-purple-500/10 border-purple-500/40 text-purple-300'
                              : 'bg-elegant-cyan/10 border-elegant-cyan text-elegant-cyan'
                          }`}>
                            {item.mode === 'text' 
                              ? '文本淨化 (TEXT)' 
                              : item.mode === 'tsv' 
                              ? 'TSV 轉換 (TSV)' 
                              : item.mode === 'json' 
                              ? 'JSON 美化 (JSON)' 
                              : '代碼行號 (CODE)'}
                          </span>
                          <span className="text-[8px] font-mono text-slate-500 truncate max-w-[90px]">
                            {item.detectedPattern}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono text-slate-500">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                            className="p-1 text-slate-600 group-hover:text-rose-450 rounded hover:bg-[#1F2833]/40 transition-all z-10 cursor-pointer"
                            title="刪除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Code preview snippet */}
                      <p className="text-[10px] leading-relaxed font-mono text-slate-400 truncate max-w-full block bg-[#050608]/50 p-2 rounded border border-elegant-border">
                        {item.cleanedText.split('\n')[0] || '// 內容'}
                        {item.cleanedText.split('\n').length > 1 && '\n...'}
                      </p>

                      <div className="mt-2.5 flex items-center justify-between">
                        <span className="text-[9px] text-slate-500 flex items-center gap-0.5">
                          行數: <strong className="text-slate-400">{item.cleanedText.split('\n').filter(Boolean).length}</strong>
                        </span>
                        <span className="text-[9px] text-elegant-teal group-hover:text-elegant-cyan font-bold flex items-center gap-0.5 transition-colors">
                          <span>還原並複製</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-3.5 bg-[#12171E] border-t border-elegant-border text-[10px] text-slate-500 text-center font-mono select-none">
                儲存於本地瀏覽器 LocalStorage
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

      </main>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-elegant-border bg-elegant-darker py-6 px-6 text-center text-xs text-slate-500 relative z-10 select-none">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="flex items-center gap-1.5 justify-center">
            <span>Powering real-time CLI sanitizers, text format clean engines, TSV to JSON & interactive JSON beautifier.</span>
          </p>
          <div className="flex gap-4">
            <span className="text-[10px] font-mono text-slate-500">
              UTC: {new Date().toISOString().substring(11, 19)}
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              安全沙盒、本地計算、防洩密驗證
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
