"use client"
import React, { useCallback, useEffect, useState } from 'react'
import { useConnect, usePublicClient, useReadContract, useWriteContract } from 'wagmi'
import { StakeToken_ABI, Staking_ABI } from '../utils/abi';
import { ToastContainer, toast } from 'react-toastify';
import { parseEther } from 'viem';
const useStakng = () => {
    const {address:account, isConnected}=useConnect();
    const publicClient= usePublicClient();
    const {writeContractAsync}=useWriteContract();

    const [tokenBalance, setTokenBalance]=useState(0);
    const [stakedAmount, setStakedAmount]=useState(0);
    const [pendingRewards, setPendingRewards]=useState(0);
    const [totalStaked, setTotalStaked]=useState(0);
    const [apy, setApy]=useState(0);
    const [allowance, setAllowance] = useState("0");
    const [isLoading, setIsLoading]=useState(false);
    const [currentTxHash, setCurrentTxHash]=useState(null);
    const [lastUpdated, setLastUpdated]=useState(()=>Date.now());
 //read function
    //read token balance
    const {data: balanceData, refetch:refetchBalance}=useReadContract({
        address: contractAddress.stakeToken,
        abi:StakeToken_ABI,
        functionName:"balanceOf",
        args: account? [account]: undefined,
        query:{
            enabled: !!account && isConnected,
        }
    });

    //read stake info
 const {data:stakeInfoData, refetch:refetchStakeInfo}=useReadContract({
    address: contractAddress.staking,
    abi:Staking_ABI,
    functionName:"getStakeInfo",
    args:account?[account]:undefined,
    query:{
        enabled:!!account && isConnected
    }
 });

 //read total stake
 const {data:totalStake, refetch:refetchTotalStake}=useReadContract({
    address: contractAddress.staking,
    abi:Staking_ABI,
    functionName:"getTotakStake",
    query:{
        enabled:!!account && isConnected
    }
 });

 //read apy 
const {data:apyData, refetch:refetchApy}=useReadContract({
    address: contractAddress.staking,
    abi:Staking_ABI,
    functionName:"getApy",
    query:{
        enabled:!!account && isConnected
    }
 });

 const {data:allowanceData, refetch: refetchAllowance}=useReadContract({
 address: contractAddress.stakeToken,
        abi:StakeToken_ABI,
        functionName:"allowance",
        args: account? [account, contractAddress.stakeToken]: undefined,
        query:{
            enabled: !!account && isConnected,
        }
 });
 //wait for transaction receipt
 const{isLoading:isConfirming, isSuccess:isConfirmed}=useWaiteForTransactionReceipt({
    hash:currentTxHash,
 })
//update state when data changes
useEffect(()=>{
    if(balanceData){
        setTokenBalance(formatEher(balanceData));
        setLastUpdated(Date.now());
    }
},[balanceData]);
useEffect(()=>{
if(stakeInfoData){
    const stakeAmt=stakeInfoData.stakedAmount || stakeInfoData[0] ||0n;
    const rewards=stakeInfoData.pendingRewards || stakeInfoData[1] ||0n;
    setStakedAmount(stakeAmt);
    setPendingRewards(rewards);
    setLastUpdated(Date.now());
}
},[stakeInfoData]);

  useEffect(() => {
    if (allowanceData) {
      setAllowance(formatEther(allowanceData));
    }
  }, [allowanceData]);
useEffect(()=>{
    if(totalStake){
        setTotalStaked(formatEther(totalStake));
        setLastUpdated(Date.now());
    }
},[totalStake]);

useEffect(()=>{
    if(apyData){
        setApy((Number(apyData)/100).toFixed(2));
    }
},[apyData]);

useEffect(()=>{
    if(isConfirmed){
     setIsLoading(false);
     fetchStakingData();
    }
},[isConfirmed,fetchStakingData]);

//fetch all staking data
const fetchStakingData=useCallback(async()=>{
    if(!isConnected || !account)return ;

    try{
        await Promise.all([
            refetchStakeInfo(),
            refetchBalance(),
            refetchTotalStake(),
            refetchApy(),
            refetchAllowance(),
        ])
    }catch(error){
        console.error("Error feteching staking data:",error);
    }
},[account, isConnected, refetchStakeInfo,refetchAllowance,refetchBalance,refetchTotalStake,refetchApy]);

useEffect(()=>{
    if(!isConnected)return;
    const interval= setInterval(()=>{
        refetchStakeInfo();
    },3000);
    return ()=>clearInterval(interval);
},[isConnected, refetchStakeInfo]);

  const isUserRejection = (error) => {
    const errorMessage = error.message || error.shortMessage || "";
    return (
      errorMessage.includes("User rejected") ||
      errorMessage.includes("User denied") ||
      errorMessage.includes("user rejected") ||
      errorMessage.includes("denied transaction") ||
      error.code === 4001 ||
      error.code === "ACTION_REJECTED"
    );
  };

  const getErrorMessage = (error, defaultMessage) => {
    const errorMsg = error.message || error.shortMessage || "";

    // User rejected
    if (isUserRejection(error)) {
      return "Transaction cancelled by user";
    }

    // Insufficient balance
    if (
      errorMsg.includes("insufficient funds") ||
      errorMsg.includes("insufficient balance")
    ) {
      return "Insufficient balance for this transaction";
    }

    // Insufficient gas
    if (
      errorMsg.includes("insufficient funds for gas") ||
      errorMsg.includes("gas required exceeds")
    ) {
      return "Insufficient ETH for gas fees";
    }

    // Invalid amount
    if (
      errorMsg.includes("invalid amount") ||
      errorMsg.includes("amount must be greater")
    ) {
      return "Invalid amount entered";
    }

    // Not enough tokens to stake
    if (errorMsg.includes("ERC20: transfer amount exceeds balance")) {
      return "Insufficient token balance";
    }
   // Approval required
    if (errorMsg.includes("ERC20: insufficient allowance")) {
      return "Please approve tokens first";
    }
    // Not enough staked to withdraw
    if (
      errorMsg.includes("Insufficient staked amount") ||
      errorMsg.includes("withdraw amount exceeds")
    ) {
      return "Insufficient staked amount to withdraw";
    }
    // Contract error
    if (errorMsg.includes("execution reverted")) {
      return "Transaction failed: Contract error";
    }

    // Network error
    if (errorMsg.includes("network") || errorMsg.includes("connection")) {
      return "Network error. Please check your connection";
    }

    // Gas estimation failed
    if (errorMsg.includes("gas estimation failed")) {
      return "Transaction would fail. Please check your balance";
    }

    // Nonce too low
    if (errorMsg.includes("nonce too low")) {
      return "Transaction nonce error. Please try again";
    }

    // Replacement transaction underpriced
    if (errorMsg.includes("replacement transaction underpriced")) {
      return "Previous transaction pending. Please wait";
    }

    // Default message with short error if available
    if (error.shortMessage && error.shortMessage !== errorMsg) {
      return error.shortMessage;
    }

    return defaultMessage;
  };

//write function
 // Approve tokens for staking
  const approveTokens = async (amount) => {
    if (!account || !isConnected) {
     toast(null, "Please connect your wallet first");
      
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast(null, "Please enter a valid amount");
     
    }
    setIsLoading(true);

    try {
      const amountWei = parseEther(amount.toString());

      const hash = await writeContractAsync({
        address: contractAddresses.stakeToken,
        abi: StakeToken_ABI,
        functionName: "approve",
        args: [contractAddresses.staking, amountWei],
      });

      setCurrentTxHash(hash);
     
      return true;
    } catch (error) {
      if (!isUserRejection(error)) {
        console.error("Approve error:", error);
      }
      const errorMessage = getErrorMessage(error, "Failed to approve tokens");
      setIsLoading(false);
      
    }
  };
  //stake token
 const stakeTokens= async(amount)=>{
    if(!account || !isConnected){
      toast("Please connect your wallet first");
    }

    if(!amount || parseFloat(amount)<=0){
        toast("Enter valid amount");
    }
    if(parseFloat(amount)>parseFloat(tokenBalance)){
        toast(`Insufficent balance. Youhave ${parseFloat(tokenBalance)}`);
    }
setIsLoading(true);
    try{
        const amountWei= parseEther(amount.toString());
        const hash=await writeContractAsync({
            address: contractAddress.staking,
             abi:Staking_ABI,
             functionName:"stake",
             args:[amountWei],
        });
        setCurrentTxHash(hash);
    }
    catch(error){
        if(!isUserRejection(error)){
            console.error("Stake error:", error);
        }
        const errorMessage=getErrorMessage(error,"Failed to stake tokens");
        setIsLoading(false);
    }
 } 
 const withdrawToken=async(amount)=>{
   if(!account || !isConnected){
      toast("Please connect your wallet first");
    }

    if(!amount || parseFloat(amount)<=0){
        toast("Enter valid amount");
    }
    if(parseFloat(amount)>parseFloat(stakedAmount)){
        toast(`Insufficent balance. Youhave ${parseFloat(stakedAmount)}`);
    }
setIsLoading(true);
    try{
        const amountWei= parseEther(amount.toString());
        const hash= await writeContractAsync({
             address: contractAddress.staking,
             abi:Staking_ABI,
             functionName:"withdraw",
             args:[amountWei],
        });
        setCurrentTxHash(hash);
    }catch(error){
  if(!isUserRejection(error)){
            console.error("Withdraw error:", error);
        }
        const errorMessage=getErrorMessage(error,"Failed to stake tokens");
        setIsLoading(false);
    }
 }

 const claimRewards=async()=>{
      if(!account || !isConnected){
      toast("Please connect your wallet first");
    }

    if( parseFloat(pendingRewards)<=0){
        toast("no reward to claim");
    }
     setIsLoading(true);

     try{
        const hash= await WriteContractAsync({
            address: contractAddress.staking,
             abi:Staking_ABI,
             functionName:"claimRewards",
            
        });
         setCurrentTxHash(hash);
     }catch(error){
  if(!isUserRejection(error)){
            console.error("claim error:", error);
        }
        const errorMessage=getErrorMessage(error,"Failed to claim rewards");
        setIsLoading(false);
    }
 }
const needsApproval = (amount) => {
    if (!amount || isNaN(amount)) return false;
    return parseFloat(allowance) < parseFloat(amount);
  };
  return (
   //Data
   tokenBalance,
   stakedAmount,
   pendingRewards,
   totalStaked,
   apy,
   lastUpdated,

   //actions 
   stakeTokens,
   approveTokens,
   withdrawToken,
   claimRewards,
   fetchStakingData,
   needsApproval,
//status 
isLoading
  );
}

export default useStakng