export interface PresetExample {
  title: string;
  description: string;
  text: string;
}

export const PRESET_EXAMPLES: PresetExample[] = [
  {
    title: 'Gemini CLI (Colon style)',
    description: 'Lines prefixing <num>: code',
    text: `  1: import { useState } from "react";
  2: import { motion } from "motion/react";
  3: 
  4: export default function QuickCleaner() {
  5:   const [text, setText] = useState("");
  6:   return (
  7:     <div className="p-6 max-w-xl mx-auto bg-slate-900 text-white rounded-xl">
  8:       <h1 className="text-xl font-bold font-display">Clean Code Stack</h1>
  9:     </div>
 10:   );
 11: }`
  },
  {
    title: 'MD Markdown List (Dot style)',
    description: 'Numerical bullet style blocks',
    text: `1. // Configure Tailwind CSS v4 in your project
2. @import "tailwindcss";
3. 
4. @theme {
5.   --color-brand-cyan: #06b6d4;
6.   --font-display: "Space Grotesk", sans-serif;
7. }`
  },
  {
    title: 'Code Editor Gutter (Pipe style)',
    description: 'Code block copy with row gutter pipes',
    text: `01 | package main
02 | 
03 | import "fmt"
04 | 
05 | func main() {
06 | \tfmt.Println("Cleaned and ready!")
07 | }`
  },
  {
    title: 'Debug Logs (Bracket style)',
    description: 'Lines marked with bracket counters',
    text: `[1] #!/usr/bin/env bash
[2] echo "Initializing build..."
[3] npm run build
[4] echo "Deploying to production server..."`
  }
];

export const PRESET_TEXT_EXAMPLES: PresetExample[] = [
  {
    title: 'AI 翻譯與多餘空格空行',
    description: '前後包含懸空縮排、雙空格、中文旁空格',
    text: `Hi @Finance_PT，

  目前我們正在進行資料庫歷史冗餘帳單（2025/06 - 2026/03）的全面清理。

  為了提高清理效率並確保數據準確性，想跟妳確認：我們這套 Billing-invoice-app
  系統，針對各個客戶開始『正式使用系統產出正式發票』的月份是什麼時候？

  目前的計畫是：
   1. 正式上線月份之前：資料庫中的所有紀錄將被視為開發初期的『測試數據』，我打算直接執行全量整批刪除，以快速清空垃圾資料。
   2. 正式上線月份之後：我們則會維持目前的『一對一對帳流程』，精準刪除重複件或無效件，確保每一張正式發票都被保留。

  妳可以幫我確認一下各主要客戶（或整體系統）的正式啟用月份嗎？確認後我們就能快速把過去一年累積的一千七百多萬美金測試數據清乾淨，讓之後
  Databricks Genie 查帳更準確。感謝！ 🚀  🚀`
  },
  {
    title: '多行隨機換行與英文空格',
    description: '文字在不自然的地方換行，且帶有過多空行',
    text: `我們正在
評估一項新的

專案計畫，這項
計畫對於提升伺服器
throughput 很有幫助。

如果一切順利，
我們可以在   June 2026
正式上線測試。`
  },
  {
    title: '雙空格與怪異標點',
    description: '字元與英數間莫名帶有二至三個空格',
    text: `這是  一 個  帶 有  多 餘  空 格   的中文句子。 
We are  running   at  Port 3000   for  testing.`
  },
  {
    title: '混合清單符號與時序資訊 (Slack 精簡排版)',
    description: '含有 -、* 符號、清單序列及干擾數字段落的工作記錄',
    text: `Cadmus
Yesterday (6/1 一)
* Invoice System Maintenance:
- Cleared a massive volume of unnecessary and duplicated invoices (May/April 2026) to ensure Genie data accuracy.
- Finalized production cross-check with Finance to resolve record discrepancies.
* Resell Phase 1 Development:
- Refined the Resell upload flow based on QA verification feedback.
- Defined design entities for Resale-Vendor-Upload and Invoice-Generation using DDD.
* Finance Genie / Databricks (DATAI-202):
- Kicked off cleansing of multi-contract customer data and identified the missing Org_id list.
11
Today (6/2 二)
* Resell Phase 1 Development:
- Implement the refined Resale-Vendor-Upload logic based on yesterday's DDD design.
- Complete the technical documentation for the newly defined design entities.
* Finance Genie & Data Integrity:
- Sync with Tim on the billing_type ENUM definition to finalize data schema.
- Validate multi-contract logic in SQL queries for the June 15th Genie milestone.`
  }
];

export const PRESET_TSV_EXAMPLES: PresetExample[] = [
  {
    title: '使用者名單 (TSV Tab 分隔)',
    description: '標準 TSV 格式帶有表頭與多種資料類型',
    text: `id\tname\trole\temail\tactive\tcredit
1001\tAlice Chen\tAdmin\talice@company.io\ttrue\t8500
1002\tBob Lin\tEngineer\tbob@company.io\ttrue\t6200
1003\tCarol Wang\tDesigner\tcarol@company.io\tfalse\t4100
1004\tDavid Hsieh\tProduct Manager\tdavid@company.io\ttrue\t7300`
  },
  {
    title: '電商庫存清單 (CSV 逗號分隔)',
    description: '逗號分隔含引號與數字格式',
    text: `sku,title,category,price,in_stock,rating
"SKU-A101","MacBook Pro 16\\" M3 Max","Laptops",3499.99,true,4.9
"SKU-B202","Dell UltraSharp 32\\" 4K Monitor","Displays",899.00,true,4.7
"SKU-C303","Logitech MX Master 3S","Peripherals",99.95,false,4.8`
  },
  {
    title: '伺服器端點設定 (含巢狀 JSON 字串)',
    description: 'TSV 欄位中直接嵌入 JSON 物件',
    text: `service\tregion\tport\tmetadata
auth-service\tus-central1\t8080\t{"protocol":"https","replicas":3}
billing-service\tasia-east1\t8081\t{"protocol":"grpc","replicas":2}
gateway\teu-west1\t443\t{"protocol":"http/2","rate_limit":1000}`
  }
];

export const PRESET_JSON_EXAMPLES: PresetExample[] = [
  {
    title: 'API 響應資料 (Nested User Profile)',
    description: '含有巢狀物件、陣列、多態數據結構',
    text: `{
  "status": "success",
  "code": 200,
  "data": {
    "user": {
      "id": "usr_99812",
      "username": "cadmus_dev",
      "email": "cadmus@studio.dev",
      "profile": {
        "displayName": "Cadmus Design",
        "avatarUrl": "https://avatars.githubusercontent.com/u/example",
        "bio": "Full-stack developer & toolmaker",
        "website": "https://github.com/Cadmus-design"
      },
      "roles": ["developer", "maintainer", "admin"],
      "settings": {
        "theme": "dark",
        "notifications": {
          "email": true,
          "slack": false,
          "push": true
        },
        "quota": 1000000
      },
      "verified": true,
      "lastLogin": "2026-11-03T03:50:00Z"
    }
  },
  "timestamp": 1793677800000
}`
  },
  {
    title: '未格式化單行壓縮 JSON (Minified)',
    description: '緊湊單行 JSON，適合測試一鍵美化排版',
    text: `{"app":"codestripper","version":"1.5.0","tools":[{"id":"cli-stripper","name":"CLI 程式行號清除","enabled":true},{"id":"text-purifier","name":"AI 文字空白淨化","enabled":true},{"id":"tsv-to-json","name":"TSV -> JSON","enabled":true},{"id":"json-beautifier","name":"JSON 美化","enabled":true}],"settings":{"theme":"dark","autoCopy":true,"storage":"localStorage"}}`
  },
  {
    title: '商品訂單清單 (Complex Arrays)',
    description: '陣列中多項訂單與詳細項目',
    text: `{
  "orders": [
    {
      "orderId": "ORD-2026-001",
      "customer": "Sarah Jenkins",
      "amount": 254.50,
      "items": [
        { "sku": "KB-WIRELESS", "name": "Mechanical Keyboard", "qty": 1, "price": 189.50 },
        { "sku": "MP-XL", "name": "Desk Mat XL", "qty": 1, "price": 65.00 }
      ],
      "paid": true,
      "notes": null
    },
    {
      "orderId": "ORD-2026-002",
      "customer": "Michael Chang",
      "amount": 89.00,
      "items": [
        { "sku": "CBL-TB4", "name": "Thunderbolt 4 Cable 2m", "qty": 1, "price": 89.00 }
      ],
      "paid": false,
      "notes": "Urgent delivery requested"
    }
  ],
  "totalCount": 2
}`
  }
];
