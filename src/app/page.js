"use client";
import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import useStaking from "./hooks/useStaking";
import useAdmin from "./hooks/useAdmin";
import {
  FaCoins,
  FaLock,
  FaGift,
  FaChartLine,
  FaShieldAlt,
  FaArrowDown,
  FaArrowUp,
  FaSyncAlt,
  FaCheckCircle,
  FaExternalLinkAlt,
} from "react-icons/fa";
import { contractAddress } from "./utils/contractAddress";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { isConnected, address } = useAccount();
  const {
    tokenBalance,
    stakedAmount,
    pendingRewards,
    totalStaked,
    apy,
    isLoading: isStakingLoading,
    stakeTokens,
    approveTokens,
    withdrawToken,
    claimRewards,
    fetchStakingData,
    needsApproval,
  } = useStaking();

  const {
    isOwner,
    currentRewardRate,
    currentMinStake,
    isLoading: isAdminLoading,
    setRewardRate,
    setMinimumStake,
    depositRewardTokens,
    emergencyWithdraw,
  } = useAdmin();

  const [activeTab, setActiveTab] = useState("stake");
  const [stakeInput, setStakeInput] = useState("");
  const [withdrawInput, setWithdrawInput] = useState("");
  const [adminRateInput, setAdminRateInput] = useState("");
  const [adminMinStakeInput, setAdminMinStakeInput] = useState("");
  const [adminDepositInput, setAdminDepositInput] = useState("");
  const [adminEmergencyToken, setAdminEmergencyToken] = useState("");
  const [adminEmergencyAmount, setAdminEmergencyAmount] = useState("");

  const handleStake = async (e) => {
    e.preventDefault();
    if (!stakeInput || parseFloat(stakeInput) <= 0) return;
    if (needsApproval(stakeInput)) {
      const approved = await approveTokens(stakeInput);
      if (approved) {
        setStakeInput("");
      }
    } else {
      const success = await stakeTokens(stakeInput);
      if (success) {
        setStakeInput("");
      }
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!withdrawInput || parseFloat(withdrawInput) <= 0) return;
    const success = await withdrawToken(withdrawInput);
    if (success) {
      setWithdrawInput("");
    }
  };

  const formatDisplayNum = (val, decimals = 4) => {
    if (!val || isNaN(val)) return "0.00";
    const num = parseFloat(val);
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-20">
      {/* Background glowing effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/70 border-b border-slate-800/80 px-4 lg:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <FaCoins className="text-white text-lg" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                StakeVault
              </span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                dApp
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isConnected && (
              <button
                onClick={fetchStakingData}
                disabled={isStakingLoading}
                title="Refresh staking data"
                className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 transition-all hover:text-white"
              >
                <FaSyncAlt className={`${isStakingLoading ? "animate-spin text-indigo-400" : ""}`} />
              </button>
            )}
            <ConnectButton showBalance={false} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 lg:px-8 pt-8 space-y-8 relative z-10">
        {/* Hero & Protocol Stats Banner */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800 shadow-xl backdrop-blur-sm relative overflow-hidden group hover:border-indigo-500/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">Annual Percentage Yield</span>
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <FaChartLine />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold text-emerald-400">
                {apy}%
              </div>
              <p className="text-xs text-slate-500 mt-1">Calculated dynamic rewards</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800 shadow-xl backdrop-blur-sm relative overflow-hidden group hover:border-indigo-500/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">Total Value Locked</span>
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <FaLock />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold text-white">
                {formatDisplayNum(totalStaked)} <span className="text-sm font-medium text-slate-400">TOKENS</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Global pool total staked</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800 shadow-xl backdrop-blur-sm relative overflow-hidden group hover:border-indigo-500/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">Contract Security</span>
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <FaShieldAlt />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-slate-300 font-mono truncate max-w-[200px]">
                {contractAddress.staking.slice(0, 8)}...{contractAddress.staking.slice(-6)}
              </span>
              <a
                href={`https://sepolia.etherscan.io/address/${contractAddress.staking}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                Explorer <FaExternalLinkAlt className="text-[10px]" />
              </a>
            </div>
            <p className="text-xs text-slate-500 mt-1">Non-custodial smart contract</p>
          </div>
        </section>

        {/* User Account Overview */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Wallet Balance</span>
            <div className="text-xl font-bold text-slate-200 mt-1">
              {formatDisplayNum(tokenBalance)} <span className="text-xs font-normal text-slate-400">TOKEN</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Your Staked Amount</span>
            <div className="text-xl font-bold text-indigo-400 mt-1">
              {formatDisplayNum(stakedAmount)} <span className="text-xs font-normal text-slate-400">TOKEN</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Claimable Rewards</span>
              <div className="text-xl font-bold text-emerald-400 mt-1">
                {formatDisplayNum(pendingRewards, 6)} <span className="text-xs font-normal text-slate-400">REWARD</span>
              </div>
            </div>
            <button
              onClick={() => claimRewards()}
              disabled={isStakingLoading || parseFloat(pendingRewards) <= 0}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Claim
            </button>
          </div>
        </section>

        {/* Main Interactive Card */}
        <section className="max-w-2xl mx-auto rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl p-6 lg:p-8 backdrop-blur-md">
          {/* Tabs */}
          <div className="flex border-b border-slate-800 mb-6 pb-2 gap-3">
            <button
              onClick={() => setActiveTab("stake")}
              className={`flex items-center gap-2 pb-2 px-3 text-sm font-semibold transition-all border-b-2 ${
                activeTab === "stake"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <FaArrowDown /> Stake Tokens
            </button>
            <button
              onClick={() => setActiveTab("withdraw")}
              className={`flex items-center gap-2 pb-2 px-3 text-sm font-semibold transition-all border-b-2 ${
                activeTab === "withdraw"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <FaArrowUp /> Withdraw Stake
            </button>
            {isOwner && (
              <button
                onClick={() => setActiveTab("admin")}
                className={`flex items-center gap-2 pb-2 px-3 text-sm font-semibold transition-all border-b-2 ${
                  activeTab === "admin"
                    ? "border-purple-500 text-purple-400"
                    : "border-transparent text-slate-400 hover:text-purple-300"
                }`}
              >
                <FaShieldAlt /> Owner Admin
              </button>
            )}
          </div>

          {/* Stake Form */}
          {activeTab === "stake" && (
            <form onSubmit={handleStake} className="space-y-6">
              <div>
                <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                  <span>Stake Amount</span>
                  <span>
                    Available:{" "}
                    <button
                      type="button"
                      onClick={() => setStakeInput(tokenBalance)}
                      className="text-indigo-400 hover:underline font-medium"
                    >
                      {formatDisplayNum(tokenBalance)} Max
                    </button>
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    placeholder="0.0"
                    value={stakeInput}
                    onChange={(e) => setStakeInput(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors pr-24 font-mono text-lg"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStakeInput(tokenBalance)}
                      className="text-xs px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 font-semibold"
                    >
                      MAX
                    </button>
                    <span className="text-xs font-bold text-slate-400">TOKEN</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isStakingLoading || !stakeInput || parseFloat(stakeInput) <= 0}
                className="w-full py-4 rounded-xl font-bold text-base bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-xl shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isStakingLoading
                  ? "Processing Transaction..."
                  : needsApproval(stakeInput)
                  ? "Approve Tokens for Staking"
                  : "Stake Tokens"}
              </button>
            </form>
          )}

          {/* Withdraw Form */}
          {activeTab === "withdraw" && (
            <form onSubmit={handleWithdraw} className="space-y-6">
              <div>
                <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                  <span>Withdraw Amount</span>
                  <span>
                    Staked:{" "}
                    <button
                      type="button"
                      onClick={() => setWithdrawInput(stakedAmount)}
                      className="text-indigo-400 hover:underline font-medium"
                    >
                      {formatDisplayNum(stakedAmount)} Max
                    </button>
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    placeholder="0.0"
                    value={withdrawInput}
                    onChange={(e) => setWithdrawInput(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors pr-24 font-mono text-lg"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setWithdrawInput(stakedAmount)}
                      className="text-xs px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 font-semibold"
                    >
                      MAX
                    </button>
                    <span className="text-xs font-bold text-slate-400">TOKEN</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isStakingLoading || !withdrawInput || parseFloat(withdrawInput) <= 0}
                className="w-full py-4 rounded-xl font-bold text-base bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-xl shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isStakingLoading ? "Processing Transaction..." : "Withdraw Tokens"}
              </button>
            </form>
          )}

          {/* Admin Panel */}
          {activeTab === "admin" && isOwner && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-200 text-xs">
                Owner controls: Manage reward rate, deposit reward tokens into the contract, or update minimum stake.
              </div>

              {/* Reward Rate */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Set Reward Rate (tokens/sec)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    placeholder={`Current: ${currentRewardRate}`}
                    value={adminRateInput}
                    onChange={(e) => setAdminRateInput(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                  />
                  <button
                    onClick={() => {
                      setRewardRate(adminRateInput);
                      setAdminRateInput("");
                    }}
                    disabled={isAdminLoading || !adminRateInput}
                    className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    Update
                  </button>
                </div>
              </div>

              {/* Minimum Stake */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Set Minimum Stake (tokens)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    placeholder={`Current: ${currentMinStake}`}
                    value={adminMinStakeInput}
                    onChange={(e) => setAdminMinStakeInput(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                  />
                  <button
                    onClick={() => {
                      setMinimumStake(adminMinStakeInput);
                      setAdminMinStakeInput("");
                    }}
                    disabled={isAdminLoading || !adminMinStakeInput}
                    className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    Update
                  </button>
                </div>
              </div>

              {/* Deposit Rewards */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Deposit Reward Pool Tokens</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    placeholder="Amount to deposit"
                    value={adminDepositInput}
                    onChange={(e) => setAdminDepositInput(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                  />
                  <button
                    onClick={() => {
                      depositRewardTokens(adminDepositInput);
                      setAdminDepositInput("");
                    }}
                    disabled={isAdminLoading || !adminDepositInput}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    Deposit
                  </button>
                </div>
              </div>

              {/* Emergency Withdraw */}
              <div className="space-y-2 border-t border-slate-800 pt-4">
                <label className="text-xs font-semibold text-rose-400">Emergency Withdraw Tokens</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Token Address (0x...)"
                    value={adminEmergencyToken}
                    onChange={(e) => setAdminEmergencyToken(e.target.value)}
                    className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-mono"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      placeholder="Amount"
                      value={adminEmergencyAmount}
                      onChange={(e) => setAdminEmergencyAmount(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm"
                    />
                    <button
                      onClick={() => {
                        emergencyWithdraw(adminEmergencyToken, adminEmergencyAmount);
                        setAdminEmergencyAmount("");
                      }}
                      disabled={isAdminLoading || !adminEmergencyToken || !adminEmergencyAmount}
                      className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold disabled:opacity-50"
                    >
                      Withdraw
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
