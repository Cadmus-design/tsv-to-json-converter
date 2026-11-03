# CODESTRIPPER v1.5 - Gemini Tool Suite

> 本地端 4 合 1 開發者工具箱：CLI 程式代碼行號清除、AI 文字空白排版淨化、TSV/CSV 轉 JSON，以及全新加入的 **JSON Beautifier (語法高亮與可摺疊樹狀圖檢視器)**。

---

## ✨ 主要功能特點 (Feature Suite)

1. **CLI 程式行號清除 (CLI Code Stripper)**
   - 自動偵測並剔除 Gemini CLI、Bash、IDE 行號 (例如 `1: `, `1. `, `01 | `, `[1] ` 等)。
   - 智慧縮排保護、引號/反引號代碼完整性防護。
   - 支援 Enter, Shift+Enter, Double Enter 等自訂換行複製模式與自動貼上複製。

2. **AI 文字空白淨化 (AI Text Purifier)**
   - 清除 AI 模型生成文本中不自然的多餘全半形空格、贅餘空行與符號周圍空白。
   - 智慧保留程式碼區塊（Markdown ``` code blocks）原有縮排排版。

3. **TSV -> JSON 轉換器 (TSV to JSON Converter)**
   - 支援 Tab 分隔 (TSV) 與逗號分隔 (CSV) 表格資料解析。
   - 自動型別轉換（數字、布林值、null、巢狀 JSON）。
   - 支援自訂欄位更名與特定欄位排除。

4. **JSON 美化檢視器 (JSON Beautifier & Tree Viewer - v1.5 New!)**
   - **程式碼檢視 (Code View)**：支援 2 格 / 4 格 / Tab 縮排美化與 Minify 單行壓縮，附帶清晰的語法色彩高亮。
   - **互動式樹狀圖 (Interactive Tree View)**：支援節點展開/收合、型別標記（string, number, boolean, array, object）、鍵值計數與一鍵個別節點值複製。
   - **即時格式驗證與診斷**：即時回報語法錯誤位置、行號、大小、鍵數量與巢狀深度統計。

---

## 🚀 本地開發運行 (Local Development)

### 前置需求
- Node.js (>= 18.0)
- npm 或 bun

### 步驟
1. 安裝套件：
   ```bash
   npm install
   ```
2. 啟動開發伺服器：
   ```bash
   npm run dev
   ```
3. 生產環境構建：
   ```bash
   npm run build
   ```

---

## 🌐 自動部署 (GitHub Actions Deploy)
本專案已配置 `.github/workflows/deploy.yml`。當代碼推送或 PR 合併至 `main` 分支時，GitHub Actions 會自動執行 `npm run build` 並部署至 GitHub Pages。
