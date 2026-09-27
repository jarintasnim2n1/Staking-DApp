"use client";
import { useCallback, useEffect, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import { toast } from "react-toastify";
import { contractAddress } from "../utils/contractAddress";
import { StakeToken_ABI, Staking_ABI } from "../utils/Abi";

export const useStaking = () => {
  const { address: account, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [tokenBalance, setTokenBalance] = useState("0");
  const [stakedAmount, setStakedAmount] = useState("0");
  const [pendingRewards, setPendingRewards] = useState("0");
  const [totalStaked, setTotalStaked] = useState("0");
  const [apy, setApy] = useState("0");
  const [allowance, setAllowance] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const [currentTxHash, setCurrentTxHash] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Read token balance
  const { data: balanceData, refetch: refetchBalance } = useReadContract({
    address: contractAddress.stakeToken,
    abi: StakeToken_ABI,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    query: {
      enabled: !!account && isConnected,
    },
  });

  // Read stake info
  const { data: stakeInfoData, refetch: refetchStakeInfo } = useReadContract({
    address: contractAddress.staking,
    abi: Staking_ABI,
    functionName: "getStakeInfo",
    args: account ? [account] : undefined,
    query: {
      enabled: !!account && isConnected,
    },
  });

  // Read total stake (from totalStaked or getTotakStake)
  const { data: totalStakeData, refetch: refetchTotalStake } = useReadContract({
    address: contractAddress.staking,
    abi: Staking_ABI,
    functionName: "totalStaked",
    query: {
      enabled: isConnected,
    },
  });

  // Read APY
  const { data: apyData, refetch: refetchApy } = useReadContract({
    address: contractAddress.staking,
    abi: Staking_ABI,
    functionName: "getApy",
    query: {
      enabled: isConnected,
    },
  });

  // Read allowance
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: contractAddress.stakeToken,
    abi: StakeToken_ABI,
    functionName: "allowance",
    args: account ? [account, contractAddress.staking] : undefined,
    query: {
      enabled: !!account && isConnected,
    },
  });

  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: currentTxHash,
    });

  // Update states on contract reads
  useEffect(() => {
    if (balanceData !== undefined && balanceData !== null) {
      setTokenBalance(formatEther(balanceData));
      setLastUpdated(Date.now());
    }
  }, [balanceData]);

  useEffect(() => {
    if (stakeInfoData) {
      const stakeAmt =
        stakeInfoData.stakeAmount ?? stakeInfoData[0] ?? 0n;
      const rewards =
        stakeInfoData.pendingRewards ?? stakeInfoData[1] ?? 0n;

      setStakedAmount(formatEther(stakeAmt));
      setPendingRewards(formatEther(rewards));
      setLastUpdated(Date.now());
    }
  }, [stakeInfoData]);

  useEffect(() => {
    if (allowanceData !== undefined && allowanceData !== null) {
      setAllowance(formatEther(allowanceData));
    }
  }, [allowanceData]);

  useEffect(() => {
    if (totalStakeData !== undefined && totalStakeData !== null) {
      setTotalStaked(formatEther(totalStakeData));
      setLastUpdated(Date.now());
    }
  }, [totalStakeData]);

  useEffect(() => {
    if (apyData !== undefined && apyData !== null) {
      setApy((Number(apyData) / 100).toFixed(2));
    }
  }, [apyData]);

  // Fetch all staking data
  const fetchStakingData = useCallback(async () => {
    if (!isConnected || !account) return;
    try {
      await Promise.all([
        refetchStakeInfo(),
        refetchBalance(),
        refetchTotalStake(),
        refetchApy(),
        refetchAllowance(),
      ]);
    } catch (error) {
      console.error("Error fetching staking data:", error);
    }
  }, [
    account,
    isConnected,
    refetchStakeInfo,
    refetchBalance,
    refetchTotalStake,
    refetchApy,
    refetchAllowance,
  ]);

  useEffect(() => {
    if (isConfirmed) {
      setIsLoading(false);
      setCurrentTxHash(null);
      toast.success("Transaction confirmed successfully!");
      fetchStakingData();
    }
  }, [isConfirmed, fetchStakingData]);

  // Polling for rewards
  useEffect(() => {
    if (!isConnected || !account) return;
    const interval = setInterval(() => {
      refetchStakeInfo();
    }, 5000);
    return () => clearInterval(interval);
  }, [isConnected, account, refetchStakeInfo]);

  const isUserRejection = (error) => {
    const msg = error?.message || error?.shortMessage || "";
    return (
      msg.toLowerCase().includes("user rejected") ||
      msg.toLowerCase().includes("user denied") ||
      msg.toLowerCase().includes("denied transaction") ||
      error?.code === 4001 ||
      error?.code === "ACTION_REJECTED"
    );
  };

  const getErrorMessage = (error, defaultMessage) => {
    const errorMsg = error?.message || error?.shortMessage || "";

    if (isUserRejection(error)) return "Transaction cancelled by user";
    if (errorMsg.includes("insufficient funds") || errorMsg.includes("insufficient balance")) {
      return "Insufficient balance for this transaction";
    }
    if (errorMsg.includes("ERC20: transfer amount exceeds balance")) {
      return "Insufficient token balance";
    }
    if (errorMsg.includes("ERC20: insufficient allowance")) {
      return "Please approve tokens first";
    }
    if (errorMsg.includes("unSufficient Amount") || errorMsg.includes("Insufficient staked amount")) {
      return "Insufficient staked amount to withdraw";
    }
    if (errorMsg.includes("amount below minimumStake")) {
      return "Amount is below minimum staking requirement";
    }
    if (error?.shortMessage) return error.shortMessage;
    return defaultMessage;
  };

  // Approve tokens for staking
  const approveTokens = async (amount) => {
    if (!account || !isConnected) {
      toast.error("Please connect your wallet first");
      return false;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return false;
    }

    setIsLoading(true);
    try {
      const amountWei = parseEther(amount.toString());
      const hash = await writeContractAsync({
        address: contractAddress.stakeToken,
        abi: StakeToken_ABI,
        functionName: "approve",
        args: [contractAddress.staking, amountWei],
      });

      setCurrentTxHash(hash);
      toast.info("Approval transaction submitted. Waiting for confirmation...");
      return true;
    } catch (error) {
      if (!isUserRejection(error)) {
        console.error("Approve error:", error);
      }
      const errorMessage = getErrorMessage(error, "Failed to approve tokens");
      toast.error(errorMessage);
      setIsLoading(false);
      return false;
    }
  };

  // Stake tokens
  const stakeTokens = async (amount) => {
    if (!account || !isConnected) {
      toast.error("Please connect your wallet first");
      return false;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount to stake");
      return false;
    }

    if (parseFloat(amount) > parseFloat(tokenBalance)) {
      toast.error(`Insufficient balance. You have ${tokenBalance} tokens`);
      return false;
    }

    setIsLoading(true);
    try {
      const amountWei = parseEther(amount.toString());
      const hash = await writeContractAsync({
        address: contractAddress.staking,
        abi: Staking_ABI,
        functionName: "stake",
        args: [amountWei],
      });

      setCurrentTxHash(hash);
      toast.info("Stake transaction submitted. Waiting for confirmation...");
      return true;
    } catch (error) {
      if (!isUserRejection(error)) {
        console.error("Stake error:", error);
      }
      const errorMessage = getErrorMessage(error, "Failed to stake tokens");
      toast.error(errorMessage);
      setIsLoading(false);
      return false;
    }
  };

  // Withdraw tokens
  const withdrawToken = async (amount) => {
    if (!account || !isConnected) {
      toast.error("Please connect your wallet first");
      return false;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount to withdraw");
      return false;
    }

    if (parseFloat(amount) > parseFloat(stakedAmount)) {
      toast.error(`Insufficient staked amount. You have ${stakedAmount} staked`);
      return false;
    }

    setIsLoading(true);
    try {
      const amountWei = parseEther(amount.toString());
      const hash = await writeContractAsync({
        address: contractAddress.staking,
        abi: Staking_ABI,
        functionName: "withdraw",
        args: [amountWei],
      });

      setCurrentTxHash(hash);
      toast.info("Withdraw transaction submitted. Waiting for confirmation...");
      return true;
    } catch (error) {
      if (!isUserRejection(error)) {
        console.error("Withdraw error:", error);
      }
      const errorMessage = getErrorMessage(error, "Failed to withdraw tokens");
      toast.error(errorMessage);
      setIsLoading(false);
      return false;
    }
  };

  // Claim rewards
  const claimRewards = async () => {
    if (!account || !isConnected) {
      toast.error("Please connect your wallet first");
      return false;
    }

    if (parseFloat(pendingRewards) <= 0) {
      toast.info("No rewards available to claim");
      return false;
    }

    setIsLoading(true);
    try {
      const hash = await writeContractAsync({
        address: contractAddress.staking,
        abi: Staking_ABI,
        functionName: "claimRewards",
      });

      setCurrentTxHash(hash);
      toast.info("Claim transaction submitted. Waiting for confirmation...");
      return true;
    } catch (error) {
      if (!isUserRejection(error)) {
        console.error("Claim error:", error);
      }
      const errorMessage = getErrorMessage(error, "Failed to claim rewards");
      toast.error(errorMessage);
      setIsLoading(false);
      return false;
    }
  };

  const needsApproval = (amount) => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) return false;
    return parseFloat(allowance) < parseFloat(amount);
  };

  return {
    // Data
    tokenBalance,
    stakedAmount,
    pendingRewards,
    totalStaked,
    apy,
    allowance,
    lastUpdated,

    // Actions
    stakeTokens,
    approveTokens,
    withdrawToken,
    claimRewards,
    fetchStakingData,
    needsApproval,

    // Status
    isLoading: isLoading || isConfirming,
    isConfirming,
    isConfirmed,
    currentTxHash,
  };
};

export default useStaking;
