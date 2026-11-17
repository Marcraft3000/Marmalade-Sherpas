import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import AdvisorPortal from './components/AdvisorPortal.jsx';
import { NarrationProvider } from './components/Narration.jsx';
import { invitationPath } from './utils/api.js';
import './index.css';
import './editorial.css';

function Entry() {
  const [portal, setPortal] = useState(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (invitationPath) return;
    fetch('/api/portal')
      .then(response => {
        if (!response.ok) throw new Error('Portal unavailable');
        return response.json();
      })
      .then(config => setPortal(config.advisorPortal))
      .catch(() => setUnavailable(true));
  }, []);

  if (invitationPath || portal === false) return <NarrationProvider><App /></NarrationProvider>;
  if (portal) return <AdvisorPortal />;
  return <div className="app-shell"><p className="app-status" role="status">{unavailable ? 'The workspace could not be opened. Refresh to try again.' : 'Opening The Plan Audit.'}</p></div>;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Entry />
  </React.StrictMode>
);
