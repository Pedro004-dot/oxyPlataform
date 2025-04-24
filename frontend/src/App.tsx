// src/App.tsx

import { BrowserRouter } from 'react-router-dom';
import SocketPlayground from './components/SocketPlayground';

function App() {
  return (
    <BrowserRouter>
      <SocketPlayground />
    </BrowserRouter>
  );
}

export default App;