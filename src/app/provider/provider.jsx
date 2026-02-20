"use client";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit"
import { QueryClientProvider, QueryClient } from "@tanstack/react-query"
import { WagmiProvider }from "wagmi";
import { config } from "./RainbowKitConfig";
import '@rainbow-me/rainbowkit/styles.css';
const Provider=({children})=>{
    const queryClient = new QueryClient();
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider>
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    )
}
export default Provider;