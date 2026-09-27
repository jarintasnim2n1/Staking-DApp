"use client";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { mainnet, sepolia, polygon, optimism, arbitrum, base } from "wagmi/chains";

const projectId = process.env.NEXT_PUBLIC_RAINBOWKIT_PROJECT_ID || "80161cc9fddc14f6c5ec147b2a301db0";

export const config = getDefaultConfig({
  appName: "Staking DApp",
  projectId,
  chains: [sepolia, mainnet, polygon, optimism, arbitrum, base],
  ssr: true,
  transports: {
    [sepolia.id]: http(),
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
  },
});
