from fastmcp import FastMCP
import requests

mcp = FastMCP("word-tools")

@mcp.tool()
def open_file_menu() -> str:
    """開啟 Microsoft Word 的「檔案」選單或 Backstage 頁面。"""
    try:
        response = requests.post(
            "http://127.0.0.1:3002/word/open-file-menu",
            timeout=10
        )

        if response.status_code != 200:
            return f"開啟 Word 檔案選單失敗：{response.text}"

        data = response.json()
        return data.get("message", "已開啟 Word 檔案選單。")

    except Exception as e:
        return f"無法連接 Venom server：{str(e)}"

@mcp.tool()    
def get_selected_text() -> str:
    """獲得 Microsoft Word 使用者所選擇之文字內容。"""
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
    """將 Word 中使用者選取的文字替換為新內容。使用前請先確認使用者已選取文字。"""
    try:
        response = requests.post(
            "http://127.0.0.1:3002/word/replace-selected-text",
            json={"new_text": new_text},
            timeout=10
        )

        if response.status_code != 200:
            return f"替換失敗：{response.text}"

        data = response.json()
        if not data.get("success"):
            return f"替換失敗：{data.get('message', '未知錯誤')}"

        return "替換成功。"

    except Exception as e:
        return f"無法連接 Venom server：{str(e)}"

@mcp.tool()
def replace_text_com(old_text: str, new_text: str) -> str:
    """使用 Windows COM 介面將 Word 文件中的指定文字替換為新內容。不需要使用者先選取文字。"""
    try:
        import win32com.client
        word = win32com.client.GetActiveObject("Word.Application")
        find = word.ActiveDocument.Content.Find
        find.ClearFormatting()
        result = find.Execute(old_text, False, True, False, False, False, True, 1, False, new_text, 2)
        if result:
            return f"替換成功：「{old_text}」→「{new_text}」"
        else:
            return f"找不到文字：「{old_text}」"
    except Exception as e:
        return f"COM 替換失敗：{str(e)}"

if __name__ == "__main__":
    mcp.run(transport="stdio")