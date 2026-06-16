import textAreaDescriptor from '../../../descriptor/textArea.json';
import wordCountDescriptor from '../../../descriptor/wordCount.json';
import boldDescriptor from '../../../descriptor/Bold.json';
import italicDescriptor from '../../../descriptor/Italic.json';
import fontDescriptor from '../../../descriptor/Font.json';
import fontSizeDescriptor from '../../../descriptor/FontSize.json';
import underlineDescriptor from '../../../descriptor/Underline.json';
import strikethroughDescriptor from '../../../descriptor/Strikethrough.json';
import { getSubscribedHost, getVenom } from '../Hom';
import { KeyCode } from '@ar-project/host-object-model';

export type ApplyFormatPayload = {
  font_name?: string;
  font_size?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  current_bold?: boolean;
  current_italic?: boolean;
};

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

  const raw =
    subscribedElements?.item?.(0) ??
    subscribedElements?.getHomElements?.()?.[0];

  const target = (raw && typeof raw === 'object') ? raw : null;

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

export function clearSelectedTextCache(): { success: boolean; message: string } {
  cachedSelectedText = '';
  cachedSelectedTextAt = 0;
  return { success: true, message: '選取快取已清除' };
}

export async function getDocumentText(): Promise<getDocumentTextResult> {
  try {
    const host = await getSubscribedHost();
    const subscribedElements = await host.getElementsByDescriptor(textAreaDescriptor);

    const raw =
      subscribedElements?.item?.(0) ??
      subscribedElements?.getHomElements?.()?.[0];

    const target = (raw && typeof raw === 'object') ? raw : null;

    if (!target) {
      return { success: false, text: '', message: '找不到 Word 文字區域' };
    }

    console.log('[TextArea methods]', Object.getOwnPropertyNames(Object.getPrototypeOf(target)));
    const text = await target.getDocumentText?.();

    return { success: true, text: text ?? '', message: 'OK' };
  } catch (error) {
    return { success: false, text: '', message: String(error) };
  }
}

export async function applyVenomFormat(rules: ApplyFormatPayload): Promise<{ success: boolean; message: string }> {
  const applied: string[] = [];
  const failed: string[] = [];

  try {
    const host = await getSubscribedHost();
    const venomInstance = await getVenom();

    if (rules.font_name) {
      try {
        const els = await host.getElementsByDescriptor(fontDescriptor);
        const t = els?.item?.(0) ?? els?.getHomElements?.()?.[0];
        if (t && typeof t.setValue === 'function') {
          await t.setValue(rules.font_name);
          await (t as any).focus?.();
          await venomInstance.key(KeyCode.Enter);
          applied.push(`字型=${rules.font_name}`);
        } else {
          failed.push('字型：找不到 setValue');
        }
      } catch (e) { failed.push(`字型：${e}`); }
    }

    if (rules.font_size !== undefined) {
      try {
        const els = await host.getElementsByDescriptor(fontSizeDescriptor);
        const t = els?.item?.(0) ?? els?.getHomElements?.()?.[0];
        if (t && typeof t.setValue === 'function') {
          await t.setValue(String(rules.font_size));
          await (t as any).focus?.();
          await venomInstance.key(KeyCode.Enter);
          applied.push(`字級=${rules.font_size}`);
        } else {
          failed.push('字級：找不到 setValue');
        }
      } catch (e) { failed.push(`字級：${e}`); }
    }

    if (rules.bold !== undefined) {
      try {
        const els = await host.getElementsByDescriptor(boldDescriptor);
        const t = els?.item?.(0) ?? els?.getHomElements?.()?.[0];
        if (t && typeof t.toggle === 'function') {
          if (rules.current_bold !== rules.bold) {
            await t.toggle();
          }
          applied.push(`粗體=${rules.bold}`);
        } else {
          failed.push('粗體：找不到 toggle');
        }
      } catch (e) { failed.push(`粗體：${e}`); }
    }

    if (rules.italic !== undefined) {
      try {
        const els = await host.getElementsByDescriptor(italicDescriptor);
        const t = els?.item?.(0) ?? els?.getHomElements?.()?.[0];
        if (t && typeof t.toggle === 'function') {
          if (rules.current_italic !== rules.italic) {
            await t.toggle();
          }
          applied.push(`斜體=${rules.italic}`);
        } else {
          failed.push('斜體：找不到 toggle');
        }
      } catch (e) { failed.push(`斜體：${e}`); }
    }

    if (rules.underline !== undefined) {
      try {
        const els = await host.getElementsByDescriptor(underlineDescriptor);
        const t = els?.item?.(0) ?? els?.getHomElements?.()?.[0];
        if (t && typeof (t as any).toggle === 'function') {
          await (t as any).toggle();
          applied.push(`底線=${rules.underline}`);
        } else {
          failed.push('底線：找不到 toggle');
        }
      } catch (e) { failed.push(`底線：${e}`); }
    }

    if (rules.strikethrough !== undefined) {
      try {
        const els = await host.getElementsByDescriptor(strikethroughDescriptor);
        const t = els?.item?.(0) ?? els?.getHomElements?.()?.[0];
        if (t && typeof (t as any).toggle === 'function') {
          await (t as any).toggle();
          applied.push(`刪除線=${rules.strikethrough}`);
        } else {
          failed.push('刪除線：找不到 toggle');
        }
      } catch (e) { failed.push(`刪除線：${e}`); }
    }
  } catch (e) {
    return { success: false, message: `applyVenomFormat 失敗：${e}` };
  }

  const msg = applied.length ? `套用：${applied.join('、')}` : '無變更';
  return {
    success: failed.length === 0,
    message: failed.length ? `${msg}　失敗：${failed.join('、')}` : msg,
  };
}

export async function toggleBold(): Promise<{ success: boolean; message: string }> {
  try {
    const host = await getSubscribedHost();
    const elements = await host.getElementsByDescriptor(boldDescriptor);

    const target =
      elements?.item?.(0) ??
      elements?.getHomElements?.()?.[0];

    if (!target) {
      return { success: false, message: '找不到粗體按鈕' };
    }

    console.log('[toggleBold] methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(target)));
    console.log('[toggleBold] target:', target);

    if (typeof target.toggle === 'function') {
      await target.toggle();
      return { success: true, message: 'toggle() 成功' };
    }
    return { success: false, message: 'toggle/invoke 均不存在，請看 console log 確認可用方法' };
  } catch (error) {
    return { success: false, message: String(error) };
  }
}

export async function getWordCount(): Promise<{ success: boolean; count: number; message: string }> {
  try {
    const host = await getSubscribedHost();
    const elements = await host.getElementsByDescriptor(wordCountDescriptor);

    const target =
      elements?.item?.(0) ??
      elements?.getHomElements?.()?.[0];

    if (!target) {
      return { success: false, count: 0, message: '找不到字數統計元素' };
    }

    console.log('[getWordCount] methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(target)));

    const name: string = await target.name ?? '';
    console.log('[getWordCount] name:', name);

    const match = String(name).match(/\d+/);
    if (match) {
      return { success: true, count: parseInt(match[0], 10), message: 'OK' };
    }

    return { success: false, count: 0, message: `無法解析字數：${name}` };
  } catch (error) {
    return { success: false, count: 0, message: String(error) };
  }
}