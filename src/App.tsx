import { useState } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import LoginPage from './components/LoginPage';
import VorgangsuchePage from './components/VorgangsuchePage';
import AntragStepper from './components/AntragStepper';
import AdminUebersichtPage from './components/AdminUebersichtPage';
import type { AntragData } from './types/antrag';
import { initialAntragData, MOCK_VORGAENGE, migrateAntragData } from './types/antrag';
import type { AppUser } from './types/user';
import { MOCK_USERS } from './data/users';
import { kannBearbeiten } from './utils/berechtigung';

type Page = 'login' | 'vorgangssuche' | 'antrag' | 'admin-uebersicht';

function App() {
  const [page, setPage] = useState<Page>('login');
  const [vorgaenge, setVorgaenge] = useState<AntragData[]>(MOCK_VORGAENGE);
  const [currentAntrag, setCurrentAntrag] = useState<AntragData | null>(null);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [antragHerkunft, setAntragHerkunft] = useState<Page>('vorgangssuche');

  const handleLogin = (user: AppUser) => {
    setCurrentUser(user);
    setPage('vorgangssuche');
  };

  const handleSwitchUser = (user: AppUser) => {
    setCurrentUser(user);
    if (page === 'admin-uebersicht' && user.rolle !== 'admin') {
      setPage('vorgangssuche');
    }
  };

  const handleNewVorgang = () => {
    const antrag = initialAntragData();
    if (currentUser) antrag.underwriter = currentUser.nachname;
    setCurrentAntrag(antrag);
    setAntragHerkunft('vorgangssuche');
    setPage('antrag');
  };

  const handleEditVorgang = (id: string) => {
    const found = vorgaenge.find((v) => v.id === id);
    if (found) {
      setCurrentAntrag(migrateAntragData(found));
      setAntragHerkunft(page === 'admin-uebersicht' ? 'admin-uebersicht' : 'vorgangssuche');
      setPage('antrag');
    }
  };

  const handleSaveAntrag = (antrag: AntragData) => {
    setVorgaenge((prev) => {
      const exists = prev.some((v) => v.id === antrag.id);
      return exists ? prev.map((v) => (v.id === antrag.id ? antrag : v)) : [...prev, antrag];
    });
  };

  const handleBackToSearch = () => {
    setCurrentAntrag(null);
    const ziel = antragHerkunft === 'admin-uebersicht' && currentUser?.rolle !== 'admin' ? 'vorgangssuche' : antragHerkunft;
    setPage(ziel);
  };

  const handleShowUebersicht = () => setPage('admin-uebersicht');

  const handleLogout = () => {
    setCurrentUser(null);
    setPage('login');
  };

  const readOnly = !!(currentUser && currentAntrag && !kannBearbeiten(currentUser, currentAntrag));
  const istAdmin = currentUser?.rolle === 'admin';

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {page === 'login' && <LoginPage users={MOCK_USERS} onLogin={handleLogin} />}
      {page === 'vorgangssuche' && currentUser && (
        <VorgangsuchePage
          vorgaenge={vorgaenge}
          currentUser={currentUser}
          users={MOCK_USERS}
          onNewVorgang={handleNewVorgang}
          onEditVorgang={handleEditVorgang}
          onSwitchUser={handleSwitchUser}
          onLogout={handleLogout}
          onShowUebersicht={istAdmin ? handleShowUebersicht : undefined}
        />
      )}
      {page === 'admin-uebersicht' && currentUser && (
        <AdminUebersichtPage
          vorgaenge={vorgaenge}
          currentUser={currentUser}
          users={MOCK_USERS}
          onBack={() => setPage('vorgangssuche')}
          onEditVorgang={handleEditVorgang}
          onSwitchUser={handleSwitchUser}
          onLogout={handleLogout}
        />
      )}
      {page === 'antrag' && currentAntrag && currentUser && (
        <AntragStepper
          key={currentAntrag.id}
          initialData={currentAntrag}
          currentUser={currentUser}
          users={MOCK_USERS}
          readOnly={readOnly}
          onSave={handleSaveAntrag}
          onBack={handleBackToSearch}
          onSwitchUser={handleSwitchUser}
          onLogout={handleLogout}
          onShowUebersicht={istAdmin ? handleShowUebersicht : undefined}
        />
      )}
    </ThemeProvider>
  );
}

export default App;
