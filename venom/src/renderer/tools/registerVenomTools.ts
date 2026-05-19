import { clickFileTab } from './clickFileTab';
import { getSelectedText, refreshSelectedTextCache, getDocumentText, replaceSelectedText, clearSelectedTextCache } from './wordTextTools';

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

      if (toolName === 'open-file-menu') {
        result = await clickFileTab();
      }

      else if (toolName === 'get-selected-text') {
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