import { getSelectedText, refreshSelectedTextCache, getDocumentText, clearSelectedTextCache, getWordCount, toggleBold, applyVenomFormat, ApplyFormatPayload } from './wordTextTools';

export function registerVenomTools() {
  console.log('[registerVenomTools] register start');

  if (!window.venomToolBridge) {
    console.error('[registerVenomTools] window.venomToolBridge 不存在');
    return;
  }

  window.venomToolBridge.onRunTool(async ({ requestId, toolName, payload }) => {
    console.log('[Renderer] received tool:', toolName, payload);

    try {
      let result;

      if (toolName === 'get-selected-text') {
        result = await getSelectedText();
      }

      else if (toolName === 'refresh-selected-text-cache') {
        result = await refreshSelectedTextCache();
      }

      else if (toolName === 'get-document-text') {
        result = await getDocumentText();
      }

      else if (toolName === 'clear-selection-cache') {
        result = clearSelectedTextCache();
      }

      else if (toolName === 'get-word-count') {
        result = await getWordCount();
      }

      else if (toolName === 'toggle-bold') {
        result = await toggleBold();
      }

      else if (toolName === 'apply-venom-format') {
        result = await applyVenomFormat(payload as ApplyFormatPayload);
      }

      else {
        result = {
          success: false,
          message: `未知的 renderer tool：${toolName}`,
        };
      }

      window.venomToolBridge.sendToolResult(requestId, result);
    } catch (error) {
      window.venomToolBridge.sendToolResult(requestId, {
        success: false,
        message: `Renderer tool 執行失敗：${String(error)}`,
      });
    }
  });
}