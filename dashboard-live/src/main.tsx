import './ascendShim'; // installs window.ascend.runQuery before the dashboard mounts
import './index.css';
import { createRoot } from 'react-dom/client';
import Dashboard from './Dashboard';

createRoot(document.getElementById('root')!).render(<Dashboard />);
