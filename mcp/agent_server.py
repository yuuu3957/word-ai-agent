from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv

from agents import Agent, Runner, enable_verbose_stdout_logging
from agents.mcp import MCPServerStdio

load_dotenv()
enable_verbose_stdout_logging()

BASE_DIR = Path(__file__).parent

mcp_server = None
agent = None

cached_selection_start = -1
cached_selection_end = -1


class ChatRequest(BaseModel):
    prompt: str

class ReplaceAtRangeRequest(BaseModel):
    new_text: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    global mcp_server, agent

    # 啟動時執行
    mcp_server = MCPServerStdio(
        params={
            "command": "python",
            "args": [str(BASE_DIR / "mcp_server.py")],
        }
    )

    await mcp_server.connect()

    agent = Agent(
        name="Word Assistant",
        model="gpt-4o-mini",
        instructions="""
        你是一個 Word AI 助手。

        請根據使用者需求，自動判斷是否需要使用 MCP tools。

        規則：
        1. 回覆使用者時請簡潔說明已完成什麼。
        2. 不要輸出過多推理過程。
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

    return {
        "content": result.final_output
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
        if start == end:
            return {"success": False, "message": "沒有選取文字（start == end）"}
        cached_selection_start = start
        cached_selection_end = end
        return {"success": True, "start": start, "end": end}
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


@app.get("/health")
async def health():
    return {
        "status": "ok"
    }