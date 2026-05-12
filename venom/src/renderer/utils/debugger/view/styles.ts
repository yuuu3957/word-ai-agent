/**
 * CSS styles for the debugger panel
 */
export const debuggerStyles = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }

  .venom-debug-toast {
    background: rgba(50, 50, 50, 0.9);
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    font-size: 13px;
    line-height: 1.4;
    animation: slideInRight 0.2s ease-out;
    pointer-events: auto;
    cursor: pointer;
    transition: opacity 0.2s ease;
    position: relative;
    overflow: hidden;
  }

  .venom-debug-toast:hover {
    opacity: 0.95;
  }

  .venom-debug-toast.removing {
    animation: slideOutRight 0.2s ease-out forwards;
  }

  .venom-debug-toast.info {
    border-left: 3px solid #4a90e2;
  }

  .venom-debug-toast.success {
    border-left: 3px solid #50c878;
  }

  .venom-debug-toast.warning {
    border-left: 3px solid #f5a623;
  }

  .venom-debug-toast.error {
    border-left: 3px solid #e74c3c;
  }

  .venom-debug-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
    font-weight: 500;
    font-size: 13px;
  }

  .venom-debug-event {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .venom-debug-icon {
    width: 16px;
    height: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
  }

  .venom-debug-timestamp {
    font-size: 11px;
    opacity: 0.7;
    font-weight: 400;
  }

  .venom-debug-data {
    background: rgba(0, 0, 0, 0.2);
    padding: 8px;
    border-radius: 4px;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 11px;
    word-break: break-word;
    white-space: pre;
    max-height: 150px;
    overflow-y: auto;
    overflow-x: auto;
  }

  .venom-debug-data::-webkit-scrollbar {
    width: 4px;
  }

  .venom-debug-data::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 2px;
  }

  .venom-debug-data::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 2px;
  }

  .venom-debug-data::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.4);
  }

  .venom-debug-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    background: rgba(255, 255, 255, 0.3);
    animation: progressBar 3s linear forwards;
  }

  @keyframes progressBar {
    from {
      width: 100%;
    }
    to {
      width: 0%;
    }
  }

  @keyframes boundsHighlight {
    0% {
      opacity: 0;
    }
    10% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }

  .venom-debug-boundingbox {
    opacity: 0;
    animation: boundsHighlight 2s ease-out;
  }

  .venom-debug-boundingbox-label {
    animation: labelFadeIn 0.2s ease-out;
  }

  .venom-debug-boundingbox-dimensions {
    animation: labelFadeIn 0.2s ease-out 0.05s backwards;
  }

  @keyframes labelFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

export const STYLE_ID = 'venom-debugger-styles';
