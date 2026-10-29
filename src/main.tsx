import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { CrashRecovery, ErrorBoundary, ErrorProvider, useErrors } from './components/ErrorHandling';
import { ThemeProvider, ThemeSelector } from './Theme';
import './styles.css';
import './theme.css';

function Workspace() {
  const { reportError } = useErrors();
  return <ErrorBoundary title="Workspace unavailable" reportError={reportError} fallback={() => <><header className="recovery-header"><a className="site-wordmark" href="#/home">picasso<span>.</span></a><ThemeSelector /></header><main id="page-content" tabIndex={-1} aria-label="Workspace recovery"><CrashRecovery root /></main></>}><App /></ErrorBoundary>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ThemeProvider><ErrorProvider><Workspace /></ErrorProvider></ThemeProvider></React.StrictMode>,
);
