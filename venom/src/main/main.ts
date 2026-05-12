/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import { app, shell, screen, ipcMain } from 'electron';
import { MainProcess } from './MainProcess';
import { MAINWINDOW_MESSAGES } from '../shared/ipcMessages';
import { startBridge } from './bridge';

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

app
  .whenReady()
  .then(() => {
    const mainProcess = new MainProcess(
      screen.getPrimaryDisplay().workArea.width,
      screen.getPrimaryDisplay().workArea.height,
    );
    
    const mainWindow = mainProcess.getMainWindow();
    if (mainWindow) {
      startBridge(mainWindow);
    } else {
      console.log('[Bridge] mainWindow is null, bridge not started');
    }

    ipcMain.handle(
      MAINWINDOW_MESSAGES.GET_BROWSER_WINDOWHWND_HANDLE,
      async () => {
        console.log('[Get BrowserWindow HWND] catched by ipcMain');
        const mainWindow = mainProcess.getMainWindow();
        let hwnd: number;
        if (mainWindow) {
          hwnd = parseInt(
            mainWindow.getNativeWindowHandle().reverse().toString('hex'),
            16,
          );
        } else {
          console.log('[Get BrowserWindow HWND] mainWindow is null');
          hwnd = 0;
        }
        return hwnd;
      },
    );

    ipcMain.on(MAINWINDOW_MESSAGES.ENTER_BUTTON, () => {
      mainProcess.enterButton();
    });

    ipcMain.on(MAINWINDOW_MESSAGES.LEAVE_BUTTON, () => {
      mainProcess.leaveButton();
    });

    ipcMain.on(MAINWINDOW_MESSAGES.OPEN_EXTERNAL_LINK, (event, url) => {
      console.log('[Open External Link] catched by ipcMain');
      shell.openExternal(url);
    });

    ipcMain.on('close-window', async () => {
      console.log('[Close window] catched by ipcMain');
      mainProcess.getMainWindow()?.webContents.send('close');
      mainProcess.getMainWindow()?.close();
      app.quit();
    });
  })
  .catch(console.log);

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
