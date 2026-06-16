from fastmcp import FastMCP
import requests

mcp = FastMCP("word-tools")

@mcp.tool()
def get_selected_text() -> str:
    """獲得 Microsoft Word 使用者所選擇之文字內容。"""
    print("[MCP] get_selected_text called")
    try:
        response = requests.get(
            "http://127.0.0.1:3002/word/get-selected-text",
            timeout=10
        )

        if response.status_code != 200:
            return f"獲得所選文字內容失敗：{response.text}"

        data = response.json()
        selected = data.get("selected_text", "")
        if not selected:
            return "目前沒有選取文字。"
        return f"選取的文字：{selected}"

    except Exception as e:
        return f"無法連接 Venom server：{str(e)}"

@mcp.tool()
def get_document_text() -> str:
    """獲得 Microsoft Word 當前文件所有內容。"""
    print("[MCP] get_document_text called")
    try:
        response = requests.get(
            "http://127.0.0.1:3002/word/get-document-text",
            timeout=10
        )

        if response.status_code != 200:
            return f"獲得所選文字內容失敗：{response.text}"

        data = response.json()
        text = data.get("text", "")
        if not text:
            return "目前沒有文字內容。"
        return f"文件內容：{text}"

    except Exception as e:
        return f"無法連接 Venom server：{str(e)}"


@mcp.tool()
def replace_selected_text(new_text: str) -> str:
    """將 Word 中使用者選取的文字替換為新內容。使用 Venom 快取的選取位置（Range）精準替換，不會誤改重複文字。使用前請確認使用者已在 Word 選取文字並將滑鼠移到 overlay 更新快取。"""
    print(f"[MCP] replace_selected_text called, new_text length: {len(new_text)}")
    try:
        response = requests.post(
            "http://127.0.0.1:3002/word/replace-at-range",
            json={"new_text": new_text},
            timeout=10
        )
        if response.status_code != 200:
            return f"替換失敗：{response.text}"

        data = response.json()
        if not data.get("success"):
            return f"替換失敗：{data.get('message', '未知錯誤')}"

        return data.get("message", "替換成功。")

    except Exception as e:
        return f"替換失敗：{str(e)}"


@mcp.tool()
def get_word_count() -> str:
    """獲取 Word 文件目前的字數（字元數），與 Word 狀態列顯示一致。"""
    print("[MCP] get_word_count called")
    try:
        response = requests.get(
            "http://127.0.0.1:3002/word/word-count",
            timeout=10
        )
        data = response.json()
        if not data.get("success"):
            return f"字數取得失敗：{data.get('message', '未知錯誤')}"
        return f"目前文件字數：{data.get('count', 0)} 字"
    except Exception as e:
        return f"字數取得失敗：{str(e)}"


@mcp.tool()
def replace_text(old_text: str, new_text: str, ranges: list[dict] = None) -> str:
    """在 Word 文件中替換文字。兩種用法：
    1. 全文批次替換（不提供 ranges）：搜尋全文所有符合的文字並全部替換，適合批次統一用詞。
    2. 指定範圍替換（提供 ranges）：將 search_text 回傳的 ranges 傳入，只替換那些位置。
       配合 search_text(within_selection=True) 可實現「只替換選取範圍內的所有符合文字」。"""
    print(f"[MCP] replace_text called: '{old_text}' → '{new_text}', ranges={len(ranges) if ranges else 0} 筆")
    try:
        payload: dict = {"old_text": old_text, "new_text": new_text}
        if ranges is not None:
            payload["ranges"] = ranges
        response = requests.post(
            "http://127.0.0.1:3002/word/replace-in-document",
            json=payload,
            timeout=60
        )
        data = response.json()
        if not data.get("success"):
            return f"替換失敗：{data.get('message', '未知錯誤')}"
        return data.get("message", "替換成功。")
    except Exception as e:
        return f"替換失敗：{str(e)}"


@mcp.tool()
def insert_text_at_cursor(text: str) -> str:
    """在 Word 文件游標目前位置插入文字。使用前請確認使用者已將游標移到 Word 目標位置，再移到 overlay 更新快取。"""
    print(f"[MCP] insert_text_at_cursor called, text length: {len(text)}")
    try:
        response = requests.post(
            "http://127.0.0.1:3002/word/insert-at-cursor",
            json={"text": text},
            timeout=10
        )
        data = response.json()
        if not data.get("success"):
            return f"插入失敗：{data.get('message', '未知錯誤')}"
        return data.get("message", "插入成功。")
    except Exception as e:
        return f"插入失敗：{str(e)}"


@mcp.tool()
def set_font(font_name: str = None, font_size: str = None, bold: bool = None, italic: bool = None, underline: bool = None, strikethrough: bool = None, font_color: str = None, ranges: list[dict] = None) -> str:
    """對 Word 中的文字套用字元格式。
    兩種用法：
    1. 對目前選取文字套用（不提供 ranges）：使用者需先在 Word 選取文字。
    2. 批次套用（提供 ranges）：將 search_text 回傳的 ranges 直接傳入，自動對全部位置套用格式。
    可設定：font_name（字型）、font_size（字級，字串如 "12"）、bold（粗體）、italic（斜體）、
    underline（底線）、strikethrough（刪除線）、font_color（字色，hex 如 "#FF0000" 或 "auto"）。"""
    print(f"[MCP] set_font called: bold={bold}, italic={italic}, underline={underline}, strikethrough={strikethrough}, font_color={font_color}, ranges={len(ranges) if ranges else 0} 筆")
    try:
        payload = {}
        if font_name is not None:
            payload["font_name"] = font_name
        if font_size is not None:
            payload["font_size"] = str(font_size)
        if bold is not None:
            payload["bold"] = bold
        if italic is not None:
            payload["italic"] = italic
        if underline is not None:
            payload["underline"] = underline
        if strikethrough is not None:
            payload["strikethrough"] = strikethrough
        if font_color is not None:
            payload["font_color"] = font_color
        if ranges is not None:
            payload["ranges"] = ranges

        response = requests.post(
            "http://127.0.0.1:3002/word/set-font",
            json=payload,
            timeout=60
        )
        data = response.json()
        if not data.get("success"):
            return f"格式設定失敗：{data.get('message', '未知錯誤')}"
        return data.get("message", "格式設定完成。")
    except Exception as e:
        return f"無法連接 Venom server：{str(e)}"


@mcp.tool()
def get_document_structure() -> str:
    """取得 Word 文件的段落結構，回傳每個段落的索引、目前套用的樣式名稱、以及完整文字內容。
    用於了解文件整體排版狀況，是批次格式化的第一步。"""
    print("[MCP] get_document_structure called")
    try:
        response = requests.get(
            "http://127.0.0.1:3002/word/get-document-structure",
            timeout=15
        )
        data = response.json()
        if not data.get("success"):
            return f"取得文件結構失敗：{data.get('message', '未知錯誤')}"
        paragraphs = data.get("paragraphs", [])
        if not paragraphs:
            return "文件沒有段落內容。"
        lines = []
        for p in paragraphs:
            text_preview = p['text'][:50] + ('...' if len(p['text']) > 50 else '')
            lines.append(f"[{p['index']}] 樣式:「{p['style']}」 內容:「{text_preview}」")
        return "文件段落結構：\n" + "\n".join(lines)
    except Exception as e:
        return f"無法連接 Venom server：{str(e)}"


@mcp.tool()
def list_available_styles() -> str:
    """列出目前 Word 文件中已啟用的所有樣式名稱。
    在呼叫 apply_paragraph_styles 之前使用，確認樣式名稱是否存在（例如「標題 1」、「內文」）。"""
    print("[MCP] list_available_styles called")
    try:
        response = requests.get(
            "http://127.0.0.1:3002/word/list-styles",
            timeout=10
        )
        data = response.json()
        if not data.get("success"):
            return f"取得樣式清單失敗：{data.get('message', '未知錯誤')}"
        styles = data.get("styles", [])
        if not styles:
            return "找不到任何樣式。"
        return "可用樣式：\n" + "\n".join(f"- {s}" for s in styles)
    except Exception as e:
        return f"無法連接 Venom server：{str(e)}"


@mcp.tool()
def apply_paragraph_styles(changes: list[dict]) -> str:
    """批次對 Word 文件段落套用樣式。
    changes 是一個列表，每個元素格式為 {"index": 段落索引, "style": "樣式名稱"}。
    段落索引來自 get_document_structure 的結果。樣式名稱需使用 list_available_styles 確認。
    例如：[{"index": 0, "style": "標題 1"}, {"index": 1, "style": "內文"}]"""
    print(f"[MCP] apply_paragraph_styles called, {len(changes)} changes")
    try:
        response = requests.post(
            "http://127.0.0.1:3002/word/apply-paragraph-styles",
            json={"changes": changes},
            timeout=30
        )
        data = response.json()
        if not data.get("success"):
            return f"套用樣式失敗：{data.get('message', '未知錯誤')}"
        return data.get("message", "套用完成。")
    except Exception as e:
        return f"無法連接 Venom server：{str(e)}"


@mcp.tool()
def count_characters(text: str) -> str:
    """計算給定文字的字數：中文字每字算 1，英文單字算 1，標點與空白不計。用於驗證改寫後的文字是否符合字數要求。"""
    print(f"[MCP] count_characters called, text length: {len(text)}")
    import re
    cjk = sum(1 for c in text if '一' <= c <= '鿿')
    english_words = len(re.findall(r'[a-zA-Z]+', text))
    total = cjk + english_words
    return f"共 {total} 字（中文 {cjk} 字，英文 {english_words} 個單字）"


@mcp.tool()
def modify_style(style_name: str, font_name: str = None, font_name_ascii: str = None, font_name_fareast: str = None, font_size: str = None, bold: bool = None, italic: bool = None, alignment: str = None, line_spacing: float = None, space_before: float = None, space_after: float = None, font_color: str = None) -> str:
    """修改 Word 文件中指定樣式的格式定義。樣式名稱請先用 list_available_styles 確認。
    font_name 設定所有文字字型；font_name_ascii 設定英文字型；font_name_fareast 設定中文字型（可同時使用後兩者分別設定）。
    alignment 可為 "left"/"center"/"right"/"justify"，line_spacing 為倍數如 1.5，space_before/space_after 為段落間距（pt），font_color 為 hex 如 "#FF0000" 或 "auto"。"""
    print(f"[MCP] modify_style called: {style_name}")
    try:
        payload = {"style_name": style_name}
        if font_name is not None: payload["font_name"] = font_name
        if font_name_ascii is not None: payload["font_name_ascii"] = font_name_ascii
        if font_name_fareast is not None: payload["font_name_fareast"] = font_name_fareast
        if font_size is not None: payload["font_size"] = float(font_size)
        if bold is not None: payload["bold"] = bold
        if italic is not None: payload["italic"] = italic
        if alignment is not None: payload["alignment"] = alignment
        if line_spacing is not None: payload["line_spacing"] = line_spacing
        if space_before is not None: payload["space_before"] = space_before
        if space_after is not None: payload["space_after"] = space_after
        if font_color is not None: payload["font_color"] = font_color
        response = requests.post(
            "http://127.0.0.1:3002/word/modify-style",
            json=payload,
            timeout=10
        )
        data = response.json()
        if not data.get("success"):
            return f"樣式修改失敗：{data.get('message', '未知錯誤')}"
        return data.get("message", "樣式已更新。")
    except Exception as e:
        return f"無法連接 Venom server：{str(e)}"


@mcp.tool()
def search_text(keyword: str, match_case: bool = False, match_whole_word: bool = False, within_selection: bool = False) -> str:
    """在 Word 文件中搜尋所有符合關鍵字的位置，回傳每個出現位置的 start/end 字元索引。
    within_selection=True 時，只在使用者目前快取的選取範圍內搜尋；False（預設）則搜尋全文。
    配合 set_font(ranges=...) 使用：將回傳的 ranges 直接傳入 set_font 即可批次套用格式。
    match_case：是否區分大小寫（預設 False）。match_whole_word：是否全字匹配（預設 False）。"""
    print(f"[MCP] search_text called: keyword={keyword}, within_selection={within_selection}")
    try:
        import urllib.parse
        params = urllib.parse.urlencode({
            "keyword": keyword,
            "match_case": str(match_case).lower(),
            "match_whole_word": str(match_whole_word).lower(),
            "within_selection": str(within_selection).lower(),
        })
        response = requests.get(
            f"http://127.0.0.1:3002/word/search-text?{params}",
            timeout=10
        )
        data = response.json()
        if not data.get("success"):
            return f"搜尋失敗：{data.get('message', '未知錯誤')}"
        count = data.get("count", 0)
        if count == 0:
            return f"找不到「{keyword}」"
        results = data.get("results", [])
        import json
        ranges_json = json.dumps([{"start": r["start"], "end": r["end"]} for r in results], ensure_ascii=False)
        lines = [f"找到 {count} 處「{keyword}」，請將以下 ranges 直接傳入 set_font："]
        lines.append(f"ranges={ranges_json}")
        return "\n".join(lines)
    except Exception as e:
        return f"搜尋失敗：{str(e)}"


@mcp.tool()
def set_paragraph_format(alignment: str = None, line_spacing: float = None, space_before: float = None, space_after: float = None, left_indent: float = None, right_indent: float = None, first_line_indent: float = None, paragraph_indices: list[int] = None) -> str:
    """對 Word 段落套用格式。
    兩種用法：
    1. 對目前選取段落套用（不提供 paragraph_indices）：使用者需先在 Word 選取段落。
    2. 批次套用（提供 paragraph_indices）：將 get_document_structure 回傳的段落索引傳入，自動對指定段落套用格式。
    可設定：alignment（對齊，left/center/right/justify）、line_spacing（行距倍數，如 1.5）、
    space_before/space_after（段落前後間距，pt）、left_indent/right_indent（縮排，pt，1cm≈28.35pt）、first_line_indent（首行縮排，pt）。"""
    print(f"[MCP] set_paragraph_format called: alignment={alignment}, line_spacing={line_spacing}, paragraph_indices={paragraph_indices}")
    try:
        payload: dict = {}
        if alignment is not None: payload["alignment"] = alignment
        if line_spacing is not None: payload["line_spacing"] = line_spacing
        if space_before is not None: payload["space_before"] = space_before
        if space_after is not None: payload["space_after"] = space_after
        if left_indent is not None: payload["left_indent"] = left_indent
        if right_indent is not None: payload["right_indent"] = right_indent
        if first_line_indent is not None: payload["first_line_indent"] = first_line_indent
        if paragraph_indices is not None: payload["paragraph_indices"] = paragraph_indices
        response = requests.post(
            "http://127.0.0.1:3002/word/set-paragraph-format",
            json=payload,
            timeout=30
        )
        data = response.json()
        if not data.get("success"):
            return f"段落格式設定失敗：{data.get('message', '未知錯誤')}"
        return data.get("message", "段落格式設定完成。")
    except Exception as e:
        return f"無法連接 Venom server：{str(e)}"


if __name__ == "__main__":
    mcp.run(transport="stdio")
