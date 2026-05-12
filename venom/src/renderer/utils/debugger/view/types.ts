/**
 * Type definitions for the debugger panel
 */

export interface DebuggerLog {
  id: string;
  source: string;
  event: string;
  data: any;
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error';
}

export type DebuggerLogType = DebuggerLog['type'];
