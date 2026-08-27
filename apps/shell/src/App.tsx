import * as React from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Card, EmptyState, Text } from '@portal/design-system';
import { PortalProvider, usePortal } from './platform/portal';
import { Sidebar, TelemetryPanel, Toasts, TopBar } from './components/Chrome';
import { Home } from './pages/Home';
import { JourneyHost } from './journeys/JourneyHost';

/**
 * Roteamento dinamico.
 *
 * Nao existe `<Route path="/ponto" element={<Ponto/>} />` em lugar nenhum.
 * Ha UMA rota curinga que consulta o registro. Adicionar jornada = adicionar
 * linha no registro. O core nao muda.
 */
function RotaDeJornada() {
  const portal = usePortal();
  const location = useLocation();
  const manifest = portal.journeyByRoute(location.pathname);

  if (!manifest) {
    return (
      <Card>
        <EmptyState
          mark="[ 404 ]"
          title="Essa página não existe no portal"
          description="Use a busca ou escolha uma jornada no menu."
        />
      </Card>
    );
  }

  const path = location.pathname.slice(manifest.route.length) || '/';
  return <JourneyHost key={manifest.id} manifest={manifest} path={path} />;
}

function Layout() {
  const portal = usePortal();

  if (portal.status === 'carregando') {
    return <div className="pp-boot"><Text tone="muted">Carregando o portal…</Text></div>;
  }
  if (portal.status === 'erro') {
    return (
      <div className="pp-boot">
        <EmptyState
          mark="[ ! ]"
          title="O portal não conseguiu iniciar"
          description="Verifique se o BFF está rodando em http://localhost:4000."
        />
      </div>
    );
  }

  return (
    <div className="pp-app">
      <TopBar />
      <div className="pp-body">
        <Sidebar />
        <main className="pp-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/inicio" element={<Navigate to="/" replace />} />
            <Route path="*" element={<RotaDeJornada />} />
          </Routes>
        </main>
      </div>
      <Toasts />
      <TelemetryPanel />
    </div>
  );
}

export default function App() {
  return (
    <PortalProvider>
      {/*
        As duas flags `future` ligam, hoje, o comportamento que vira padrao no
        React Router v7. Nao e cosmetico: sem elas o console do portal nasce com
        dois avisos permanentes, e console barulhento e como alerta que sempre
        toca -- em pouco tempo ninguem olha, inclusive quando aparece o erro que
        importa. `v7_relativeSplatPath` e especialmente relevante aqui porque
        TODA jornada e montada sob uma rota curinga.
      */}
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Layout />
      </BrowserRouter>
    </PortalProvider>
  );
}
