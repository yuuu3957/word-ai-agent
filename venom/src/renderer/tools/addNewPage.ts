import addBlankPageDescriptor from '../../../descriptor/new blank document.json';
import { getSubscribedHost } from '../Hom';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const addNewPage = async () => {
    try {
        console.log('[addNewPage] add Blank document');

        const host = await getSubscribedHost();
        console.log('[addNewPage] host 取得成功');

        const subscribedElements = await host.getElementsByDescriptor(addBlankPageDescriptor);
        console.log('[addNewPage] descriptor 查詢結果:', subscribedElements);

        const addPageButton =
            subscribedElements?.item?.(0) ??
            subscribedElements?.getHomElements?.()?.[0];

        if (!addPageButton) {
            console.log('[addNewPage] 找不到空白文件按鈕');
            return;
        }

        console.log('[addNewPage] 找到元素:', addPageButton);
        console.log('[addNewPage] 可用方法:', Object.keys(addPageButton));

        if (typeof addPageButton.invoke === 'function') {
            console.log('[addNewPage] invoke');
            await addPageButton.invoke();
            console.log('[addNewPage] invoke 完成');
            return;
        }

    } catch (error) {
        console.error('[addNewPage] error:', error);
    }
};