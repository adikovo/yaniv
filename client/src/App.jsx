import './App.css'
import AppRouter from './AppRouter';
import { GameProvider } from './context/game-context';

function App() {
  return (
    <div className="full-window app">
      <GameProvider>
        <AppRouter />
      </GameProvider>
    </div>
  )
}

export default App
