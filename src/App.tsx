import { SceneCanvas } from './components/scene/SceneCanvas';
import { FloatingHintPanel } from './components/ui/FloatingHintPanel';
import { Header } from './components/ui/Header';
import { Sidebar } from './components/ui/Sidebar';

// Layout utama: header di atas, kanvas 3D + panel bantuan mengambang di kiri, sidebar tetap di kanan
function App() {
  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-neutral-950">
      <Header />
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <main className="flex-1 min-w-0 h-full relative">
          <SceneCanvas />
          <FloatingHintPanel />
        </main>
        <Sidebar />
      </div>
    </div>
  );
}

export default App;
