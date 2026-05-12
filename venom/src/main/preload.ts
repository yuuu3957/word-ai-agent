// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer } from 'electron';
import { myAPI } from './libs/myApi';
import { API } from './libs/api';
import { apiKey, myApiKey } from '../shared/contextBridgeKeys';

contextBridge.exposeInMainWorld(apiKey, API);
contextBridge.exposeInMainWorld(myApiKey, myAPI);

contextBridge.exposeInMainWorld('venomToolBridge', {
  onRunTool: (callback: (data: any) => void) => {
    ipcRenderer.on('venom-tool-run', (_event, data) => {
      callback(data);
    });
  },

  sendToolResult: (requestId: string, result: any) => {
    ipcRenderer.send(`venom-tool-result:${requestId}`, result);
  },
});