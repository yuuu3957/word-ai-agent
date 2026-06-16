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
  
  app.get('/word/get-selected-text', async (_req, res) => {
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

  app.post('/word/refresh-selected-text-cache', async (_req, res) => {
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

  app.post('/word/replace-in-document', async (req, res) => {
    try {
      const { old_text, new_text, ranges } = req.body;

      if (ranges && Array.isArray(ranges) && ranges.length > 0) {
        const sortedRanges = [...ranges].sort((a, b) => b.start - a.start);
        const applied: string[] = [];
        const failed: string[] = [];

        for (const range of sortedRanges) {
          try {
            const selectRes = await fetch(`${AGENT_SERVER_URL}/word/select-range`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ start: range.start, end: range.end }),
            });
            const selectData = await selectRes.json();
            if (!selectData.success) { failed.push(`${range.start}~${range.end}`); continue; }

            const replaceRes = await fetch(`${AGENT_SERVER_URL}/word/replace-at-range`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ new_text }),
            });
            const replaceData = await replaceRes.json();
            if (replaceData.success) {
              applied.push(`${range.start}~${range.end}`);
            } else {
              failed.push(`${range.start}~${range.end}`);
            }
          } catch (e) {
            failed.push(`${range.start}~${range.end}`);
          }
        }

        const msg = `已替換 ${applied.length} 處${failed.length ? `，失敗 ${failed.length} 處` : ''}`;
        return res.json({ success: failed.length === 0, message: msg });
      }

      if (!old_text || !new_text) return res.status(400).json({ success: false, message: '缺少 old_text 或 new_text' });
      const response = await fetch(`${AGENT_SERVER_URL}/word/replace-in-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_text, new_text }),
      });
      const data = await response.json();
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ success: false, message: String(error) });
    }
  });

  app.post('/word/insert-at-cursor', async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ success: false, message: '缺少 text' });
      const response = await fetch(`${AGENT_SERVER_URL}/word/insert-at-cursor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ success: false, message: String(error) });
    }
  });

  app.get('/word/word-count', async (_req, res) => {
    try {
      const result = await callRendererTool(mainWindow, 'get-word-count');
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ success: false, count: 0, message: String(error) });
    }
  });

  app.post('/word/set-font', async (req, res) => {
    try {
      const { font_name, font_size, bold, italic, underline, strikethrough, font_color, ranges } = req.body;

      const applyColorViaCom = async () => {
        if (!font_color) return;
        await fetch(`${AGENT_SERVER_URL}/word/set-selection-char-format`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ font_color }),
        });
      };

      if (ranges && Array.isArray(ranges) && ranges.length > 0) {
        const applied: string[] = [];
        const failed: string[] = [];

        for (const range of ranges) {
          try {
            const selectRes = await fetch(`${AGENT_SERVER_URL}/word/select-range`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ start: range.start, end: range.end }),
            });
            const selectData = await selectRes.json();
            if (!selectData.success) {
              failed.push(`${range.start}~${range.end}`);
              continue;
            }

            let current_bold: boolean | undefined;
            let current_italic: boolean | undefined;
            if (bold !== undefined || italic !== undefined) {
              const fmtRes = await fetch(`${AGENT_SERVER_URL}/word/get-selection-format`);
              const fmtData = await fmtRes.json();
              if (fmtData.success) {
                current_bold = fmtData.bold;
                current_italic = fmtData.italic;
              }
            }

            const result = await callRendererTool(mainWindow, 'apply-venom-format', {
              font_name, font_size, bold, italic, underline, strikethrough, current_bold, current_italic,
            });
            await applyColorViaCom();

            if (result.success) {
              applied.push(`${range.start}~${range.end}`);
            } else {
              failed.push(`${range.start}~${range.end}`);
            }
          } catch (e) {
            failed.push(`${range.start}~${range.end}`);
          }
        }

        const msg = `已套用 ${applied.length} 處${failed.length ? `，失敗 ${failed.length} 處` : ''}`;
        return res.json({ success: failed.length === 0, message: msg });
      }

      let current_bold: boolean | undefined;
      let current_italic: boolean | undefined;
      if (bold !== undefined || italic !== undefined) {
        const fmtRes = await fetch(`${AGENT_SERVER_URL}/word/get-selection-format`);
        const fmtData = await fmtRes.json();
        if (fmtData.success) {
          current_bold = fmtData.bold;
          current_italic = fmtData.italic;
        }
      }

      const result = await callRendererTool(mainWindow, 'apply-venom-format', {
        font_name, font_size, bold, italic, underline, strikethrough, current_bold, current_italic,
      });
      await applyColorViaCom();

      return res.json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: String(error) });
    }
  });

  app.post('/word/toggle-bold', async (_req, res) => {
    try {
      const result = await callRendererTool(mainWindow, 'toggle-bold');
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ success: false, message: String(error) });
    }
  });

  app.get('/word/get-document-structure', async (_req, res) => {
    try {
      const response = await fetch(`${AGENT_SERVER_URL}/word/get-document-structure`);
      const data = await response.json();
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ success: false, message: String(error) });
    }
  });

  app.get('/word/list-styles', async (_req, res) => {
    try {
      const response = await fetch(`${AGENT_SERVER_URL}/word/list-styles`);
      const data = await response.json();
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ success: false, message: String(error) });
    }
  });

  app.post('/word/apply-paragraph-styles', async (req, res) => {
    try {
      const { changes } = req.body;
      if (!changes) return res.status(400).json({ success: false, message: '缺少 changes' });
      const response = await fetch(`${AGENT_SERVER_URL}/word/apply-paragraph-styles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes }),
      });
      const data = await response.json();
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ success: false, message: String(error) });
    }
  });

  app.post('/word/modify-style', async (req, res) => {
    try {
      const response = await fetch(`${AGENT_SERVER_URL}/word/modify-style`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      const data = await response.json();
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ success: false, message: String(error) });
    }
  });

  app.get('/word/search-text', async (req, res) => {
    try {
      const { keyword, match_case, match_whole_word, within_selection } = req.query;
      if (!keyword) return res.status(400).json({ success: false, message: '缺少 keyword', results: [] });
      const params = new URLSearchParams({ keyword: String(keyword) });
      if (match_case) params.append('match_case', String(match_case));
      if (match_whole_word) params.append('match_whole_word', String(match_whole_word));
      if (within_selection) params.append('within_selection', String(within_selection));
      const response = await fetch(`${AGENT_SERVER_URL}/word/search-text?${params}`);
      const data = await response.json();
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ success: false, message: String(error), results: [] });
    }
  });

  app.post('/word/select-range', async (req, res) => {
    try {
      const { start, end } = req.body;
      if (start === undefined || end === undefined) return res.status(400).json({ success: false, message: '缺少 start 或 end' });
      const response = await fetch(`${AGENT_SERVER_URL}/word/select-range`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start, end }),
      });
      const data = await response.json();
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ success: false, message: String(error) });
    }
  });

  app.post('/word/set-paragraph-format', async (req, res) => {
    try {
      const response = await fetch(`${AGENT_SERVER_URL}/word/set-paragraph-format`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
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