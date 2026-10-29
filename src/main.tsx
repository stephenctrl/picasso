import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { CrashRecovery, ErrorBoundary, ErrorProvider, useErrors } from './components/ErrorHandling';
import './styles.css';

function Workspace() {
  const { reportError } = useErrors();
  return <ErrorBoundary title="Workspace unavailable" reportError={reportError} fallback={() => <main id="page-content" tabIndex={-1} aria-label="Workspace recovery"><CrashRecovery root /></main>}><App /></ErrorBoundary>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ErrorProvider><Workspace /></ErrorProvider></React.StrictMode>,
);
