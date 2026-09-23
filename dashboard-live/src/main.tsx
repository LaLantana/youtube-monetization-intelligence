import './ascendShim'; // installs window.ascend.runQuery before the dashboard mounts
import './index.css';
import { createRoot } from 'react-dom/client';
import AppShell from './AppShell';

createRoot(document.getElementById('root')!).render(<AppShell />);
