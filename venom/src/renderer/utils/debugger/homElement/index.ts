import type { HomElement } from '@ar-project/host-object-model';
import DebuggerPanel from '../view/index';

/**
 * A debugger wrapper for HomElement that intercepts event subscriptions
 * and logs relevant information for debugging.
 */
class HomElementDebugger {
  /**
   * Attach debugger to a HomElement instance.
   * @param homElement The HomElement instance to wrap.
   * @returns A proxied HomElement with debugging features.
   */
  static attach(homElement: HomElement): HomElement {
    const debuggerPanel = DebuggerPanel.getInstance();

    // Create a proxy that intercepts all method calls
    return new Proxy(homElement, {
      get(target: HomElement, prop: string | symbol, receiver: any) {
        const originalValue = Reflect.get(target, prop, receiver);

        if (typeof originalValue === 'function') {
          const methodName = prop.toString();

          // Log other method calls
          return function (...args: any[]) {
            debuggerPanel.info(
              `[HomElement]${target.name} | ${methodName}`,
              methodName,
              args,
            );

            return originalValue.apply(target, args);
          };
        }

        return originalValue;
      },
    });
  }
}

export default HomElementDebugger;
