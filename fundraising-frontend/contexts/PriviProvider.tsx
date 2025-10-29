'use client';

import { PrivyProvider as BasePrivyProvider } from '@privy-io/react-auth';
import { sepolia } from 'viem/chains';

export default function PrivyProvider({ children }: { children: React.ReactNode }) {
  return (
    <BasePrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        appearance: {
          theme: 'light',
          accentColor: '#9333ea',
          logo: '/logo.png',
          landingHeader: "Confidential Fundraising",
          loginMessage: "Start funding confidentially with your wallet"
        },
        loginMethods: ['wallet'],
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          }
        },
        defaultChain: sepolia,
        supportedChains: [sepolia],
      }}
    >
      {children}
    </BasePrivyProvider>
  );
}