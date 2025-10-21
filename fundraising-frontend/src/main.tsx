import React from 'react';
import ReactDOM from 'react-dom/client';
import { PrivyProvider } from '@privy-io/react-auth';
import { sepolia } from 'viem/chains';
import { FhevmProvider } from './contexts/FhevmContext';
import App from './App';
import './index.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID!}
      config={{
        loginMethods: ['wallet', 'email'],
        appearance: {
          theme: 'light',
          accentColor: '#9333ea',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        defaultChain: sepolia,
        supportedChains: [sepolia],
      }}
    >
      <FhevmProvider>
        <App />
      </FhevmProvider>
    </PrivyProvider>
  </React.StrictMode>
);