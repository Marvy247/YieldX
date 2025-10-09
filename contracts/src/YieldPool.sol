// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "./AgentFactory.sol";

/**
 * @title YieldPool
 * @dev A simple staking pool for the Autonomous Agent demo.
 * Users can deposit and withdraw a specific ERC20 token.
 * The owner can set a "reward rate", which simulates the pool's APY for the agent to read.
 * This contract does not handle actual reward distribution to keep it simple for the hackathon.
 */
contract YieldPool is Ownable {
    IERC20 public immutable stakingToken;
    AgentFactory public immutable agentFactory;
    uint256 public rewardRate;

    mapping(address => uint256) public balanceOf;
    uint256 public totalSupply;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardRateChanged(uint256 newRate);

    constructor(address _stakingTokenAddress, address initialOwner, address _agentFactory) Ownable(initialOwner) {
        stakingToken = IERC20(_stakingTokenAddress);
        agentFactory = AgentFactory(_agentFactory);
    }

    /**
     * @dev Deposits the staking token into the pool.
     * Assumes the tokens have been transferred to the pool already.
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "Deposit amount must be greater than 0");
        balanceOf[_msgSender()] += amount;
        totalSupply += amount;
        // stakingToken.transferFrom(_msgSender(), address(this), amount);
        emit Deposited(_msgSender(), amount);
    }

    /**
     * @dev Withdraws the staking token from the pool.
     */
    function withdraw(uint256 amount) external {
        uint256 userBalance = balanceOf[_msgSender()];
        require(userBalance >= amount, "Withdraw amount exceeds balance");
        require(amount > 0, "Withdraw amount must be greater than 0");
        balanceOf[_msgSender()] = userBalance - amount;
        totalSupply -= amount;
        stakingToken.transfer(_msgSender(), amount);
        emit Withdrawn(_msgSender(), amount);
    }

    /**
     * @dev Sets the reward rate. This is used by the agent to evaluate the pool's yield.
     * Only the owner can call this function.
     */
    function setRewardRate(uint256 newRate) external onlyOwner {
        rewardRate = newRate;
        emit RewardRateChanged(newRate);
    }

    /**
     * @dev Allows the agent owner to set the reward rate even if ownership has been transferred to the agent.
     * @param agentId The ID of the agent that owns the pool.
     * @param newRate The new reward rate to set.
     */
    function setRewardRateByAgentOwner(uint256 agentId, uint256 newRate) external {
        require(owner() == agentFactory.agentIdToWallet(agentId), "Pool not owned by agent");
        require(msg.sender == agentFactory.agentIdToOwner(agentId), "Only agent owner can set rate");
        rewardRate = newRate;
        emit RewardRateChanged(newRate);
    }
}
