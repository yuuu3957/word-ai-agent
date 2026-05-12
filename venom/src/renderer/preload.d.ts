import { API } from '../main/libs/api';
import { myAPI } from '../main/libs/myApi';
import { apiKey, myApiKey } from '../shared/contextBridgeKeys';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    [apiKey]: typeof API;
    [myApiKey]: typeof myAPI;
  }
}

export {};
