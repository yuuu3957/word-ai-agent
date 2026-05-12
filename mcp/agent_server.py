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


class ChatRequest(BaseModel):
    prompt: str


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


@app.get("/health")
async def health():
    return {
        "status": "ok"
    }