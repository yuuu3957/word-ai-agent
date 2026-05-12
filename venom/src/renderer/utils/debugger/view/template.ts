import { apiKey } from '../../../../shared/contextBridgeKeys';
import { DebuggerLog } from './types';
import { BoundingBox } from '@ar-project/host-object-model';

/**
 * Icons for different log types
 */
export const LOG_ICONS = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌',
} as const;

/**
 * Creates the toast element for a log entry
 */
export function createToastElement(
  entry: DebuggerLog,
  onDismiss: (logId: string) => void,
): HTMLElement {
  const toast = document.createElement('div');
  toast.className = `venom-debug-toast ${entry.type}`;
  toast.dataset.logId = entry.id;

  // Create header section
  const header = createHeaderElement(entry);

  // Create data section
  const dataDiv = createDataElement(entry);

  // Create progress bar
  const progress = document.createElement('div');
  progress.className = 'venom-debug-progress';

  // Append all sections
  toast.appendChild(header);
  toast.appendChild(dataDiv);
  toast.appendChild(progress);

  // Click to dismiss
  toast.addEventListener('click', () => {
    onDismiss(entry.id);
  });

  return toast;
}

/**
 * Creates the header element with icon, event name, and timestamp
 */
function createHeaderElement(entry: DebuggerLog): HTMLElement {
  const header = document.createElement('div');
  header.className = 'venom-debug-header';

  const eventSection = document.createElement('div');
  eventSection.className = 'venom-debug-event';

  const icon = document.createElement('span');
  icon.className = 'venom-debug-icon';
  icon.textContent = LOG_ICONS[entry.type];

  const eventName = document.createElement('span');
  eventName.textContent = entry.source;

  // eventSection.appendChild(icon);
  eventSection.appendChild(eventName);

  const timestamp = document.createElement('span');
  timestamp.className = 'venom-debug-timestamp';
  timestamp.textContent = formatTimestamp(entry.timestamp);

  header.appendChild(eventSection);
  header.appendChild(timestamp);

  return header;
}

/**
 * Creates the data display element
 */
function createDataElement(entry: DebuggerLog): HTMLElement {
  const dataDiv = document.createElement('div');
  dataDiv.className = 'venom-debug-data';

  const pre = document.createElement('pre');
  pre.style.margin = '0';
  pre.style.fontFamily = 'inherit';
  pre.style.fontSize = 'inherit';
  pre.textContent = formatData(entry);

  dataDiv.appendChild(pre);
  return dataDiv;
}

/**
 * Formats timestamp for display
 */
export function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Formats data for display
 */
export function formatData(entry: DebuggerLog): string {
  const hidedProperties = [
    'key',
    'id',
    'backendClient',
    'callbackMap',
    'propertyRequestStrategy',
    'subscriptionId',
    'hostDescriptor',
  ];

  const eventAttributesMap: Record<string, string[]> = {
    onBoundingBoxChanged: ['boundingBox'],
    onElementIsSelectedChanged: ['isSelected'],
    onElementToggleStateChanged: ['toggleState'],
    onNameChanged: ['name'],
    // "onTextChanged": ["*"],
    // "onTextSelectionChanged": ["*"],
    // "onUIChanged": ["*"],
    onIsFocusChanged: ['isFocus'],
    onIsOnTopChanged: ['isOnTop'],
    // "onMoveOrResizeStart": ["*"],
    // "onMoveOrResizeEnd": ["*"],
    onStatusChanged: ['status'],
  };

  const { data } = entry;

  try {
    if (typeof data === 'string') return data;

    if (Array.isArray(data) && data.length === 1) {
      const relevantAttributes = eventAttributesMap[entry.event] || [];

      if (relevantAttributes.length > 0) {
        const filteredData: Record<string, any> = {};

        relevantAttributes.forEach((attr) => {
          if (attr === '*') {
            Object.keys(data[0]).forEach((key) => {
              if (!hidedProperties.includes(key)) {
                filteredData[key] = data[0][key];
              }
            });
          } else if (data[0].hasOwnProperty(attr)) {
            filteredData[attr] = data[0][attr];
          }
        });

        return JSON.stringify(filteredData, null, 2);
      }
    }

    return JSON.stringify(data, null, 2);
  } catch (error) {
    return String(data);
  }
}

/**
 * Creates and applies container styles
 */
export function applyContainerStyles(container: HTMLElement): void {
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100vw';
  container.style.height = '100vh';
  container.style.zIndex = '999999';
  container.style.pointerEvents = 'none';
  container.style.overflow = 'hidden';
}

/**
 * Creates and applies toast container styles (for positioning toasts in bottom-right)
 */
export function createToastContainer(): HTMLElement {
  const toastContainer = document.createElement('div');
  toastContainer.id = 'venom-debugger-toasts';
  toastContainer.style.position = 'absolute';
  toastContainer.style.bottom = '20px';
  toastContainer.style.right = '20px';
  toastContainer.style.display = 'flex';
  toastContainer.style.flexDirection = 'column';
  toastContainer.style.gap = '12px';
  toastContainer.style.maxWidth = '400px';
  toastContainer.style.pointerEvents = 'none';

  toastContainer.addEventListener('mouseenter', () => {
    window[apiKey].button.EnterButton();
  });

  toastContainer.addEventListener('mouseleave', () => {
    window[apiKey].button.OutButton();
  });

  return toastContainer;
}

/**
 * Creates a bounding box visualization element
 */
export function createBoundingBoxElement(
  hostName: string,
  boundingBox: BoundingBox,
): HTMLElement {
  const box = document.createElement('div');
  box.className = 'venom-debug-boundingbox';

  // Position and size based on bounding box
  box.style.position = 'absolute';
  box.style.left = `${boundingBox.x}px`;
  box.style.top = `${boundingBox.y}px`;
  box.style.width = `${boundingBox.width}px`;
  box.style.height = `${boundingBox.height}px`;
  box.style.border = '2px solid rgba(74, 144, 226, 0.4)';
  box.style.backgroundColor = 'rgba(74, 144, 226, 0.05)';
  box.style.pointerEvents = 'none';
  box.style.borderRadius = '2px';
  box.style.zIndex = '999998';

  // Add label
  const label = document.createElement('div');
  label.className = 'venom-debug-boundingbox-label';
  label.textContent = hostName;
  label.style.position = 'absolute';
  label.style.top = '-26px';
  label.style.left = '0';
  label.style.backgroundColor = 'rgba(50, 50, 50, 0.85)';
  label.style.color = 'white';
  label.style.padding = '3px 8px';
  label.style.borderRadius = '3px';
  label.style.fontSize = '11px';
  label.style.fontWeight = '500';
  label.style.fontFamily =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif";
  label.style.whiteSpace = 'nowrap';
  label.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.2)';

  // Add dimensions info
  const dimensions = document.createElement('div');
  dimensions.className = 'venom-debug-boundingbox-dimensions';
  dimensions.textContent = `${boundingBox.width} × ${boundingBox.height}`;
  dimensions.style.position = 'absolute';
  dimensions.style.bottom = '-26px';
  dimensions.style.right = '0';
  dimensions.style.backgroundColor = 'rgba(50, 50, 50, 0.85)';
  dimensions.style.color = 'white';
  dimensions.style.padding = '3px 8px';
  dimensions.style.borderRadius = '3px';
  dimensions.style.fontSize = '10px';
  dimensions.style.fontWeight = '400';
  dimensions.style.fontFamily =
    "'Consolas', 'Monaco', 'Courier New', monospace";
  dimensions.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.2)';
  box.appendChild(label);
  box.appendChild(dimensions);

  return box;
}
