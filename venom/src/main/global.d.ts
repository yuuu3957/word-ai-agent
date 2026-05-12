export {};

declare global {
  interface Window {
    venomToolBridge: {
      onRunTool: (
        callback: (data: {
          requestId: string;
          toolName: string;
          payload?: Record<string, unknown>;
        }) => void
      ) => void;

      sendToolResult: (
        requestId: string,
        result: {
          success: boolean;
          message: string;
        }
      ) => void;
    };
  }
}