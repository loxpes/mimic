import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Sessions } from './pages/Sessions';
import { SessionDetail } from './pages/SessionDetail';
import { Personas } from './pages/Personas';
import { Objectives } from './pages/Objectives';
import { Features } from './pages/Features';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/sessions/:id" element={<SessionDetail />} />
        <Route path="/personas" element={<Personas />} />
        <Route path="/objectives" element={<Objectives />} />
        <Route path="/features" element={<Features />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
      </Routes>
    </Layout>
  );
}
