// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract StakeToken is ERC20, Ownable {
    constructor() ERC20("Stake Token", "STK") Ownable(msg.sender){
      _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    function mint(address to , uint256 amount )  external onlyOwner {
     _mint(to, amount);
    }
}
//0xf8e81D47203A594245E36C48e151709F0C19fBe8
