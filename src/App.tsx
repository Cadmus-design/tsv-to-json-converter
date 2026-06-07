import React, { useState, useRef } from 'react';
import { Upload, Download, Copy, FileJson, ArrowRightLeft, Trash2 } from 'lucide-react';

export default function App() {
  const [tsvInput, setTsvInput] = useState('');
  const [jsonOutput, setJsonOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTsvChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTsvInput(e.target.value);
    setError(null);
  };

  const convertTsvToJson = () => {
    if (!tsvInput.trim()) {
      setJsonOutput('');
      setError('Please enter some TSV data to convert.');
      return;
    }

    try {
      const lines = tsvInput.trim().split('\n');
      if (lines.length === 0) {
        throw new Error('No data found.');
      }

      const headers = lines[0].split('\t').map(header => header.trim());
      
      if (headers.length === 0 || (headers.length === 1 && headers[0] === '')) {
         throw new Error('Invalid TSV format: No headers found.');
      }

      const result = [];

      for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i].split('\t');
        
        // Skip empty lines
        if (currentLine.length === 1 && currentLine[0].trim() === '') {
            continue;
        }

        const obj: Record<string, string> = {};
        for (let j = 0; j < headers.length; j++) {
          obj[headers[j]] = currentLine[j] !== undefined ? currentLine[j].trim() : '';
        }
        result.push(obj);
      }

      setJsonOutput(JSON.stringify(result, null, 2));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'An error occurred during conversion.');
      setJsonOutput('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setTsvInput(content);
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read the file.');
    };
    reader.readAsText(file);
    
    // Reset file input so the same file can be uploaded again if needed
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const downloadJson = () => {
    if (!jsonOutput) return;
    const blob = new Blob([jsonOutput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    if (!jsonOutput) return;
    try {
      await navigator.clipboard.writeText(jsonOutput);
      // Could add a toast notification here
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setError('Failed to copy to clipboard.');
    }
  };

  const clearAll = () => {
    setTsvInput('');
    setJsonOutput('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between pb-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <FileJson className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">TSV to JSON Converter</h1>
              <p className="text-sm text-slate-500">Easily convert Tab-Separated Values to JSON format</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={clearAll}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Input Section */}
          <div className="space-y-3 flex flex-col h-[600px]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                Input TSV
              </h2>
              <div className="flex gap-2">
                 <input 
                  type="file" 
                  accept=".tsv,.txt,.csv" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <button 
                  onClick={triggerFileInput}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload File
                </button>
              </div>
            </div>
            <textarea
              value={tsvInput}
              onChange={handleTsvChange}
              placeholder="Paste your TSV data here...&#10;id&#9;name&#9;age&#10;1&#9;Alice&#9;28&#10;2&#9;Bob&#9;34"
              className="w-full flex-1 p-4 font-mono text-sm bg-white border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Output Section */}
          <div className="space-y-3 flex flex-col h-[600px]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                Output JSON
              </h2>
              <div className="flex gap-2">
                <button 
                  onClick={copyToClipboard}
                  disabled={!jsonOutput}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
                <button 
                  onClick={downloadJson}
                  disabled={!jsonOutput}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
            <textarea
              value={jsonOutput}
              readOnly
              placeholder="Converted JSON will appear here..."
              className="w-full flex-1 p-4 font-mono text-sm bg-slate-50 border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            />
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col items-center justify-center pt-4">
           {error && (
            <div className="mb-4 p-3 w-full max-w-2xl bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm text-center">
              {error}
            </div>
          )}
          <button
            onClick={convertTsvToJson}
            className="flex items-center gap-2 px-8 py-3 text-base font-semibold text-white bg-indigo-600 rounded-full hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
          >
            <ArrowRightLeft className="w-5 h-5" />
            Convert to JSON
          </button>
        </div>

      </div>
    </div>
  );
}
