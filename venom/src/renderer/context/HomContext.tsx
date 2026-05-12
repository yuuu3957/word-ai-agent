import {
  createContext,
  useEffect,
  useMemo,
  useCallback,
  useState,
  ReactNode,
} from 'react';
import { Venom, SubscribedHost } from '@ar-project/host-object-model';
import { getVenom, getSubscribedHost } from '../Hom';

interface IHomContextData {
  venomInstance: Venom | null;
  subscribedHostInstance: SubscribedHost | null;
  setSubscribedHost: () => Promise<void>;
}

export const HomContext = createContext<IHomContextData>({
  venomInstance: null,
  subscribedHostInstance: null,
  setSubscribedHost: async () => {},
});

export const HomProvider = ({ children }: { children: ReactNode }) => {
  const [venomInstance, setVenomInstance] = useState<Venom | null>(null);
  const [subscribedHostInstance, setSubscribedHostInstance] =
    useState<SubscribedHost | null>(null);

  const setSubscribedHost = useCallback(async () => {
    const host = await getSubscribedHost();
    setSubscribedHostInstance(host);
  }, []);

  useEffect(() => {
    const initializeVenom = async () => {
      const venom = await getVenom();
      setVenomInstance(venom);
    };
    initializeVenom();
    setSubscribedHost();
  }, [setSubscribedHost]);

  const homContextData: IHomContextData = useMemo(() => {
    return {
      venomInstance,
      subscribedHostInstance,
      setSubscribedHost,
    };
  }, [venomInstance, subscribedHostInstance, setSubscribedHost]);

  return (
    <HomContext.Provider value={homContextData}>{children}</HomContext.Provider>
  );
};
