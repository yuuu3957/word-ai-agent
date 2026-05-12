import { app, BrowserWindow } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { resolveHtmlPath, resolveAssetPath } from './util';
import { MAINWINDOW_MESSAGES } from '../shared/ipcMessages';

export class MainProcess {
  private childWindows: Map<string, BrowserWindow>;

  private mainWindow: BrowserWindow | undefined;

  private isDebug: boolean;

  constructor(width: number, height: number) {
    this.childWindows = new Map();

    this.isDebug =
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true';

    this.createMainWindow(width, height); // create Main window

    this.mainWindow?.webContents.on('did-finish-load', () => {
      this.mainWindow?.show();
      this.mainWindow?.webContents.send(MAINWINDOW_MESSAGES.START);
    });
  }

  private installExtensions = async () => {
    if (this.isDebug) {
      import('electron-debug')
        .then((debug) => debug.default())
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error('Failed to load electron-debug:', err);
        });
    }

    const installer = await import('electron-devtools-installer');
    const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
    const extensions: Array<keyof typeof installer> = ['REACT_DEVELOPER_TOOLS'];

    // eslint-disable-next-line no-console
    return installer.default(extensions, forceDownload).catch(console.log);
  };

  public getMainWindow = (): BrowserWindow | undefined => {
    return this.mainWindow;
  };

  public getChildWindow = (id: string): BrowserWindow | undefined => {
    return this.childWindows.get(id);
  };

  private createMainWindow = (width: number, height: number): void => {
    if (this.isDebug) {
      this.installExtensions();
    }

    this.mainWindow = new BrowserWindow({
      autoHideMenuBar: true, // MenuBar
      transparent: true, // transparent
      frame: false, // window frame
      icon: resolveAssetPath('icon.png'),
      webPreferences: {
        sandbox: false, // 如果啟用，它將限制網頁內容的訪問權限
        nodeIntegration: false, // 用於啟用或禁用 Node.js 集成
        contextIsolation: true, // 啟用後，網頁內容將運行在單獨的隔離上下文中。
        preload: app.isPackaged
          ? path.join(__dirname, 'preload.js')
          : path.join(__dirname, '../../.erb/dll/preload.js'),
      },
      show: false,
    });
    this.mainWindow.loadURL(resolveHtmlPath('index.html', '/'));
    this.mainWindow.setAlwaysOnTop(true, 'screen-saver'); // always on desktop's top, above all normal/fullscreen windows
    this.mainWindow.setPosition(0, 0);
    this.mainWindow.setSize(width, height);
    this.mainWindow.setIgnoreMouseEvents(true, { forward: true }); // 滑鼠不能操控

    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.webContents.openDevTools({
        mode: 'detach',
      });
    }
  };

  private createChildWindow(
    route: string,
    width?: number,
    height?: number,
  ): string {
    const id = uuidv4();
    const childWindow = new BrowserWindow({
      width,
      height,
      autoHideMenuBar: true,
      resizable: false, // window resize llimit
      webPreferences: {
        sandbox: false, // 如果啟用，它將限制網頁內容的訪問權限
        nodeIntegration: false, // 用於啟用或禁用 Node.js 集成
        contextIsolation: true, // 啟用後，網頁內容將運行在單獨的隔離上下文中。
        preload: app.isPackaged
          ? path.join(__dirname, 'preload.js')
          : path.join(__dirname, '../../.erb/dll/preload.js'),
      },
    });
    childWindow.loadURL(resolveHtmlPath('index.html', route)); // absolute path
    this.childWindows.set(id, childWindow);

    if (process.env.NODE_ENV === 'development') {
      childWindow.webContents.openDevTools({
        mode: 'detach',
      });
    }

    return id;
  }

  public enterButton(): void {
    // console.log('[Hover Button] catched by ipcMain')
    this.mainWindow?.setIgnoreMouseEvents(false);
    this.mainWindow?.focus();
  }

  public leaveButton(): void {
    // console.log('[Out Button] catched by ipcMain')
    this.mainWindow?.setIgnoreMouseEvents(true, { forward: true });
    this.mainWindow?.blur();
  }

  public openChildWindow(
    route: string,
    width?: number,
    height?: number,
  ): string {
    // eslint-disable-next-line no-console
    console.log(`[Open Dialog ${route}] catched by ipcMain`);

    const childWindowId = this.createChildWindow(route, width, height);

    // eslint-disable-next-line no-console
    console.log(`You already Open childWindow id: ${childWindowId}`);

    return childWindowId;
  }

  public closeChildWindow(id: string): void {
    // eslint-disable-next-line no-console
    console.log(`[Close childWindow ${id}] catched by ipcMain`);
    const childWindow = this.childWindows.get(id);
    if (childWindow && !childWindow.isDestroyed()) {
      childWindow.close();
      this.childWindows.delete(id);
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        `Window with id ${id} does not exist or is already destroyed.`,
      );
    }
  }
}

export default MainProcess;
