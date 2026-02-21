import { parse } from 'next/dist/build/swc/generated-native';
import React, { useEffect, useState } from 'react'
import { parseEther,parseFloat } from 'viem';
import { useConnect,usePublicClient,useReadContract, useWriteContract } from 'wagmi'

const useAdmin = () => {
 const {address: account, isConnected}=useConnect();
 const {writeContractAsync}=useWriteContract();

//  const [rewardRate, setRewardRate]=useState(0);
//  const [minStake, setMinStake]=useState(0);
//  const [depositAmount, setDepositAmount]=useState(0);
//  const [emergencyAddress, setEmergencyAddress]=useState("");
//  const [emergencyToken, setEmergencyToken]=useState("");
//  const [emergencyAmount, setEmergencyAmount]=useState(0);
 const [currentTxHash, setCurrentTxHash] = useState(null);
//  const [isOwner, setOwner]=useState(false);
 const [isLoading, setLoading]=useState(false);
 const [txStatus, setTxStatus]=useState(null);
 const [txMessage, setTxMessage]=useState("");
 const publicClient= usePublicClient();

 // read function
 const {data:owner}=useReadContract({
    address:contractAddress.staking,
        abi:Staking_ABI,
        functionName: "owner",
         query: {
      enabled: isConnected,
    },
 });

 const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: currentTxHash,
    });

 const {data:currentMinStake, refetch: refetchMinStake }= useReadContract({
    address:contractAddress.staking,
        abi:Staking_ABI,
        functionName: "minimumStake",
         query: {
      enabled: isConnected,
    },
 })

 const {data:currentRewardRate, refetch: refetchRewardRate }= useReadContract({
    address:contractAddress.staking,
        abi:Staking_ABI,
        functionName: "rewardRate",
         query: {
      enabled: isConnected,
    },
 })

//check current user is owner 
 const isOwnered = owner && account 
    ? owner.toLowerCase() === account.toLowerCase() 
    : false;

//handle transaction confirmation status
useEffect(()=>{
  if(isConfirming){
    setTxMessage("Waiting for confirmation...");
    return;
  }
  if(isConfirmed){
    setTxMessage("Transaction confirmed!");
    setTxStatus("success");
    setLoading(false);
    return;
  }

},[isConfirmed, isConfirming]);

//write function
const setRewardRate=async(newRate)=>{
if(!validateOwnerAction()){
  return false;
}

if(!newRate || parseFloat(newRate)<=0){
  setTxStatus("error");
  setTxMessage("Enter valid amount");
  return false;

}

setLoading(true);
setTxStatus("pending");
setTxMessage("Setting reward rate..");

try{
const rateWei= parseEther(newRate.toString());
const hash= await writeContractAsync({
  address:contractAddress.staking,
        abi:Staking_ABI,
        functionName: "setRewardRate",
        args:[rateWei]
});
setCurrentTxHash(hash);
setTxMessage(`Reward rate set to ${rateWei} tokens per seceond`);
return true;
}catch(error){
return handleTransactionError(error, "Failed to set reward rate!");
}
}
// set minimun stake
const setMinimumStake=async(amount)=>{
if(!validateOwnerAction())return false;
if(!amount || parseFloat(amount)<=0){
  setTxStatus("error");
   setTxMessage("Enter valid amount");
  return false;
}
setLoading(true);
 setTxStatus("pending");
    setTxMessage("Setting minimum stake...");
try{
  const amountWei= parseEther(amount.toString());
const hash = await writeContractAsync({
   address:contractAddress.staking,
        abi:Staking_ABI,
        functionName: "setMinimumStake",
        args:[amountWei]
});
setCurrentTxHash(hash);
  setTxMessage(`Minimum stake set to ${amount} tokens`);
      return true;
}catch(error){
  return handleTransactionError(error, "Failed to set minimum stake!");
}
}
//deposit reward token
const depositRewardTokens=async (amount)=>{
  if(!validateOwnerAction())return false;
  if(!amount || parseFloat(amount)<=0){
  setTxStatus("error");
   setTxMessage("Enter valid amount");
  return false;
}
//first check if owner enough reward token
const {data:ownerRewardBalance}=await useReadContract({
 address: contractAddress.stakeToken,
        abi:StakeToken_ABI,
        functionName:"balanceOf",
        args: account? [account]: undefined,
        query:{
            enabled: !!account && isConnected,
        }
});
if(ownerRewardBalance<parseEther(amount.toString())){
  setTxStatus("error");
  setTxMessage("Insufficentreward token balance");
  setLoading(false);
  return false;
}
setLoading(true);
 setTxStatus("pending");
    setTxMessage("Depositing reward tokens...");

    try{
const amountWei= parseEther(amount.toString());
//first approve staking cintract to spend reward token
const approveHash=await writeContractAsync({
  address: contractAddress.stakeToken,
        abi:StakeToken_ABI,
        functionName:"approve",
        args: [contractAddress.staking, amountWei],
        query:{
            enabled: !!account && isConnected,
        }
});
// await publicClient.waitForTransactionReceipt({
//   hash:approveHash
// });
setCurrentTxHash(approveHash);
return true;

    }catch(error){
      return handleTransactionError(error, "Failed to deposit reward tokens");
    }
}
useEffect(()=>{
  if(isConfirmed && txMessage.include("Approval")){
    executeDeposit();
  }
},[isConfirmed]);
const executeDeposit=async()=>{
  try{
   const amount="0";
   const amountWei=parseEther(amount);
   const hash= await writeContractAsync({
  address:contractAddress.staking,
        abi:Staking_ABI,
        functionName: "depositeRewardToken",
        args:[amountWei]
});
setCurrentTxHash(hash);
setTxMessage(`Successfully deposited ${amount} reward tokens`);
      return true;
    }catch(error){
      return handleTransactionError(error, "Failed to deposit reward tokens");
    } 
  }
}
//Emergency withdraw token 
const emergencyWithdraw= async(tokenAddress, amount)=>{
if(!validateOwnerAction())return false;
if(!amount || parseFloat(amount)<=0){
  setTxStatus("error");
   setTxMessage("Enter valid amount");
  return false;
}
if(!tokenAddress){
  setTxStatus("error");
      setTxMessage("Token address is required");
      return false;
}
setLoading(true);
    setTxStatus("pending");
    setTxMessage("Emergency withdrawing tokens...");
try{
 const amountWei= parseEther(amount.toString());
 const hash= await writeContractAsync({
   address:contractAddress.staking,
        abi:Staking_ABI,
        functionName: "emergencyWithdraw",
        args:[tokenAddress,amountWei]
 });
 setCurrentTxHash(hash);
  setTxMessage(`Emergency withdrawn ${amount} tokens`);
      return true;
}catch(error){
  handleTransactionError(error, "Failed to emergency withdraw");
}
}
//handle transaction error
const handleTransactionError=(error, defaultMsg)=>{
  console.error("Transaction error:", error);
  
  //user rejected transaction
  if(error.message?.include("user rejectted") || error.code==4001){
    setTxStatus("error");
    setTxMessage("Transaction rejected by user");

  }

  //Insufficient balance
  else if(error.message?.include("insufficent funds")){
     setTxStatus("error");
    setTxMessage("Insufficent funds for transaction");
  }
  //gas estimated failed
  else if(error.message?.include("gas required exceeds")){
     setTxStatus("error");
      setTxMessage("Transaction may fail - check your inputs");
  }

  else{
    setTxStatus("error");
    setTxMessage(error.shortMessage|| error.message || defaultMsg);
  }
  setLoading(false);
  return false;
}
//validate if user is connected and is owner
const validateOwnerAction=()=>{
  if(!account || !isConnected){
    setTxMessage("Wallet not connect!");
    setTxStatus(false);
    return false;
  }
  if(!isOwner){
    setTxStatus("error");
    setTxMessage("Only owner can access");
    return false;
  }
  return true;
}
const clearTxStatus=()=>{
  setTxStatus(null);
  setTxMessage("");
  setCurrentTxHash(null);
}
//format data 
const formatRewardRate=(rate)=>{
  if(!rate)return "0";
  return formatEther(rate);
}
const formatMinimumStake=(amount)=>{
  if(!amount)return "0";
  return formatEther(amount);
}
 const fetchRewardData=useCallback(async()=>{
     if(!isConnected || !owner)return ;
 
     try{
         await Promise.all([
            refetchRewardRate(),
            refetchMinStake()
         ])
     }catch(error){
         console.error("Error feteching staking data:",error);
     }
 },[ isConnected, owner,refetchRewardRate,refetchMinStake ]);
 
  return (
  isOwner,
  owner,
  currentRewardRate: currentRewardRate ? formatRewardRate(currentRewardRate) : "0",
  currentMinStake: currentMinStake ? formatMinimumStake(currentMinStake) : "0",
  ownerRewardBalance: ownerRewardBalance ? formatEther(ownerRewardBalance) : "0",
  isLoading: isLoading || isConfirming,
  txStatus,
  txMessage,
  setRewardRate,
  setMinimumStake,
  depositRewardTokens,
  emergencyWithdraw,
  clearTxStatus,
  fetchRewardData,
  )
}

export default useAdmin