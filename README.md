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

> 讀取類使用 **Venom**（Accessibility API），寫入類使用 **Windows COM**（`win32com.client`）。

### 已完成

| 工具 | 類別 | 說明 | 技術 |
|------|------|------|------|
| `get_document_text` | 文件讀取 | 讀取整份文件內容 | Venom |
| `get_selected_text` | 文件讀取 | 讀取使用者選取的文字（含快取） | Venom |
| `get_word_count` | 文件讀取 | 讀取文件總字數（狀態列） | Venom |
| `count_characters(text)` | 工具 | 計算任意文字的字數（中文字＋英文單字） | Python |
| `replace_selected_text(new_text)` | 文字修改 | 以 COM Range 精準替換選取文字 | COM |
| `insert_text_at_cursor(text)` | 文字修改 | 在快取游標位置插入文字 | COM |

### 計畫新增

> 需快取 Range 的工具：使用者須先在 Word 選取文字，再將滑鼠移到 Overlay（mouseDown 時同步快取 Venom 文字 + COM `Selection.Start/End`）。

#### 文件讀取／分析

| 工具 | 說明 | 技術 | 需快取 Range |
|------|------|------|:---:|
| `get_document_info` | 文件基本資訊（檔名、頁數、字數、段落數） | COM | ✗ |
| `get_document_structure` | 分析段落與樣式，回傳標題、內文、章節層級 | COM | ✗ |
| `get_current_styles` | 讀取選取範圍目前的字型、字級、行距、縮排 | COM | ✅ |

#### 文字修改

| 工具 | 說明 | 技術 | 需快取 Range |
|------|------|------|:---:|
| `insert_text_at_cursor(text)` | 在游標位置插入文字 | COM | ✗ |
| `replace_text(old_text, new_text)` | 全文搜尋替換，不需先選取 | COM | ✗ |
| `delete_selected_text` | 刪除選取文字 | COM | ✅ |
| `insert_comment(comment)` | 在選取文字處插入 Word 註解 | COM | ✅ |
| `highlight_text(color)` | 對選取文字套用螢光標記 | COM | ✅ |

#### 格式處理

| 工具 | 說明 | 技術 | 需快取 Range |
|------|------|------|:---:|
| `apply_heading_style(level)` | 套用標題樣式（Heading 1/2/3）到選取段落 | COM | ✅ |
| `apply_body_style` | 套用內文樣式到選取範圍 | COM | ✅ |
| `set_font(name, size, bold, italic, underline)` | 設定選取範圍的字型、字級與樣式 | COM | ✅ |
| `set_paragraph_format(line_spacing, alignment, indent)` | 調整選取段落的行距、對齊與縮排 | COM | ✅ |
| `apply_list_format(type)` | 將選取文字轉為項目符號或編號清單 | COM | ✅ |

#### 報告生成

| 工具 | 說明 | 技術 | 需快取 Range |
|------|------|------|:---:|
| `insert_cover_page(title, author, date)` | 根據資訊建立封面頁 | COM | ✗ |
| `insert_page_number(position)` | 在頁首或頁尾加入頁碼 | COM | ✗ |
| `create_table_of_contents` | 根據標題樣式在文件開頭插入目錄 | COM | ✗ |
| `insert_report_template` | 建立摘要、前言、方法、結果、結論章節架構 | COM | ✗ |
| `export_pdf` | 將文件輸出為 PDF | COM | ✗ |

#### 輸出／報告

| 工具 | 說明 | 技術 | 需快取 Range |
|------|------|------|:---:|
| `get_change_summary` | 回傳本次執行的修改項目與位置 | 系統 | ✗ |

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
- [x] React 聊天 UI（可拖曳、選取文字預覽 + ✕ 清除按鈕）
- [x] Express Bridge 架構
- [x] Python FastAPI Agent
- [x] MCP Server 連線
- [x] `open_file_menu` 工具
- [x] `get_selected_text` 工具（含快取 + UI 選取預覽）
- [x] `get_document_text` 工具
- [x] `replace_selected_text` 工具（COM Range 精準替換，保留換行）
- [x] `get_word_count` 工具（Venom 讀狀態列）
- [x] `insert_text_at_cursor` 工具（COM 快取游標位置插入）
- [x] `count_characters(text)` 工具（純 Python 計算）
- [ ] `get_document_info`
- [ ] `get_document_structure`
- [ ] `get_current_styles`
- [ ] `insert_text_at_cursor`
- [ ] `replace_text`
- [ ] `delete_selected_text`
- [ ] `insert_comment`
- [ ] `highlight_text`
- [ ] `apply_heading_style`
- [ ] `apply_body_style`
- [ ] `set_font`
- [ ] `set_paragraph_format`
- [ ] `apply_list_format`
- [ ] `insert_cover_page`
- [ ] `insert_page_number`
- [ ] `create_table_of_contents`
- [ ] `insert_report_template`
- [ ] `export_pdf`
- [ ] `get_change_summary`

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

