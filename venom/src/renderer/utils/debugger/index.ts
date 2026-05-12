import {
  Venom,
  SubscribedHost,
  SubscribedHomElements,
  Host,
  DescriptorDTO,
  HomElement,
} from '@ar-project/host-object-model';
import SubscribedHostDebugger from './subscribedHost';
import SubscribedHostElementsDebugger from './subscribedHomElements';
import HostDebugger from './host';
import HomElementDebugger from './homElement';
import DebuggerPanel from './view';

/**
 * Venom Debugger class
 */
class VenomDebugger {
  /**
   * Attach debugger to a Venom instance.
   * @param venomInstance The Venom instance to attach.
   * @returns A proxied Venom with debugging features.
   */
  static attach(venomInstance: Venom): Venom {
    const debuggerPanel = DebuggerPanel.getInstance();

    debuggerPanel.success('Venom Debugger Attached', 'attached', {});

    return new Proxy(venomInstance, {
      get(target: Venom, prop: string | symbol, receiver: any) {
        const originalValue = Reflect.get(target, prop, receiver);

        if (typeof originalValue === 'function') {
          const methodName = prop.toString();

          // Override getSubscribedHost to return debugger-wrapped SubscribedHost
          if (methodName === 'getSubscribedHost') {
            return async function (hostDescriptor: DescriptorDTO) {
              const subscribedHost: SubscribedHost = await originalValue.call(
                target,
                hostDescriptor,
              );
              return VenomDebugger.attachSubscribedHost(subscribedHost);
            };
          }
          if (methodName == 'getHosts') {
            return async function (hostDescriptor: DescriptorDTO) {
              const hosts: Host[] = await originalValue.call(
                target,
                hostDescriptor,
              );
              return hosts.map((host) => VenomDebugger.attachHost(host));
            };
          }

          // Log other method calls
          return function (...args: any[]) {
            debuggerPanel.info(`[Venom]${methodName}`, methodName, args);

            return originalValue.apply(target, args);
          };
        }
        return originalValue;
      },
    });
  }

  /**
   * Attach debugger to a SubscribedHost instance.
   * @param subscribedHostInstance The SubscribedHost instance to wrap.
   * @returns A proxied SubscribedHost with debugging features.
   */
  static attachSubscribedHost(
    subscribedHostInstance: SubscribedHost,
  ): SubscribedHost {
    const debuggerPanel = DebuggerPanel.getInstance();

    debuggerPanel.success('SubscribedHost Debugger Attached', 'attached', {
      name: subscribedHostInstance.name,
      isFocus: subscribedHostInstance.isFocus,
      isOnTop: subscribedHostInstance.isOnTop,
      boundingBox: subscribedHostInstance.boundingBox,
    });

    return SubscribedHostDebugger.attach(subscribedHostInstance);
  }

  /**
   * Attach debugger to a SubscribedHomElements instance.
   * @param subscribedHomElements The SubscribedHomElements instance to wrap.
   * @returns A proxied SubscribedHomElements with debugging features.
   */
  static attachSubscribedHomElements(
    subscribedHomElements: SubscribedHomElements,
  ): SubscribedHomElements {
    const debuggerPanel = DebuggerPanel.getInstance();

    debuggerPanel.success(
      'SubscribedHomElements Debugger Attached',
      'attached',
      {
        count: subscribedHomElements.elementsCount,
      },
    );

    return SubscribedHostElementsDebugger.attach(subscribedHomElements);
  }

  /**
   * Attach debugger to a Host instance.
   * @param host The Host instance to wrap.
   * @returns A proxied Host with debugging features.
   */
  static attachHost(host: Host): Host {
    const debuggerPanel = DebuggerPanel.getInstance();

    debuggerPanel.success('Host Debugger Attached', 'attached', {
      name: host.name,
      isFocus: host.isFocus,
      isOnTop: host.isOnTop,
      boundingBox: host.boundingBox,
    });

    return HostDebugger.attach(host);
  }

  /**
   * Attach debugger to a HomElement instance.
   * @param homElement The HomElement instance to wrap.
   * @returns A proxied HomElement with debugging features.
   */
  static attachHomElement(homElement: HomElement): HomElement {
    return HomElementDebugger.attach(homElement);
  }

  /**
   * Get the debugger panel instance
   */
  static getPanel(): DebuggerPanel {
    return DebuggerPanel.getInstance();
  }
}

export default VenomDebugger;
export { SubscribedHostDebugger, DebuggerPanel };
