import type {
  DescriptorDTO,
  Host,
  SubscribedHomElements,
  UITreeScope,
} from '@ar-project/host-object-model';
import DebuggerPanel from '../view/index';
import SubscribedHostElementsDebugger from '../subscribedHomElements';

/**
 * A debugger wrapper for Host that intercepts event subscriptions
 * and logs relevant information for debugging.
 */
class HostDebugger {
  /**
   * Attach debugger to a Host instance.
   * @param host The Host instance to wrap.
   * @returns A proxied Host with debugging features.
   */
  static attach(host: Host): Host {
    const debuggerPanel = DebuggerPanel.getInstance();

    // Create a proxy that intercepts all method calls
    return new Proxy(host, {
      get(target: Host, prop: string | symbol, receiver: any) {
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

export default HostDebugger;
