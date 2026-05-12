import { useEffect } from 'react';
import { HomProvider } from './context/HomContext';
import { Router } from './router';
import { registerVenomTools } from './tools/registerVenomTools';

export const App = () => {
  useEffect(() => {
    console.log('[App] registerVenomTools');
    registerVenomTools();
  }, []);

  return (
    <HomProvider>
      <Router />
    </HomProvider>
  );
};

export default App;