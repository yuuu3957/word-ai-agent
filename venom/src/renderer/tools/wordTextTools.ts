import textAreaDescriptor from '../../../descriptor/textArea.json';
import { getSubscribedHost } from '../Hom';

export type GetSelectedTextResult = {
  success: boolean;
  selected_text: string;
  message: string;
  source: 'live' | 'cache' | 'none';
};

export type getDocumentTextResult = {
  success: boolean;
  text: string;
  message: string;
}

let cachedSelectedText = '';
let cachedSelectedTextAt = 0;

async function readSelectedTextFromWord(): Promise<string> {
  const host = await getSubscribedHost();
  const subscribedElements = await host.getElementsByDescriptor(textAreaDescriptor);

  const target =
    subscribedElements?.item?.(0) ??
    subscribedElements?.getHomElements?.()?.[0];

  if (!target) {
    console.log('[readSelectedTextFromWord] 找不到 Word 文字區域');
    return '';
  }

  console.log('[readSelectedTextFromWord] target:', target);
  console.log('[readSelectedTextFromWord] typeof getSelectedText:', typeof target.getSelectedText);

  const selectedText = await target.getSelectedText?.();

  return selectedText ?? '';
}

export async function refreshSelectedTextCache(): Promise<GetSelectedTextResult> {
  try {
    console.log('[refreshSelectedTextCache] start');

    const selectedText = await readSelectedTextFromWord();

    if (!selectedText || selectedText.trim().length === 0) {
      console.log('[refreshSelectedTextCache] no selected text');

      return {
        success: false,
        selected_text: cachedSelectedText,
        message: '目前沒有新的選取文字，保留舊的快取',
        source: cachedSelectedText ? 'cache' : 'none',
      };
    }

    cachedSelectedText = selectedText;
    cachedSelectedTextAt = Date.now();

    console.log('[refreshSelectedTextCache] cached:', cachedSelectedText);

    return {
      success: true,
      selected_text: cachedSelectedText,
      message: '選取文字已快取',
      source: 'live',
    };
  } catch (error) {
    console.error('[refreshSelectedTextCache] error:', error);

    return {
      success: false,
      selected_text: cachedSelectedText,
      message: String(error),
      source: cachedSelectedText ? 'cache' : 'none',
    };
  }
}

export async function getSelectedText(): Promise<GetSelectedTextResult> {
  try {
    console.log('[getSelectedText] start');

    const selectedText = await readSelectedTextFromWord();

    if (selectedText && selectedText.trim().length > 0) {
      cachedSelectedText = selectedText;
      cachedSelectedTextAt = Date.now();

      return {
        success: true,
        selected_text: selectedText,
        message: 'OK',
        source: 'live',
      };
    }

    if (cachedSelectedText && cachedSelectedText.trim().length > 0) {
      return {
        success: true,
        selected_text: cachedSelectedText,
        message: `OK from cache at ${new Date(cachedSelectedTextAt).toLocaleTimeString()}`,
        source: 'cache',
      };
    }

    return {
      success: false,
      selected_text: '',
      message: '目前沒有選取文字',
      source: 'none',
    };
  } catch (error) {
    console.error('[getSelectedText] error:', error);

    if (cachedSelectedText && cachedSelectedText.trim().length > 0) {
      return {
        success: true,
        selected_text: cachedSelectedText,
        message: 'OK from cache after live read failed',
        source: 'cache',
      };
    }

    return {
      success: false,
      selected_text: '',
      message: String(error),
      source: 'none',
    };
  }
}

export async function replaceSelectedText(newText: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!cachedSelectedText) {
      return { success: false, message: '沒有快取的選取文字，請先選取文字' };
    }

    const host = await getSubscribedHost();
    const subscribedElements = await host.getElementsByDescriptor(textAreaDescriptor);
    const target =
      subscribedElements?.item?.(0) ??
      subscribedElements?.getHomElements?.()?.[0];

    if (!target) {
      return { success: false, message: '找不到 Word 文字區域' };
    }

    const fullText = await target.getDocumentText?.() ?? '';
    const occurrences = fullText.split(cachedSelectedText).length - 1;

    if (occurrences === 0) {
      return { success: false, message: `找不到選取的文字：${cachedSelectedText}` };
    }

    if (occurrences > 1) {
      return { success: false, message: `文件中有 ${occurrences} 處相同文字，請選取更獨特的片段` };
    }

    const newFullText = fullText.replace(cachedSelectedText, newText);
    const setResult = await target.setValue?.(newFullText);
    console.log('[replaceSelectedText] setValue result:', setResult);

    // 驗證：替換後重新讀取，確認內容有更新
    const verifyText = await target.getDocumentText?.() ?? '';
    if (!verifyText.includes(newText)) {
      return { success: false, message: 'setValue 未實際修改 Word 內容，此元素可能不支援寫入' };
    }

    cachedSelectedText = '';
    return { success: true, message: '替換成功' };
  } catch (error) {
    return { success: false, message: String(error) };
  }
}

export async function getDocumentText(): Promise<getDocumentTextResult> {
  try {
    const host = await getSubscribedHost();
    const subscribedElements = await host.getElementsByDescriptor(textAreaDescriptor);

    const target =
      subscribedElements?.item?.(0) ??
      subscribedElements?.getHomElements?.()?.[0];

    if (!target) {
      return { success: false, text: '', message: '找不到 Word 文字區域' };
    }

    // 印出 target 所有可用方法
    console.log('[TextArea methods]', Object.getOwnPropertyNames(Object.getPrototypeOf(target)));
    const text = await target.getDocumentText?.();

    return { success: true, text: text ?? '', message: 'OK' };
  } catch (error) {
    return { success: false, text: '', message: String(error) };
  }
}