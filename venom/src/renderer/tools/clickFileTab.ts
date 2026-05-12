import fileTabDescriptor from '../../../descriptor/fileTab.json';
import { getSubscribedHost } from '../Hom';

type ToolResult = {
  success: boolean;
  message: string;
};

export async function clickFileTab(): Promise<ToolResult> {
  try {
    console.log('[clickFileTab] start');

    const host = await getSubscribedHost();

    if (!host) {
      return {
        success: false,
        message: '找不到目前訂閱的 Word host',
      };
    }

    const elements = await host.getElementsByDescriptor(fileTabDescriptor);

      const target =
          elements?.item?.(0) ??
          elements?.getHomElements?.()?.[0];

    if (!target) {
      return {
        success: false,
        message: '找不到 Word 的「檔案」按鈕，請確認 descriptor 是否正確',
      };
    }

    console.log('[clickFileTab] target:', target);
    console.log('[clickFileTab] keys:', Object.keys(target));

    try {
      console.log(
        '[clickFileTab] prototype methods:',
        Object.getOwnPropertyNames(Object.getPrototypeOf(target))
      );
    } catch {
      console.log('[clickFileTab] 無法列出 prototype methods');
    }

    await target.invoke();

    return {
      success: true,
      message: '已點擊 Word 的「檔案」按鈕',
    };
  } catch (error) {
    console.error('[clickFileTab] error:', error);

    return {
      success: false,
      message: `點擊 Word「檔案」按鈕失敗：${String(error)}`,
    };
  }
}