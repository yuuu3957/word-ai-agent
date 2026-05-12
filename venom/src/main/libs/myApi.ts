import { ipcRenderer } from 'electron';
import { MAINWINDOW_MESSAGES } from '../../shared/ipcMessages';

const myMethod = {
  helloWorld: () => {
    return 'Hello World!';
  },
  openExternalLink: (url: string) => {
    ipcRenderer.send(MAINWINDOW_MESSAGES.OPEN_EXTERNAL_LINK, url);
  },
};

export const myAPI = {
  myMethod,
};

export type MyApiType = typeof myAPI;
