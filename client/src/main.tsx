import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { useAuthStore } from './store/auth.store';

// Componente wrapper que inicializa o listener do Firebase Auth
function Root() {
  const initAuthListener = useAuthStore((s) => s.initAuthListener);

  useEffect(() => {
    const unsubscribe = initAuthListener();
    return unsubscribe; // cleanup ao desmontar
  }, [initAuthListener]);

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
