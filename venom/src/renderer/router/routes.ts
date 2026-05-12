import { HelloWorld } from '../HelloWorld';

const ROUTES: Record<string, { path: string; component: any }> = {
  HOME: {
    path: '/',
    component: HelloWorld,
  },
};

export default ROUTES;
