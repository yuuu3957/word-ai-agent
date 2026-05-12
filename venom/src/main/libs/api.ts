// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { ipcRenderer } from 'electron';
import { MAINWINDOW_MESSAGES } from '../../shared/ipcMessages';

const ipc = {
  Send: (channel: string, ...args: any[]): void => {
    ipcRenderer.send(channel, ...args);
  },
  Receive: (channel: string, func: (...args: any[]) => void): void => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
};

const button = {
  EnterButton: (): void => ipcRenderer.send(MAINWINDOW_MESSAGES.ENTER_BUTTON),
  OutButton: (): void => ipcRenderer.send(MAINWINDOW_MESSAGES.LEAVE_BUTTON),
};

const event = {
  GetBrowserHwnd: async (): Promise<number> => {
    const hwnd = await ipcRenderer.invoke(
      MAINWINDOW_MESSAGES.GET_BROWSER_WINDOWHWND_HANDLE,
    );
    return hwnd;
  },
  CloseWindow: (): void => ipcRenderer.send('close-window'),
  OpenDevtools: (): void => ipcRenderer.send('open-devtools'),
};

export const API = {
  ipc,
  event,
  button,
};

export type APIType = typeof API;
