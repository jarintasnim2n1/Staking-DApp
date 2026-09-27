"use client";
import { useCallback, useEffect, useState } from "react";
import { parseEther, formatEther } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { toast } from "react-toastify";
import { contractAddress } from "../utils/contractAddress";
import { Staking_ABI, StakeToken_ABI } from "../utils/Abi";

export const useAdmin = () => {
  const { address: account, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [currentTxHash, setCurrentTxHash] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [txStatus, setTxStatus] = useState(null);
  const [txMessage, setTxMessage] = useState("");

  // Read contract owner
  const { data: ownerAddress, refetch: refetchOwner } = useReadContract({
    address: contractAddress.staking,
    abi: Staking_ABI,
    functionName: "owner",
    query: {
      enabled: isConnected,
    },
  });

  // Read minimum stake
  const { data: currentMinStakeRaw, refetch: refetchMinStake } = useReadContract({
    address: contractAddress.staking,
    abi: Staking_ABI,
    functionName: "minimumStake",
    query: {
      enabled: isConnected,
    },
  });

  // Read reward rate
  const { data: currentRewardRateRaw, refetch: refetchRewardRate } = useReadContract({
    address: contractAddress.staking,
    abi: Staking_ABI,
    functionName: "rewardRate",
    query: {
      enabled: isConnected,
    },
  });

  // Read owner's reward token balance
  const { data: ownerRewardBalanceRaw, refetch: refetchOwnerBalance } = useReadContract({
    address: contractAddress.stakeToken,
    abi: StakeToken_ABI,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    query: {
      enabled: !!account && isConnected,
    },
  });

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: currentTxHash,
    });

  // Check if current user is owner
  const isOwner =
    !!ownerAddress && !!account &&
    ownerAddress.toLowerCase() === account.toLowerCase();

  // Handle confirmation
  useEffect(() => {
    if (isConfirming) {
      setTxMessage("Waiting for blockchain confirmation...");
      setTxStatus("pending");
    } else if (isConfirmed) {
      setTxMessage("Transaction confirmed successfully!");
      setTxStatus("success");
      setIsLoading(false);
      setCurrentTxHash(null);
      fetchRewardData();
    }
  }, [isConfirmed, isConfirming]);

  const handleTransactionError = (error, defaultMsg) => {
    console.error("Transaction error:", error);
    const msg = error?.message || error?.shortMessage || "";

    let userFriendlyMsg = defaultMsg;
    if (msg.toLowerCase().includes("user rejected") || msg.toLowerCase().includes("denied") || error?.code === 4001) {
      userFriendlyMsg = "Transaction cancelled by user";
    } else if (msg.toLowerCase().includes("insufficient funds")) {
      userFriendlyMsg = "Insufficient funds for gas or transaction";
    } else if (msg.toLowerCase().includes("gas required exceeds")) {
      userFriendlyMsg = "Transaction may fail - check inputs";
    } else if (error?.shortMessage) {
      userFriendlyMsg = error.shortMessage;
    }

    setTxStatus("error");
    setTxMessage(userFriendlyMsg);
    toast.error(userFriendlyMsg);
    setIsLoading(false);
    return false;
  };

  const validateOwnerAction = () => {
    if (!account || !isConnected) {
      const msg = "Please connect your wallet first";
      setTxMessage(msg);
      setTxStatus("error");
      toast.error(msg);
      return false;
    }
    if (!isOwner) {
      const msg = "Only the contract owner can perform this action";
      setTxMessage(msg);
      setTxStatus("error");
      toast.error(msg);
      return false;
    }
    return true;
  };

  // Set Reward Rate
  const setRewardRate = async (newRate) => {
    if (!validateOwnerAction()) return false;
    if (!newRate || parseFloat(newRate) <= 0) {
      const msg = "Please enter a valid reward rate";
      setTxStatus("error");
      setTxMessage(msg);
      toast.error(msg);
      return false;
    }

    setIsLoading(true);
    setTxStatus("pending");
    setTxMessage("Setting reward rate...");

    try {
      const rateWei = parseEther(newRate.toString());
      const hash = await writeContractAsync({
        address: contractAddress.staking,
        abi: Staking_ABI,
        functionName: "setRewardRate",
        args: [rateWei],
      });
      setCurrentTxHash(hash);
      toast.info("Reward rate update submitted. Waiting for confirmation...");
      return true;
    } catch (error) {
      return handleTransactionError(error, "Failed to set reward rate");
    }
  };

  // Set Minimum Stake
  const setMinimumStake = async (amount) => {
    if (!validateOwnerAction()) return false;
    if (!amount || parseFloat(amount) <= 0) {
      const msg = "Please enter a valid minimum stake amount";
      setTxStatus("error");
      setTxMessage(msg);
      toast.error(msg);
      return false;
    }

    setIsLoading(true);
    setTxStatus("pending");
    setTxMessage("Setting minimum stake...");

    try {
      const amountWei = parseEther(amount.toString());
      const hash = await writeContractAsync({
        address: contractAddress.staking,
        abi: Staking_ABI,
        functionName: "setMinimumStake",
        args: [amountWei],
      });
      setCurrentTxHash(hash);
      toast.info("Minimum stake update submitted. Waiting for confirmation...");
      return true;
    } catch (error) {
      return handleTransactionError(error, "Failed to set minimum stake");
    }
  };

  // Deposit Reward Tokens
  const depositRewardTokens = async (amount) => {
    if (!validateOwnerAction()) return false;
    if (!amount || parseFloat(amount) <= 0) {
      const msg = "Please enter a valid deposit amount";
      setTxStatus("error");
      setTxMessage(msg);
      toast.error(msg);
      return false;
    }

    const currentBal = ownerRewardBalanceRaw ? formatEther(ownerRewardBalanceRaw) : "0";
    if (parseFloat(amount) > parseFloat(currentBal)) {
      const msg = `Insufficient token balance. You have ${currentBal} tokens`;
      setTxStatus("error");
      setTxMessage(msg);
      toast.error(msg);
      return false;
    }

    setIsLoading(true);
    setTxStatus("pending");
    setTxMessage("Depositing reward tokens...");

    try {
      const amountWei = parseEther(amount.toString());

      // Approve if needed, then deposit
      const approveHash = await writeContractAsync({
        address: contractAddress.stakeToken,
        abi: StakeToken_ABI,
        functionName: "approve",
        args: [contractAddress.staking, amountWei],
      });

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      const depositHash = await writeContractAsync({
        address: contractAddress.staking,
        abi: Staking_ABI,
        functionName: "depositeRewardToken",
        args: [amountWei],
      });

      setCurrentTxHash(depositHash);
      toast.info("Reward tokens deposit submitted. Waiting for confirmation...");
      return true;
    } catch (error) {
      return handleTransactionError(error, "Failed to deposit reward tokens");
    }
  };

  // Emergency Withdraw
  const emergencyWithdraw = async (tokenAddress, amount) => {
    if (!validateOwnerAction()) return false;
    if (!amount || parseFloat(amount) <= 0) {
      const msg = "Please enter a valid amount";
      setTxStatus("error");
      setTxMessage(msg);
      toast.error(msg);
      return false;
    }
    if (!tokenAddress) {
      const msg = "Token address is required";
      setTxStatus("error");
      setTxMessage(msg);
      toast.error(msg);
      return false;
    }

    setIsLoading(true);
    setTxStatus("pending");
    setTxMessage("Emergency withdrawing tokens...");

    try {
      const amountWei = parseEther(amount.toString());
      const hash = await writeContractAsync({
        address: contractAddress.staking,
        abi: Staking_ABI,
        functionName: "emergencyWithdraw",
        args: [tokenAddress, amountWei],
      });
      setCurrentTxHash(hash);
      toast.info("Emergency withdrawal submitted. Waiting for confirmation...");
      return true;
    } catch (error) {
      return handleTransactionError(error, "Failed to emergency withdraw");
    }
  };

  const clearTxStatus = () => {
    setTxStatus(null);
    setTxMessage("");
    setCurrentTxHash(null);
  };

  const fetchRewardData = useCallback(async () => {
    if (!isConnected) return;
    try {
      await Promise.all([
        refetchOwner(),
        refetchRewardRate(),
        refetchMinStake(),
        refetchOwnerBalance(),
      ]);
    } catch (error) {
      console.error("Error fetching admin data:", error);
    }
  }, [isConnected, refetchOwner, refetchRewardRate, refetchMinStake, refetchOwnerBalance]);

  return {
    isOwner,
    owner: ownerAddress,
    currentRewardRate: currentRewardRateRaw ? formatEther(currentRewardRateRaw) : "0",
    currentMinStake: currentMinStakeRaw ? formatEther(currentMinStakeRaw) : "0",
    ownerRewardBalance: ownerRewardBalanceRaw ? formatEther(ownerRewardBalanceRaw) : "0",
    isLoading: isLoading || isConfirming,
    isConfirming,
    isConfirmed,
    txStatus,
    txMessage,
    currentTxHash,
    setRewardRate,
    setMinimumStake,
    depositRewardTokens,
    emergencyWithdraw,
    clearTxStatus,
    fetchRewardData,
  };
};

export default useAdmin;