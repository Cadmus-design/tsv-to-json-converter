import React, { useState, useMemo } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Copy, 
  Check, 
  Search, 
  ChevronsDown, 
  ChevronsUp,
  Hash,
  Layers
} from 'lucide-react';

interface JsonTreeViewProps {
  data: any;
  searchTerm?: string;
}

interface TreeNodeProps {
  name?: string | number;
  value: any;
  path: string;
  depth: number;
  isLast: boolean;
  expandAllSignal: number;
  collapseAllSignal: number;
  searchTerm: string;
}

export const JsonTreeView: React.FC<JsonTreeViewProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandAllSignal, setExpandAllSignal] = useState(0);
  const [collapseAllSignal, setCollapseAllSignal] = useState(0);

  const handleExpandAll = () => setExpandAllSignal((prev) => prev + 1);
  const handleCollapseAll = () => setCollapseAllSignal((prev) => prev + 1);

  if (data === null || data === undefined) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono">
        (Empty JSON Data)
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0d1321] rounded-lg border border-slate-800/80 font-mono text-sm overflow-hidden select-text">
      {/* Search and control header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-900/90 border-b border-slate-800">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜尋節點鍵名或數值..."
            className="w-full pl-8 pr-3 py-1 text-xs bg-slate-950 border border-slate-800 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={handleExpandAll}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition-colors border border-slate-700/60"
            title="全部展開"
          >
            <ChevronsDown className="w-3.5 h-3.5 text-cyan-400" />
            <span>展開全部</span>
          </button>
          <button
            onClick={handleCollapseAll}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition-colors border border-slate-700/60"
            title="全部摺疊"
          >
            <ChevronsUp className="w-3.5 h-3.5 text-teal-400" />
            <span>摺疊全部</span>
          </button>
        </div>
      </div>

      {/* Tree scrollable view */}
      <div className="flex-1 p-3 overflow-auto custom-scrollbar">
        <TreeNode
          name={Array.isArray(data) ? 'root []' : 'root {}'}
          value={data}
          path="$"
          depth={0}
          isLast={true}
          expandAllSignal={expandAllSignal}
          collapseAllSignal={collapseAllSignal}
          searchTerm={searchTerm.trim().toLowerCase()}
        />
      </div>
    </div>
  );
};

const TreeNode: React.FC<TreeNodeProps> = ({
  name,
  value,
  path,
  depth,
  isLast,
  expandAllSignal,
  collapseAllSignal,
  searchTerm,
}) => {
  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);

  // Default initial expand level: expand top 2 levels
  const [isExpanded, setIsExpanded] = useState<boolean>(depth < 2);
  const [copiedType, setCopiedType] = useState<'path' | 'value' | null>(null);

  // Respond to global expand/collapse signals
  React.useEffect(() => {
    if (expandAllSignal > 0) setIsExpanded(true);
  }, [expandAllSignal]);

  React.useEffect(() => {
    if (collapseAllSignal > 0) setIsExpanded(depth === 0);
  }, [collapseAllSignal]);

  // If searchTerm matches any child, auto-expand
  const matchesSearch = useMemo(() => {
    if (!searchTerm) return false;
    const nameStr = String(name).toLowerCase();
    if (nameStr.includes(searchTerm)) return true;
    if (!isObject) {
      return String(value).toLowerCase().includes(searchTerm);
    }
    return false;
  }, [searchTerm, name, value, isObject]);

  React.useEffect(() => {
    if (searchTerm && matchesSearch) {
      setIsExpanded(true);
    }
  }, [searchTerm, matchesSearch]);

  const copyToClipboard = (text: string, type: 'path' | 'value', e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 1500);
  };

  const renderPrimitive = (val: any) => {
    if (val === null) {
      return <span className="text-rose-400 italic font-semibold">null</span>;
    }
    if (typeof val === 'boolean') {
      return (
        <span className="text-purple-400 font-semibold">
          {val ? 'true' : 'false'}
        </span>
      );
    }
    if (typeof val === 'number') {
      return <span className="text-amber-400 font-medium">{val}</span>;
    }
    if (typeof val === 'string') {
      return (
        <span className="text-emerald-400 break-all">
          &quot;{val}&quot;
        </span>
      );
    }
    return <span className="text-slate-300">{String(val)}</span>;
  };

  if (!isObject) {
    return (
      <div
        className={`group flex items-center gap-1.5 py-0.5 px-1.5 rounded hover:bg-slate-800/50 transition-colors ${
          matchesSearch ? 'bg-cyan-950/40 border border-cyan-800/50' : ''
        }`}
        style={{ paddingLeft: `${Math.max(depth * 18, 4)}px` }}
      >
        {name !== undefined && (
          <span className="text-cyan-400 font-medium select-text">
            {typeof name === 'number' ? `[${name}]` : `"${name}"`}:
          </span>
        )}
        <div className="flex-1 select-text">{renderPrimitive(value)}</div>

        {/* Quick copy tools on hover */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-2 transition-opacity">
          <button
            onClick={(e) => copyToClipboard(path, 'path', e)}
            className="px-1.5 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700/80 flex items-center gap-0.5"
            title="複製 JSON Path (路徑)"
          >
            {copiedType === 'path' ? (
              <Check className="w-2.5 h-2.5 text-emerald-400" />
            ) : (
              <Hash className="w-2.5 h-2.5 text-cyan-400" />
            )}
            <span>路徑</span>
          </button>
          <button
            onClick={(e) => copyToClipboard(String(value), 'value', e)}
            className="px-1.5 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700/80 flex items-center gap-0.5"
            title="複製值"
          >
            {copiedType === 'value' ? (
              <Check className="w-2.5 h-2.5 text-emerald-400" />
            ) : (
              <Copy className="w-2.5 h-2.5 text-slate-400" />
            )}
            <span>值</span>
          </button>
        </div>
      </div>
    );
  }

  const keys = isArray ? [] : Object.keys(value);
  const itemCount = isArray ? value.length : keys.length;

  return (
    <div className="flex flex-col select-text">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`group flex items-center gap-1.5 py-0.5 px-1.5 rounded cursor-pointer hover:bg-slate-800/60 transition-colors ${
          matchesSearch ? 'bg-cyan-950/40 border border-cyan-800/50' : ''
        }`}
        style={{ paddingLeft: `${Math.max(depth * 18, 4)}px` }}
      >
        <span className="p-0.5 text-slate-400 hover:text-cyan-400 transition-colors">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </span>

        {name !== undefined && (
          <span className="text-cyan-300 font-semibold">
            {typeof name === 'number' ? `[${name}]` : `"${name}"`}:
          </span>
        )}

        <span className="text-slate-400 text-xs">
          {isArray ? (
            <span className="inline-flex items-center gap-1">
              <span className="text-slate-300 font-bold">[</span>
              <span className="px-1.5 py-0.2 bg-teal-950/60 text-teal-400 text-[10px] rounded border border-teal-800/40">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
              <span className="text-slate-300 font-bold">]</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <span className="text-slate-300 font-bold">&#123;</span>
              <span className="px-1.5 py-0.2 bg-cyan-950/60 text-cyan-400 text-[10px] rounded border border-cyan-800/40">
                {itemCount} {itemCount === 1 ? 'key' : 'keys'}
              </span>
              <span className="text-slate-300 font-bold">&#125;</span>
            </span>
          )}
        </span>

        {/* Quick action: copy path */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-auto transition-opacity">
          <button
            onClick={(e) => copyToClipboard(path, 'path', e)}
            className="px-1.5 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700/80 flex items-center gap-0.5"
            title="複製 JSON Path (路徑)"
          >
            {copiedType === 'path' ? (
              <Check className="w-2.5 h-2.5 text-emerald-400" />
            ) : (
              <Hash className="w-2.5 h-2.5 text-cyan-400" />
            )}
            <span>路徑</span>
          </button>
          <button
            onClick={(e) =>
              copyToClipboard(JSON.stringify(value, null, 2), 'value', e)
            }
            className="px-1.5 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700/80 flex items-center gap-0.5"
            title="複製節點 JSON"
          >
            {copiedType === 'value' ? (
              <Check className="w-2.5 h-2.5 text-emerald-400" />
            ) : (
              <Copy className="w-2.5 h-2.5 text-slate-400" />
            )}
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Children */}
      {isExpanded && (
        <div className="border-l border-slate-800/80 ml-2.5">
          {isArray
            ? value.map((item: any, index: number) => (
                <TreeNode
                  key={index}
                  name={index}
                  value={item}
                  path={`${path}[${index}]`}
                  depth={depth + 1}
                  isLast={index === value.length - 1}
                  expandAllSignal={expandAllSignal}
                  collapseAllSignal={collapseAllSignal}
                  searchTerm={searchTerm}
                />
              ))
            : keys.map((key: string, index: number) => (
                <TreeNode
                  key={key}
                  name={key}
                  value={value[key]}
                  path={`${path}.${key}`}
                  depth={depth + 1}
                  isLast={index === keys.length - 1}
                  expandAllSignal={expandAllSignal}
                  collapseAllSignal={collapseAllSignal}
                  searchTerm={searchTerm}
                />
              ))}
        </div>
      )}
    </div>
  );
};
