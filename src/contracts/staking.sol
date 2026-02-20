// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;
//0xD7ACd2a9FD159E69Bb102A1ca21C9a3e3A5F771B
// import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Staking is  ReentrancyGuard, Ownable  {
 using SafeERC20 for IERC20;

 IERC20 public stakeToken;
 IERC20 public rewardToken;

 uint256 public totalStaked;
 uint256 public rewardRate;
 uint256 public lastUpdatedTime;
 uint256 public rewardPerTokenStored;
 uint256 public  minimumStake;
 uint256 public stakeCount;

struct UserInfo{
    uint256 stakeAmount;
    uint256 rewardDebt;
    uint256 rewards;
    uint256 lastStakedTime;
}

 mapping(address =>UserInfo) public userInfo;
 mapping(address => uint256) public userRewardPerTokenPaid;

 event staked(address indexed user, uint256 amount);
 event withdrawn(address indexed user, uint256 amount);
 event claimedReward(address indexed user, uint256 amount);
 event rewardRateUpdated(uint256 newRewardRate);

 constructor (address _stakeToken, address _rewardToken, uint256 _rewardRate) Ownable(msg.sender){
   stakeToken= IERC20(_stakeToken);
   rewardToken= IERC20(_rewardToken);
   rewardRate= _rewardRate;
   minimumStake= 1*10**18;
   lastUpdatedTime=block.timestamp;
 }
 // reward update
modifier updatedReward(address account) {
    rewardPerTokenStored= rewardPerToken();
    lastUpdatedTime= block.timestamp;

    if(account != address(0)){
        userInfo[account].rewards=earned(account);
        userRewardPerTokenPaid[account]=rewardPerTokenStored;
    }
    _;
}
// per token reward
 function rewardPerToken() public view returns(uint256) {
  if(totalStaked==0)return rewardPerTokenStored;

  return rewardPerTokenStored +((block.timestamp- lastUpdatedTime)*rewardRate *1e18)/totalStaked;
 }
// check specific account earned reward
 function earned(address account) public view returns(uint256){
    UserInfo storage user= userInfo[account];

    return (user.stakeAmount *(rewardPerToken()- userRewardPerTokenPaid[account]))/1e18 +user.rewards;
 }
// stake token 
 function stake(uint256 amount) external nonReentrant updatedReward(msg.sender) {
  require(amount >=minimumStake,"amount below minimumStake");
  UserInfo storage user=userInfo[msg.sender];
 stakeToken.safeTransferFrom(msg.sender, address(this), amount );
  user.stakeAmount +=amount;
  user.lastStakedTime= block.timestamp;
  totalStaked += amount;

  stakeCount++;
 }
 // withdraw amount 
 function withdraw(uint256 amount) external nonReentrant updatedReward(msg.sender){
  UserInfo storage user = userInfo[msg.sender];
  require(amount<=user.stakeAmount, "unSufficient Amount");

  user.stakeAmount -=amount;
  user.lastStakedTime= block.timestamp;
  totalStaked -=amount;
  stakeToken.safeTransfer(msg.sender, amount);
  emit staked(msg.sender, amount);
 }
// claim reward
 function claimRewards() external nonReentrant updatedReward(msg.sender){
  UserInfo storage user = userInfo[msg.sender];
  uint256 reward= user.rewards;
  require(reward>0, "no reward to  claim");
  user.rewards=0;
  rewardToken.safeTransfer(msg.sender, reward);

  emit claimedReward(msg.sender, reward);
 }
//exit the staking operation with withdraw stake amount and pending reward
 function exit() external {
    UserInfo storage user= userInfo[msg.sender];
    uint256 stakedAmount= user.stakeAmount;

    if(stakedAmount>0){
        this.withdraw(stakedAmount);
    }
    this.claimRewards();
 }
// stake info 
 function getStakeInfo (address account) external view returns(uint256 stakeAmount, uint256 pendingRewards,uint256 lastStakedTime){
    UserInfo storage user = userInfo[account];
    return ( user.stakeAmount, earned(account), user.lastStakedTime);
 }
 //get annual percentage yearly
 function getApy() public view returns(uint256){
    if(totalStaked ==0)return 0;
   uint256 annualReward = rewardRate *365*24*60*60;
   return (annualReward*10000)/totalStaked;
 }
 //get total stake
 function getTotakStake() external view returns(uint256){
   return stakeCount;
 }
 
//owner set reward rate
 function setRewardRate(uint256 newRate) external onlyOwner updatedReward(address(0)){
  rewardRate= newRate;
  emit rewardRateUpdated(newRate);
 }
 // owner set minimum stake
 function setMinimumStake(uint256 amount) external onlyOwner{
    minimumStake= amount;
 }
//reward token diposite
 function depositeRewardToken(uint256 amount) external onlyOwner {
    rewardToken.safeTransferFrom(msg.sender, address(this), amount);
 }
//emergency withdraw only owner 
 function emergencyWithdraw(address token, uint256 amount) external onlyOwner{
    IERC20(token).safeTransfer(owner(), amount);
 }
}