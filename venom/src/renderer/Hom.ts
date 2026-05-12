import {
  DescriptorDTO,
  Venom,
  SubscribedHost,
} from '@ar-project/host-object-model';
import { FragmentDTO } from '@ar-project/host-object-model/lib/@type/UIschema';
import type { Config } from '../@type/Config';
import config from '../../config.json';
import hostDescriptor from '../../descriptor/host.json';

let venom: Venom | null = null;
let venomInitializing: Promise<void> | null = null;
let subscribedHostInitializing: Promise<void> | null = null;
let subscribedHost: SubscribedHost | null = null;
const VenomConfig: Config = config;
export const subscribedHostDescriptor: DescriptorDTO = hostDescriptor;

const generateUrl = (port: number, hubName: string) => {
  const url =
    process.env.NODE_ENV === 'production'
      ? `http://localhost:${port}/${hubName}`
      : `/api/${hubName}`;
  return url;
};

export const setSubscribedHostDescriptor = (
  updates: Partial<FragmentDTO>,
): void => {
  subscribedHostDescriptor.target.preciseSelector[0] = {
    ...subscribedHostDescriptor.target.preciseSelector[0],
    ...updates,
  };
};

const initializeVenom = async (): Promise<void> => {
  if (venom) return;

  // avoid multiple initialization
  if (!venomInitializing) {
    venomInitializing = (async (): Promise<void> => {
      venom = await Venom.create(
        generateUrl(
          VenomConfig.backend_server.port,
          VenomConfig.backend_server.hubName,
        ),
        await window.api.event.GetBrowserHwnd(),
      );

      // Attach debugger
      if (process.env.NODE_ENV !== 'production') {
        const { default: VenomDebugger } = await import('./utils/debugger');
        venom = VenomDebugger.attach(venom);
      }

      // eslint-disable-next-line no-console
      console.log('testVenom created success (initialize): ', venom);
    })();
  }

  await venomInitializing;
};

export const getVenom = async (): Promise<Venom> => {
  if (!venom) {
    await initializeVenom();
  }
  return venom as Venom;
};

export const initializeSubscribedHost = async (): Promise<void> => {
  if (subscribedHost) return;

  // avoid multiple initialization
  if (!subscribedHostInitializing) {
    subscribedHostInitializing = (async (): Promise<void> => {
      const venomInstance = await getVenom();
      subscribedHost = await venomInstance.getSubscribedHost(
        subscribedHostDescriptor,
      );
      // eslint-disable-next-line no-console
      console.log(
        'testSubscribedHost created success (initialize): ',
        subscribedHost,
      );
    })();
  }

  await subscribedHostInitializing;
};

export const getSubscribedHost = async (): Promise<SubscribedHost> => {
  if (!subscribedHost) {
    await initializeSubscribedHost();
  }
  return subscribedHost as SubscribedHost;
};

export default getVenom;
