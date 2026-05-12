import { createRoot } from 'react-dom/client';
import { App } from './App';
import { getVenom, getSubscribedHost } from './Hom';
import { MAINWINDOW_MESSAGES } from '../shared/ipcMessages';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(<App />);

window.api.ipc.Receive(MAINWINDOW_MESSAGES.START, async () => {
  // eslint-disable-next-line no-console
  console.log('[Renderer Process] -----start-----');

  // do something...
  const venom = await getVenom();
  // eslint-disable-next-line no-console
  console.log('[Renderer Process] venom:', venom);
  const subscribedHost = await getSubscribedHost();
  // eslint-disable-next-line no-console
  console.log(
    '[Renderer Process] subscribedHost.boundingBox:',
    subscribedHost?.boundingBox,
  );

  // eslint-disable-next-line no-console
  console.log('[Renderer Process] -----end-----');
});
