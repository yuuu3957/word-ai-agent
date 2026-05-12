import type { DebuggerLog, DebuggerLogType } from './types';
import { debuggerStyles, STYLE_ID } from './styles';
import {
  createToastElement,
  applyContainerStyles,
  createToastContainer,
  createBoundingBoxElement,
} from './template';
import type { BoundingBox } from '@ar-project/host-object-model';

/**
 * Singleton class for the Debugger Panel
 * Handles log display and bounding box visualization
 */
class DebuggerPanel {
  private static instance: DebuggerPanel;
  private containerElement: HTMLElement | null = null;
  private toastContainer: HTMLElement | null = null;
  private logQueue: DebuggerLog[] = [];
  private maxLogs: number = 10;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.initialize();
  }

  /**
   * Initializes the debugger panel UI
   */
  private initialize() {
    // Create main container (full window size)
    const container = document.createElement('div');
    container.id = 'venom-debugger';
    applyContainerStyles(container);
    document.body.appendChild(container);
    this.containerElement = container;

    // Create toast container (bottom-right)
    const toasts = createToastContainer();
    container.appendChild(toasts);
    this.toastContainer = toasts;

    // Inject CSS styles
    this.injectStyles();
  }

  /**
   * Injects necessary CSS styles into the document
   * @returns void
   */
  private injectStyles() {
    // Avoid duplicate style injection
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = debuggerStyles;
    document.head.appendChild(style);
  }

  /**
   * Dismisses a toast log
   * @param logId ID of the log to dismiss
   */
  public dismissToast = (logId: string) => {
    const toast = this.toastContainer?.querySelector(
      `[data-log-id="${logId}"]`,
    );
    if (toast) {
      toast.classList.add('removing');
      setTimeout(() => {
        toast.remove();
        this.logQueue = this.logQueue.filter((log) => log.id !== logId);
      }, 300);
    }
  };

  /**
   * Gets the singleton instance of the DebuggerPanel
   * @returns DebuggerPanel instance
   */
  public static getInstance(): DebuggerPanel {
    if (!DebuggerPanel.instance) {
      DebuggerPanel.instance = new DebuggerPanel();
    }

    return DebuggerPanel.instance;
  }

  /**
   * Logs an event with data and type
   * @param source Event source
   * @param event Event name
   * @param data Event data
   * @param type Log type (info, success, warning, error)
   * @returns Log ID
   */
  public log(
    source: string,
    event: string,
    data: any,
    type: DebuggerLogType = 'info',
  ) {
    if (!this.toastContainer) return;

    const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const logObj: DebuggerLog = {
      id: logId,
      source,
      event,
      data,
      timestamp: new Date(),
      type,
    };

    this.logQueue.push(logObj);

    // Remove old logs if exceeding max
    if (this.logQueue.length > this.maxLogs) {
      const oldEntry = this.logQueue.shift();
      if (oldEntry) {
        this.dismissToast(oldEntry.id);
      }
    }

    // Create and append toast
    const toast = createToastElement(logObj, this.dismissToast);
    this.toastContainer.appendChild(toast);

    // Auto dismiss after 3 seconds
    setTimeout(() => {
      this.dismissToast(logObj.id);
    }, 3000);

    // log on console
    const consoleMethod =
      type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'log';
    console[consoleMethod](`[Debugger]${event}:`, data);

    return logObj.id;
  }

  // Convenience methods for different log types

  /**
   * Logs an info event
   * @param source Event source
   * @param event Event name
   * @param data Event data
   * @return Log ID
   */
  public info(source: string, event: string, data: any) {
    return this.log(source, event, data, 'info');
  }

  /**
   * Logs a success event
   * @param source Event source
   * @param event Event name
   * @param data Event data
   * @returns Log ID
   */
  public success(source: string, event: string, data: any) {
    return this.log(source, event, data, 'success');
  }

  /**
   * Logs a warning event
   * @param source Event source
   * @param event Event name
   * @param data Event data
   * @returns Log ID
   */
  public warning(source: string, event: string, data: any) {
    return this.log(source, event, data, 'warning');
  }

  /**
   * Logs an error event
   * @param source Event source
   * @param event Event name
   * @param data Event data
   * @returns Log ID
   */
  public error(source: string, event: string, data: any) {
    return this.log(source, event, data, 'error');
  }

  /**
   * Clears all logs from the debugger panel
   */
  public clear() {
    if (this.toastContainer) {
      this.toastContainer.innerHTML = '';
      this.logQueue = [];
    }
  }

  /**
   * Logs a bounding box change by visualizing it on screen
   * @param hostName Name of the host
   * @param boundingBox Bounding box data
   * @param timeout Duration to display the bounding box (default 1000ms)
   */
  public logBoundingBoxChange(
    hostName: string,
    boundingBox: BoundingBox,
    timeout: number = 1000,
  ) {
    if (!this.containerElement) return;

    // Create bounding box visualization
    const boxElement = createBoundingBoxElement(hostName, boundingBox);
    this.containerElement.appendChild(boxElement);

    // Remove after timeout
    setTimeout(() => {
      boxElement.remove();
    }, timeout);
  }
}

export default DebuggerPanel;
