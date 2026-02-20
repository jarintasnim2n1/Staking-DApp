"use client"
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import '@rainbow-me/rainbowkit/styles.css';
import { mainnet, sepolia,polygon,optimism, arbitrum, base } from 'wagmi/chains';
import { injectedWallet, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
// 2. Modify the createConnectors function, removing the typeof window check
function createConnectors() {
  return connectorsForWallets(
    [
      {
        groupName: "Popular",
        // Pass the wallets array directly. RainbowKit will handle the SSR logic.
        wallets: [injectedWallet, walletConnectWallet],
      },
    ],
    {
      appName: 'Staking DApp',
      // Assuming you've set up your .env file correctly.
      projectId: process.env.NEXT_PUBLIC_RAINBOWKIT_PROJECT_ID,
    }
  );
}
export const config = getDefaultConfig({
  appName: 'staking dApp',
  projectId: process.env.NEXT_PUBLIC_RAINBOWKIT_PROJECT_ID,
   connectors: createConnectors(),
  chains: [mainnet, polygon,sepolia, optimism, arbitrum, base],
  ssr: true, // If your dApp uses server side rendering (SSR)
 transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
  },

});

