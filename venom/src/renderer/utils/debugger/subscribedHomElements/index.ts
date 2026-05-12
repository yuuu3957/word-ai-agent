import type {
  SubscribedHomElements,
  HomElement,
} from '@ar-project/host-object-model';
import DebuggerPanel from '../view/index';
import HomElementDebugger from '../homElement';

/**
 * A debugger wrapper for SubscribedHostElements that intercepts event subscriptions
 * and logs relevant information for debugging.
 */
class SubscribedHostElementsDebugger {
  /**
   * Attach debugger to a SubscribedHostElements instance.
   * @param subscribedHostElements The SubscribedHostElements instance to wrap.
   * @returns A proxied SubscribedHostElements with debugging features.
   */
  static attach(
    subscribedHostElements: SubscribedHomElements,
  ): SubscribedHomElements {
    const debuggerPanel = DebuggerPanel.getInstance();

    // Create a proxy that intercepts all method calls
    return new Proxy(subscribedHostElements, {
      get(target: SubscribedHomElements, prop: string | symbol, receiver: any) {
        const originalValue = Reflect.get(target, prop, receiver);

        if (typeof originalValue === 'function') {
          const methodName = prop.toString();

          if (methodName === 'item') {
            return function (index: number) {
              const homElement: HomElement = originalValue.call(target, index);
              return HomElementDebugger.attach(homElement);
            };
          }

          if (methodName === 'getHomElements') {
            return function () {
              const homElements: HomElement[] = originalValue.call(target);
              return homElements.map((el: HomElement) =>
                HomElementDebugger.attach(el),
              );
            };
          }

          // Special handling for onBoundingBoxChanged
          if (methodName === 'onBoundingBoxChanged') {
            return async function (callback: (elements: HomElement[]) => void) {
              const wrappedCallback = (elements: HomElement[]) => {
                debuggerPanel.info(
                  `[SubscribedHostElements]${target.item(0)?.name} | ${methodName}`,
                  methodName,
                  elements,
                );

                // Draw bounding box overlay
                if (elements[0]?.boundingBox) {
                  debuggerPanel.logBoundingBoxChange(
                    target.item(0)?.name || 'Unknown Host',
                    elements[0].boundingBox,
                  );
                }

                return callback(elements);
              };

              return originalValue.call(target, wrappedCallback);
            };
          }

          // Handle onXXXChanged methods
          if (methodName.startsWith('on') && methodName.endsWith('Changed')) {
            return async function (callback: (...args: any[]) => void) {
              const wrappedCallback = (...args: any[]) => {
                debuggerPanel.info(
                  `[SubscribedHostElements]${target.item(0)?.name} | ${methodName}`,
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
                `[SubscribedHostElements]${target.item(0)?.name} | ${methodName}`,
                methodName,
                args,
              );

              return originalValue.call(target, ...args);
            };
          }

          // Log other method calls
          return function (...args: any[]) {
            debuggerPanel.info(
              `[SubscribedHostElements]${target.item(0)?.name} | ${methodName}`,
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

export default SubscribedHostElementsDebugger;
