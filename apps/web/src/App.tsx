import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Sessions } from './pages/Sessions';
import { SessionDetail } from './pages/SessionDetail';
import { SessionChains } from './pages/SessionChains';
import { SessionChainDetail } from './pages/SessionChainDetail';
import { Personas } from './pages/Personas';
import { Objectives } from './pages/Objectives';
import { Features } from './pages/Features';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { TrelloCallback } from './pages/TrelloCallback';
import { Settings } from './pages/Settings';
import { Guide } from './pages/Guide';

export default function App() {
  return (
    <Routes>
      <Route
        path="/*"
        element={
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/sessions" element={<Sessions />} />
              <Route path="/sessions/:id" element={<SessionDetail />} />
              <Route path="/session-chains" element={<SessionChains />} />
              <Route path="/session-chains/:id" element={<SessionChainDetail />} />
              <Route path="/personas" element={<Personas />} />
              <Route path="/objectives" element={<Objectives />} />
              <Route path="/features" element={<Features />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/integrations/trello/callback" element={<TrelloCallback />} />
              <Route path="/guide" element={<Guide />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        }
      />
    </Routes>
  );
}
