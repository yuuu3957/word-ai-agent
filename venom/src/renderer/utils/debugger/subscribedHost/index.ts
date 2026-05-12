import type {
  DescriptorDTO,
  SubscribedHomElements,
  SubscribedHost,
  UITreeScope,
} from '@ar-project/host-object-model';
import DebuggerPanel from '../view/index';
import SubscribedHostElementsDebugger from '../subscribedHomElements';

/**
 * A debugger wrapper for SubscribedHost that intercepts event subscriptions
 * and logs relevant information for debugging.
 */
class SubscribedHostDebugger {
  /**
   * Attach debugger to a SubscribedHost instance.
   * @param subscribedHost The SubscribedHost instance to wrap.
   * @returns A proxied SubscribedHost with debugging features.
   */
  static attach(subscribedHost: SubscribedHost): SubscribedHost {
    const debuggerPanel = DebuggerPanel.getInstance();

    // Create a proxy that intercepts all method calls
    return new Proxy(subscribedHost, {
      get(target: SubscribedHost, prop: string | symbol, receiver: any) {
        const originalValue = Reflect.get(target, prop, receiver);

        if (typeof originalValue === 'function') {
          const methodName = prop.toString();

          if (methodName === 'getElementsByDescriptor') {
            return async function (
              elementDescriptor: DescriptorDTO,
              uiTreeScope?: UITreeScope,
            ) {
              const elements: SubscribedHomElements = await originalValue.call(
                target,
                elementDescriptor,
                uiTreeScope,
              );
              return SubscribedHostElementsDebugger.attach(elements);
            };
          }

          // Special handling for onBoundingBoxChanged
          if (methodName === 'onBoundingBoxChanged') {
            return async function (callback: (host: SubscribedHost) => void) {
              const wrappedCallback = (host: SubscribedHost) => {
                debuggerPanel.info(
                  `[SubscribedHost]${target.name} | ${methodName}`,
                  methodName,
                  [host],
                );

                // Draw bounding box overlay
                if (host.boundingBox) {
                  debuggerPanel.logBoundingBoxChange(
                    target.name || 'Unknown Host',
                    host.boundingBox,
                  );
                }

                return callback(host);
              };

              return originalValue.call(target, wrappedCallback);
            };
          }

          // Handle onXXXChanged methods
          if (methodName.startsWith('on') && methodName.endsWith('Changed')) {
            return async function (callback: (...args: any[]) => void) {
              const wrappedCallback = (...args: any[]) => {
                debuggerPanel.info(
                  `[SubscribedHost]${target.name} | ${methodName}`,
                  methodName,
                  args,
                );

                return callback(...args);
              };

              return originalValue.call(target, wrappedCallback);
            };
          }

          // Handle offXXXChanged methods
          if (methodName.startsWith('off') && methodName.endsWith('Changed')) {
            return async function (...args: any[]) {
              debuggerPanel.info(
                `[SubscribedHost]${target.name} | ${methodName}`,
                methodName,
                args,
              );

              return originalValue.call(target, ...args);
            };
          }

          // Log other method calls
          return function (...args: any[]) {
            debuggerPanel.info(
              `[SubscribedHost]${target.name} | ${methodName}`,
              methodName,
              args,
            );

            return originalValue.apply(target, args);
          };
        }

        return originalValue;
      },
    }) as SubscribedHost;
  }
}

export default SubscribedHostDebugger;
