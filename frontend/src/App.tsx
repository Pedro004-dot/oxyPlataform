// src/App.tsx

import { BrowserRouter } from 'react-router-dom';
import Chat from './pages/chatPage';

function App() {
  return (
    <BrowserRouter>
      <Chat />
    </BrowserRouter>
  );
}

export default App;