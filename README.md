# Word MCP Venom

一個基於 Electron + React + Python 的 Microsoft Word AI 助手，透過 Model Context Protocol (MCP) 讓 AI agent 直接操作 Word 文件。

## 功能概述

- 在 Word 視窗上方疊加透明聊天介面
- 使用者以自然語言下指令，AI 自動判斷並執行對應的 Word 操作
- 透過 MCP 架構擴充工具，彈性支援各種文件操作

## 系統架構

```
使用者輸入（React UI）
       ↓
Express Bridge（port 3002）
       ↓
Python FastAPI Agent（port 8000）
       ↓ MCP tool calls
MCP Server → Bridge → Renderer → Word（Venom HOM）
```

**三層結構：**
- **Electron Renderer**：聊天介面 + Venom 工具執行層
- **Node.js Bridge**（`bridge.ts`）：HTTP 中介層，轉發請求
- **Python Agent**（`agent_server.py`）：Claude AI agent，透過 MCP 控制 Word

## 技術堆疊

| 層級 | 技術 |
|------|------|
| 桌面應用 | Electron 38, React 18, TypeScript 5 |
| AI Agent | Python FastAPI, Anthropic Agents SDK |
| 工具協議 | Model Context Protocol (fastmcp) |
| Word 整合 | Venom / Host Object Model (HOM) |
| 橋接層 | Express 5 (Node.js) |

## 環境需求

- Node.js 18+
- Python 3.10+
- Microsoft Word（已安裝 Venom 插件）
- Anthropic API Key

## 安裝與啟動

### 1. 安裝相依套件

```bash
# 安裝 Node.js 相依套件（根目錄）
npm install

# 安裝 Electron 應用相依套件
cd venom
npm install

# 安裝 Python 相依套件
cd ../mcp
pip install fastapi fastmcp anthropic-agents python-dotenv uvicorn
```

### 2. 設定環境變數

在 `mcp/` 目錄建立 `.env`：

```env
ANTHROPIC_API_KEY=your_api_key_here
```

### 3. 啟動服務

依序在不同終端機執行：

```bash
# 啟動 Python AI Agent（port 8000）
cd mcp
python -m uvicorn agent_server:app --host 127.0.0.1 --port 8000

# 啟動 Electron 應用（內含 Bridge）
cd venom
npm start
```

## MCP 工具列表

目前實作狀態：

| 工具 | 類別 | 狀態 |
|------|------|------|
| `open_file_menu` | 檔案管理 | ✅ 已實作 |
| `get_selected_text` | 文件讀取 | ✅ 已實作 |
| `get_document_text` | 文件讀取 | ✅ 已實作 |
| `replace_selected_text` | 文字修改 | 🔲 待實作 |
| `insert_text_at_cursor` | 文字修改 | 🔲 待實作 |
| `save_document` | 檔案管理 | 🔲 待實作 |
| `get_document_info` | 文件讀取 | 🔲 待實作 |
| `get_document_structure` | 文件讀取 | 🔲 待實作 |

> 完整工具規劃詳見 Notion 文件。

## 專案結構

```
word mcp venom/
├── mcp/
│   ├── agent_server.py      # FastAPI AI agent
│   ├── mcp_server.py        # MCP 工具伺服器
│   └── .env                 # 環境變數
└── venom/
    ├── src/
    │   ├── main/
    │   │   ├── main.ts          # Electron 入口
    │   │   ├── bridge.ts        # Express 橋接層
    │   │   └── preload.ts       # Context bridge
    │   └── renderer/
    │       ├── HelloWorld.tsx   # 聊天介面
    │       ├── tools/           # Venom 工具實作
    │       └── descriptor/      # Word 元素描述符
    └── package.json
```

## 開發進度

- [x] Electron overlay 介面
- [x] React 聊天 UI
- [x] Express Bridge 架構
- [x] Python FastAPI Agent
- [x] MCP Server 連線
- [x] `open_file_menu` 工具
- [x] `get_selected_text` 工具（含快取 + UI 選取預覽）
- [x] `get_document_text` 工具
- [ ] `replace_selected_text` 工具
- [ ] `insert_text_at_cursor` 工具
- [ ] `save_document` 工具
- [ ] 格式調整工具群
- [ ] 報告生成工具群

## 實作路線圖

### 第一階段：核心讀寫（最小可展示版本）

完成後可展示「選取文字 → AI 改寫 → 自動替換 → 儲存」完整流程。

| 順序 | 工具 | 說明 |
|------|------|------|
| 1 | `get_document_text` | AI 讀取全文，支援摘要、語氣修改等需求 |
| 2 | `replace_selected_text` | 將選取文字替換為 AI 生成的內容 |
| 3 | `save_document` | 修改完自動儲存 |

### 第二階段：豐富編輯能力

| 順序 | 工具 | 說明 |
|------|------|------|
| 4 | `insert_text_at_cursor` | 在游標位置插入 AI 生成文字 |
| 5 | `get_document_info` | 讓 AI 知道字數、頁數等基本資訊 |
| 6 | `get_document_structure` | AI 理解文件章節架構 |
| 7 | `insert_comment` | AI 留下修改建議，不直接改原文 |

### 第三階段：格式與報告生成

| 順序 | 工具 | 說明 |
|------|------|------|
| 8 | `apply_heading_style` | 整理標題層級 |
| 9 | `replace_text` | 全文找字取代 |
| 10 | `set_font` / `set_paragraph_format` | 格式調整 |
| 11 | `insert_cover_page` / `create_table_of_contents` | 報告生成 |
| 12 | `export_pdf` | 輸出最終文件 |

### 不實作（風險高或價值低）

`open_document`、`create_blank_document`、`check_target_document`、`return_to_document`、`copy_selected_text` — 使用者自行操作即可，讓 AI 控制反而有誤操作風險。
