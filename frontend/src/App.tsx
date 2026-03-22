import { useState } from 'react';
import LandingPage from './LandingPage';
import AppShell from './AppShell';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
    return <LandingPage onLoggedIn={() => setIsLoggedIn(true)} />;
  }

  return <AppShell onLogout={() => setIsLoggedIn(false)} />;
}

export default App;
