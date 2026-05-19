import express from 'express';
import cors from 'cors';
import { BrowserWindow } from 'electron';

type ToolResult = {
  success: boolean;
  message: string;
  selected_text?: string;
  text?: string;
};

const PORT = 3002;
const AGENT_SERVER_URL = 'http://127.0.0.1:8000';

let bridgeStarted = false;

function callRendererTool(
  mainWindow: BrowserWindow,
  toolName: string,
  payload: Record<string, unknown> = {}
): Promise<ToolResult> {
  return new Promise((resolve, reject) => {
    const requestId = `${toolName}-${Date.now()}-${Math.random()}`;

    const timeout = setTimeout(() => {
      reject(new Error(`Renderer tool timeout: ${toolName}`));
    }, 10000);

    const replyChannel = `venom-tool-result:${requestId}`;

    const { ipcMain } = require('electron');

    ipcMain.once(replyChannel, (_event: unknown, result: ToolResult) => {
      clearTimeout(timeout);
      resolve(result);
    });

    mainWindow.webContents.send('venom-tool-run', {
      requestId,
      toolName,
      payload,
    });
  });
}

export function startBridge(mainWindow: BrowserWindow) {
  if (bridgeStarted) {
    console.log('[Bridge] already started');
    return;
  }

  bridgeStarted = true;

  const app = express();

  app.use(cors());
  app.use(express.json());

  app.post('/word-ai', async (req, res) => {
    try {
      const { prompt } = req.body;

      if (!prompt) {
        return res.status(400).json({
          error: '缺少 prompt',
        });
      }

      console.log('[Bridge] /word-ai prompt:', prompt);

      const response = await fetch(`${AGENT_SERVER_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorText = await response.text();

        return res.status(500).json({
          error: 'agent_server.py 回應失敗',
          detail: errorText,
        });
      }

      const data = await response.json();

      return res.json({
        content: data.content,
      });
    } catch (error) {
      console.error('[Bridge] /word-ai error:', error);

      return res.status(500).json({
        error: 'bridge.ts 無法連接 agent_server.py',
        detail: String(error),
      });
    }
  });

  app.post('/word/open-file-menu', async (_req, res) => {
    try {
      console.log('[Bridge] /word/open-file-menu called');

      const result = await callRendererTool(mainWindow, 'open-file-menu');

      if (!result.success) {
        return res.status(500).json(result);
      }

      return res.json(result);
    } catch (error) {
      console.error('[Bridge] /word/open-file-menu error:', error);

      return res.status(500).json({
        success: false,
        message: `開啟 Word 檔案選單失敗：${String(error)}`,
      });
    }
  });


  app.get('/word/get-selected-text', async (req, res) => {
    try {
      console.log('[Bridge] /word/selected-text called');

      const result = await callRendererTool(mainWindow, 'get-selected-text');

      res.json({
        success: true,
        selected_text: result?.selected_text ?? '',
      });
    } catch (error) {
      console.error('[Bridge] /word/selected-text error:', error);

      res.status(500).json({
        success: false,
        selected_text: '',
        message: String(error),
      });
    }
  });

  app.post('/word/refresh-selected-text-cache', async (req, res) => {
  try {
    console.log('[Bridge] /word/refresh-selected-text-cache called');

  const result = await callRendererTool(mainWindow, 'refresh-selected-text-cache');

    console.log('[Bridge] refresh cache result:', result);

    res.json(result);
  } catch (error) {
    console.error('[Bridge] /word/refresh-selected-text-cache error:', error);

    res.status(500).json({
      success: false,
      selected_text: '',
      message: String(error),
      source: 'none',
    });
  }
  });

  app.get('/word/get-document-text', async (_req, res) => {
    try {
      console.log('[Bridge] /word/get-document-text called');

      const result = await callRendererTool(mainWindow, 'get-document-text');

      res.json({
        success: true,
        text: result?.text ?? '',
      });
    } catch (error) {
      console.error('[Bridge] /word/get-document-text error:', error);

      res.status(500).json({
        success: false,
        text: '',
        message: String(error),
      });
    }
  });

  app.post('/word/clear-cache', async (_req, res) => {
    try {
      await Promise.all([
        callRendererTool(mainWindow, 'clear-selection-cache'),
        fetch(`${AGENT_SERVER_URL}/word/clear-selection-range`, { method: 'POST' }),
      ]);
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ success: false, message: String(error) });
    }
  });

  app.post('/word/cache-selection-range', async (_req, res) => {
    try {
      const response = await fetch(`${AGENT_SERVER_URL}/word/cache-selection-range`, { method: 'POST' });
      const data = await response.json();
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ success: false, message: String(error) });
    }
  });

  app.post('/word/replace-at-range', async (req, res) => {
    try {
      const { new_text } = req.body;
      if (!new_text) {
        return res.status(400).json({ success: false, message: '缺少 new_text' });
      }
      const response = await fetch(`${AGENT_SERVER_URL}/word/replace-at-range`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_text }),
      });
      const data = await response.json();
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ success: false, message: String(error) });
    }
  });

  app.get('/health', (_req, res) => {
    return res.json({
      status: 'ok',
      service: 'bridge.ts',
    });
  });

  app.listen(PORT, () => {
    console.log(`[Bridge] running on http://127.0.0.1:${PORT}`);
  });
}