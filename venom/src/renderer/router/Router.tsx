import { HashRouter, Routes, Route } from 'react-router-dom';
import ROUTES from './routes';
import { HelloWorld } from '../HelloWorld';
import '../App.css';

// if you just have one page, just replace the HelloWorld to your page component
// if you have multiple pages, you can add more Route components
const Router = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path={ROUTES.HOME.path} element={<HelloWorld />} />
      </Routes>
    </HashRouter>
  );
};

export default Router;
