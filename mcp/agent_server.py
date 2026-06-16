from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv

from agents import Agent, Runner, enable_verbose_stdout_logging
from agents.mcp import MCPServerStdio

load_dotenv()

BASE_DIR = Path(__file__).parent

mcp_server = None
agent = None

cached_selection_start = -1
cached_selection_end = -1


class ChatRequest(BaseModel):
    prompt: str

class ReplaceAtRangeRequest(BaseModel):
    new_text: str

class InsertAtCursorRequest(BaseModel):
    text: str

class ReplaceInDocumentRequest(BaseModel):
    old_text: str
    new_text: str

class SelectRangeRequest(BaseModel):
    start: int
    end: int

class SetSelectionCharFormatRequest(BaseModel):
    font_color: str = None

class SetParagraphFormatRequest(BaseModel):
    paragraph_indices: list[int] = None
    alignment: str = None
    line_spacing: float = None
    space_before: float = None
    space_after: float = None
    left_indent: float = None
    right_indent: float = None
    first_line_indent: float = None

class ParagraphStyleItem(BaseModel):
    index: int
    style: str

class ApplyParagraphStylesRequest(BaseModel):
    changes: list[ParagraphStyleItem]

class ModifyStyleRequest(BaseModel):
    style_name: str
    font_name: str = None
    font_name_ascii: str = None
    font_name_fareast: str = None
    font_size: float = None
    bold: bool = None
    italic: bool = None
    alignment: str = None
    line_spacing: float = None
    space_before: float = None
    space_after: float = None
    font_color: str = None         # hex like "#FF0000", or "auto"


@asynccontextmanager
async def lifespan(app: FastAPI):
    global mcp_server, agent

    # 啟動時執行
    mcp_server = MCPServerStdio(
        params={
            "command": "python",
            "args": [str(BASE_DIR / "mcp_server.py")],
        },
        client_session_timeout_seconds=60
    )

    await mcp_server.connect()

    agent = Agent(
        name="Word Assistant",
        model="gpt-4o-mini",
        instructions="""
        你是一個 Word 文件編輯助手。你的工作是幫助使用者完成、改善他們正在撰寫的 Word 文件。
        你不是一個回答問題的聊天機器人——你是在協助使用者「寫文件」。
        所有生成、改寫、新增的內容，預設都要寫入 Word 文件，除非使用者明確說「告訴我」、「顯示給我看」。

        ## 工具使用規則

        ### 判斷要讀什麼：
        - 使用者說「這篇文章」、「全文」、「整篇」→ 直接呼叫 get_document_text，不需要使用者選取任何東西。
        - 使用者說「這段」、「我選的」、「幫我改這裡」→ 呼叫 get_selected_text 取快取選取文字。
        - 不確定時，優先呼叫 get_document_text，不要要求使用者選取。

        ### 需要操作「選取的文字」時（修改、修正、格式化等）：
        1. 先呼叫 get_selected_text，確認是否有快取的選取文字。
        2. 如果有選取文字，直接對它進行操作（呼叫 replace_selected_text 等）。
        3. 只有當任務明確需要選取範圍（如替換特定段落）且 get_selected_text 回傳空值時，才請使用者先選取文字。

        ### 常見指令對應：
        - 「幫我寫摘要」、「為這篇文章寫摘要」→ get_document_text 讀全文 → 生成摘要 → replace_selected_text 寫入
        - 「修正錯字」、「改善這段」→ 先呼叫 get_document_text 了解全文語境，再呼叫 get_selected_text 取得選取文字，在語境下修改 → replace_selected_text
        - 「刪除這段」、「刪掉選取的文字」→ replace_selected_text(new_text="")
        - 「讀取全文」、「看全文內容」→ get_document_text，只顯示在對話框
        - 「替換文字」（不需選取）→ replace_text
        - 「弄成 X 字」、「控制字數」→ get_selected_text 拿原文 → 改寫 → count_characters 驗證 → replace_selected_text
        - 「把所有『X』改成粗體／斜體／某字型/某大小」→ search_text 取得位置清單 → set_font(ranges=...) ，絕對不可用 replace_text 加 Markdown 符號
        - 「把這段裡所有『X』改成粗體／格式」→ search_text(within_selection=True) → set_font(ranges=...)
        - 「把這段裡所有『X』替換成『Y』」→ search_text(within_selection=True) → replace_text("X","Y", ranges=...)
        - 「全文替換『X』→『Y』」→ replace_text("X","Y")（不需要 ranges，直接全文替換）
        - 「調整這段縮排/行距/對齊/間距」→ set_paragraph_format（不傳 paragraph_indices，對快取選取段落套用）
        - 「把第X~Y段/標題段落設為某對齊/縮排/行距」→ get_document_structure → set_paragraph_format(paragraph_indices=[...], ...)

        ### 寫入規則：
        - 只要使用者要求生成、改寫、新增文字到文件，一律呼叫 replace_selected_text 寫入，不可只顯示在對話框。
        - 若使用者只是「查看」或「告訴我」，才只回覆在對話框。

        ### 字數計算規則：
        - 任何需要計算或驗證字數的情況，必須呼叫 count_characters，不可自行估算。
        - 改寫完成後先用 count_characters 確認，若與目標相差超過 5 字則繼續調整。

        ## 排版與格式化規則

        ### 判斷要做全文排版時

        - 依序執行：
          1. 呼叫 list_available_styles 確認樣式名稱。
          2. 根據使用者規則，呼叫 modify_style 修改對應樣式定義（可多次呼叫，每種段落類型各一次）。
          3. 呼叫 get_document_structure 取得段落結構。
          4. 自行判斷每段類型，決定套用什麼樣式。
          5. 呼叫 apply_paragraph_styles 批次套用。

        ### 段落類型判斷規則：
        - 文件第一個非空白段落 → 文章標題
        - 「第X章」、「Chapter X」開頭的獨立段落 → 章標題
        - 「X.X」或「X.X.X」開頭（如 1.1、2.3）的獨立段落 → 節標題
        - 「摘要」、「Abstract」、「參考文獻」、「References」等單獨一行 → 特殊標題
        - 其餘有實質內容的段落 → 內文
        - 空白段落 → 保持原樣，不套用樣式

        ### 其他排版規則：
        - 不要一個段落呼叫一次 apply_paragraph_styles，必須批次傳入所有變更。
        - 樣式名稱必須完全符合 list_available_styles 回傳的名稱，不可自行猜測。
        - modify_style 的 alignment 參數：left/center/right/justify；line_spacing 為倍數如 1.5；font_color 為 hex 如 "#FF0000" 或 "auto"。

        ## 回覆規則
        1. 只用一句話說已完成什麼，例如「已完成排版。」或「已將選取文字替換為 100 字版本。」
        2. 絕對不要列清單、不要用 Markdown 格式（**粗體**、- 符號等）。
        3. 不要描述做了哪些細節步驟，只說最終結果。
        4. 不要輸出推理過程。
        5. 不要要求使用者做已經完成的步驟。
        """,
        mcp_servers=[mcp_server],
    )

    print("Word Assistant agent 已啟動，MCP server 已連線")

    yield

    # 關閉時執行
    if mcp_server:
        await mcp_server.cleanup()

    print("Word Assistant agent 已關閉")


app = FastAPI(lifespan=lifespan)


@app.post("/chat")
async def chat(req: ChatRequest):
    global agent

    if agent is None:
        return {
            "content": "Agent 尚未啟動完成"
        }

    result = await Runner.run(
        agent,
        input=req.prompt,
    )

    tool_calls_used = []
    for item in result.new_items:
        raw = getattr(item, 'raw_item', None)
        name = (
            getattr(raw, 'name', None) or
            getattr(getattr(raw, 'function', None), 'name', None)
        )
        if name:
            tool_calls_used.append(name)

    if tool_calls_used:
        print(f"[Agent] 呼叫工具：{' → '.join(tool_calls_used)}")

    return {
        "content": result.final_output,
    }


@app.post("/word/clear-selection-range")
async def clear_selection_range():
    global cached_selection_start, cached_selection_end
    cached_selection_start = -1
    cached_selection_end = -1
    return {"success": True}


@app.post("/word/cache-selection-range")
async def cache_selection_range():
    global cached_selection_start, cached_selection_end
    try:
        import win32com.client
        word = win32com.client.GetActiveObject("Word.Application")
        start = word.Selection.Start
        end = word.Selection.End
        cached_selection_start = start
        cached_selection_end = end
        is_cursor_only = start == end
        return {"success": True, "start": start, "end": end, "cursor_only": is_cursor_only}
    except Exception as e:
        return {"success": False, "message": str(e)}


@app.post("/word/replace-at-range")
async def replace_at_range(req: ReplaceAtRangeRequest):
    global cached_selection_start, cached_selection_end
    try:
        new_text = req.new_text
        if not new_text:
            return {"success": False, "message": "缺少 new_text"}
        if cached_selection_start < 0 or cached_selection_end <= cached_selection_start:
            return {"success": False, "message": "沒有快取的選取範圍，請先選取文字"}
        import win32com.client
        word = win32com.client.GetActiveObject("Word.Application")
        rng = word.ActiveDocument.Range(cached_selection_start, cached_selection_end)
        old_text = rng.Text
        
        if old_text and old_text.endswith('\r') and not new_text.endswith('\r'):
            new_text = new_text + '\r'
        rng.Text = new_text
        cached_selection_start = -1
        cached_selection_end = -1
        return {"success": True, "message": f"替換成功：「{old_text}」→「{new_text}」"}
    except Exception as e:
        return {"success": False, "message": str(e)}


@app.post("/word/replace-in-document")
async def replace_in_document(req: ReplaceInDocumentRequest):
    try:
        import win32com.client
        word = win32com.client.GetActiveObject("Word.Application")
        find = word.ActiveDocument.Content.Find
        find.ClearFormatting()
        find.Replacement.ClearFormatting()
        result = find.Execute(req.old_text, False, False, False, False, False, True, 1, False, req.new_text, 2)
        if result:
            return {"success": True, "message": f"已將「{req.old_text}」全部替換為「{req.new_text}」"}
        else:
            return {"success": False, "message": f"找不到「{req.old_text}」"}
    except Exception as e:
        return {"success": False, "message": str(e)}


@app.post("/word/insert-at-cursor")
async def insert_at_cursor(req: InsertAtCursorRequest):
    global cached_selection_start
    try:
        if cached_selection_start < 0:
            return {"success": False, "message": "沒有快取的游標位置，請先將游標移到 Word 再移到 overlay"}
        import win32com.client
        word = win32com.client.GetActiveObject("Word.Application")
        rng = word.ActiveDocument.Range(cached_selection_start, cached_selection_start)
        rng.InsertAfter(req.text)
        cached_selection_start = -1
        cached_selection_end = -1
        return {"success": True, "message": f"已插入文字：{req.text[:20]}{'...' if len(req.text) > 20 else ''}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


@app.get("/word/get-selection-format")
async def get_selection_format():
    try:
        import win32com.client
        word = win32com.client.GetActiveObject("Word.Application")
        sel = word.Selection
        bold = sel.Font.Bold
        italic = sel.Font.Italic
        return {
            "success": True,
            "bold": bold == -1,
            "italic": italic == -1,
        }
    except Exception as e:
        return {"success": False, "message": str(e)}


@app.get("/word/get-document-structure")
async def get_document_structure():
    try:
        import win32com.client
        word = win32com.client.GetActiveObject("Word.Application")
        doc = word.ActiveDocument
        paragraphs = []
        for i, para in enumerate(doc.Paragraphs):
            text = para.Range.Text.rstrip('\r')
            style_name = para.Style.NameLocal
            paragraphs.append({
                "index": i,
                "text": text,
                "style": style_name,
            })
        return {"success": True, "paragraphs": paragraphs}
    except Exception as e:
        return {"success": False, "message": str(e)}


@app.get("/word/list-styles")
async def list_styles():
    try:
        import win32com.client
        word = win32com.client.GetActiveObject("Word.Application")
        doc = word.ActiveDocument
        styles = [s.NameLocal for s in doc.Styles if s.InUse]
        return {"success": True, "styles": styles}
    except Exception as e:
        return {"success": False, "message": str(e)}


@app.post("/word/apply-paragraph-styles")
async def apply_paragraph_styles(req: ApplyParagraphStylesRequest):
    try:
        import win32com.client
        word = win32com.client.GetActiveObject("Word.Application")
        doc = word.ActiveDocument
        total = doc.Paragraphs.Count
        applied = []
        failed = []
        for item in req.changes:
            if item.index < 0 or item.index >= total:
                failed.append(f"段落 {item.index} 超出範圍")
                continue
            try:
                para = doc.Paragraphs(item.index + 1)  # Word COM 從 1 開始
                para.Style = item.style
                applied.append(item.index)
            except Exception as e:
                failed.append(f"段落 {item.index} 套用「{item.style}」失敗：{e}")
        msg = f"成功套用 {len(applied)} 個段落"
        if failed:
            msg += f"，失敗 {len(failed)} 個：" + "；".join(failed)
        return {"success": True, "message": msg, "applied": applied}
    except Exception as e:
        return {"success": False, "message": str(e)}


@app.post("/word/modify-style")
async def modify_style(req: ModifyStyleRequest):
    try:
        import win32com.client
        word = win32com.client.GetActiveObject("Word.Application")
        doc = word.ActiveDocument
        try:
            style = doc.Styles(req.style_name)
        except Exception:
            return {"success": False, "message": f"找不到樣式「{req.style_name}」"}
        applied = []
        if req.font_name is not None:
            style.Font.Name = req.font_name
            applied.append(f"字型={req.font_name}")
        if req.font_name_ascii is not None:
            style.Font.NameAscii = req.font_name_ascii
            applied.append(f"英文字型={req.font_name_ascii}")
        if req.font_name_fareast is not None:
            style.Font.NameFarEast = req.font_name_fareast
            applied.append(f"中文字型={req.font_name_fareast}")
        if req.font_size is not None:
            style.Font.Size = req.font_size
            applied.append(f"字級={req.font_size}")
        if req.bold is not None:
            style.Font.Bold = req.bold
            applied.append(f"粗體={req.bold}")
        if req.italic is not None:
            style.Font.Italic = req.italic
            applied.append(f"斜體={req.italic}")
        if req.alignment is not None:
            alignment_map = {"left": 0, "center": 1, "right": 2, "justify": 3}
            if req.alignment in alignment_map:
                style.ParagraphFormat.Alignment = alignment_map[req.alignment]
                applied.append(f"對齊={req.alignment}")
        if req.line_spacing is not None:
            ls = req.line_spacing
            if ls == 1.0:
                style.ParagraphFormat.LineSpacingRule = 0
            elif ls == 1.5:
                style.ParagraphFormat.LineSpacingRule = 1
            elif ls == 2.0:
                style.ParagraphFormat.LineSpacingRule = 2
            else:
                style.ParagraphFormat.LineSpacingRule = 5
                style.ParagraphFormat.LineSpacing = ls * 12
            applied.append(f"行距={ls}倍")
        if req.space_before is not None:
            style.ParagraphFormat.SpaceBefore = req.space_before
            applied.append(f"段前距={req.space_before}pt")
        if req.space_after is not None:
            style.ParagraphFormat.SpaceAfter = req.space_after
            applied.append(f"段後距={req.space_after}pt")
        if req.font_color is not None:
            if req.font_color.lower() == "auto":
                style.Font.Color = -16777216  # wdColorAutomatic
            else:
                hex_str = req.font_color.lstrip('#')
                r = int(hex_str[0:2], 16)
                g = int(hex_str[2:4], 16)
                b = int(hex_str[4:6], 16)
                style.Font.Color = r + g * 256 + b * 65536
            applied.append(f"顏色={req.font_color}")
        if not applied:
            return {"success": True, "message": "無變更"}
        return {"success": True, "message": f"樣式「{req.style_name}」已更新：{'、'.join(applied)}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


@app.post("/word/set-selection-char-format")
async def set_selection_char_format(req: SetSelectionCharFormatRequest):
    try:
        import win32com.client
        word = win32com.client.GetActiveObject("Word.Application")
        sel = word.Selection
        applied = []
        if req.font_color is not None:
            if req.font_color.lower() == "auto":
                sel.Font.Color = -16777216
            else:
                hex_str = req.font_color.lstrip('#')
                r = int(hex_str[0:2], 16)
                g = int(hex_str[2:4], 16)
                b = int(hex_str[4:6], 16)
                sel.Font.Color = r + g * 256 + b * 65536
            applied.append(f"顏色={req.font_color}")
        if not applied:
            return {"success": True, "message": "無變更"}
        return {"success": True, "message": f"套用：{'、'.join(applied)}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


@app.get("/word/search-text")
async def search_text_in_document(keyword: str, match_case: bool = False, match_whole_word: bool = False, within_selection: bool = False):
    global cached_selection_start, cached_selection_end
    try:
        if not keyword:
            return {"success": False, "message": "關鍵字不能為空", "results": []}
        import win32com.client
        word = win32com.client.GetActiveObject("Word.Application")
        doc = word.ActiveDocument

        if within_selection:
            if cached_selection_start < 0 or cached_selection_end <= cached_selection_start:
                return {"success": False, "message": "沒有快取的選取範圍，請先選取文字再移到 overlay", "results": []}
            search_start = cached_selection_start
            search_end = cached_selection_end
        else:
            search_start = 0
            search_end = doc.Content.End

        results = []
        rng = doc.Range(search_start, search_end)
        while True:
            rng.Find.ClearFormatting()
            rng.Find.Text = keyword
            rng.Find.Forward = True
            rng.Find.Wrap = 0
            rng.Find.MatchCase = match_case
            rng.Find.MatchWholeWord = match_whole_word
            rng.Find.Format = False
            if not rng.Find.Execute():
                break
            if rng.End > search_end:
                break
            results.append({"start": rng.Start, "end": rng.End, "text": rng.Text})
            new_start = rng.End
            if new_start >= search_end:
                break
            rng = doc.Range(new_start, search_end)
        return {"success": True, "keyword": keyword, "count": len(results), "results": results}
    except Exception as e:
        return {"success": False, "message": str(e), "results": []}


@app.post("/word/select-range")
async def select_range(req: SelectRangeRequest):
    global cached_selection_start, cached_selection_end
    try:
        import win32com.client
        word = win32com.client.GetActiveObject("Word.Application")
        doc = word.ActiveDocument
        doc.Range(req.start, req.end).Select()
        cached_selection_start = req.start
        cached_selection_end = req.end
        return {"success": True, "start": req.start, "end": req.end}
    except Exception as e:
        return {"success": False, "message": str(e)}


@app.post("/word/set-paragraph-format")
async def set_paragraph_format(req: SetParagraphFormatRequest):
    global cached_selection_start, cached_selection_end
    try:
        import win32com.client
        word = win32com.client.GetActiveObject("Word.Application")
        doc = word.ActiveDocument
        alignment_map = {"left": 0, "center": 1, "right": 2, "justify": 3}

        def apply_to_para(para):
            pf = para.Format
            applied = []
            if req.alignment is not None and req.alignment in alignment_map:
                pf.Alignment = alignment_map[req.alignment]
                applied.append(f"對齊={req.alignment}")
            if req.line_spacing is not None:
                ls = req.line_spacing
                if ls == 1.0:
                    pf.LineSpacingRule = 0
                elif ls == 1.5:
                    pf.LineSpacingRule = 1
                elif ls == 2.0:
                    pf.LineSpacingRule = 2
                else:
                    pf.LineSpacingRule = 5
                    pf.LineSpacing = ls * 12
                applied.append(f"行距={ls}倍")
            if req.space_before is not None:
                pf.SpaceBefore = req.space_before
                applied.append(f"段前={req.space_before}pt")
            if req.space_after is not None:
                pf.SpaceAfter = req.space_after
                applied.append(f"段後={req.space_after}pt")
            if req.left_indent is not None:
                pf.LeftIndent = req.left_indent
                applied.append(f"左縮排={req.left_indent}pt")
            if req.right_indent is not None:
                pf.RightIndent = req.right_indent
                applied.append(f"右縮排={req.right_indent}pt")
            if req.first_line_indent is not None:
                pf.FirstLineIndent = req.first_line_indent
                applied.append(f"首行縮排={req.first_line_indent}pt")
            return applied

        if req.paragraph_indices is not None:
            total = doc.Paragraphs.Count
            applied_count = 0
            failed = []
            all_applied = []
            for idx in req.paragraph_indices:
                if idx < 0 or idx >= total:
                    failed.append(f"段落 {idx} 超出範圍")
                    continue
                try:
                    para = doc.Paragraphs(idx + 1)
                    all_applied.extend(apply_to_para(para))
                    applied_count += 1
                except Exception as e:
                    failed.append(f"段落 {idx}：{e}")
            msg = f"已套用 {applied_count} 個段落"
            if failed:
                msg += f"，失敗：{'；'.join(failed)}"
            return {"success": len(failed) == 0, "message": msg}
        else:
            if cached_selection_start < 0:
                return {"success": False, "message": "沒有快取的選取範圍，請先選取文字再移到 overlay"}
            sel_range = doc.Range(cached_selection_start, cached_selection_end)
            count = 0
            all_applied = []
            for para in sel_range.Paragraphs:
                all_applied.extend(apply_to_para(para))
                count += 1
            if count == 0:
                return {"success": False, "message": "選取範圍內沒有段落"}
            unique = list(dict.fromkeys(all_applied))
            return {"success": True, "message": f"已套用 {count} 個段落：{'、'.join(unique)}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


@app.get("/health")
async def health():
    return {
        "status": "ok"
    }