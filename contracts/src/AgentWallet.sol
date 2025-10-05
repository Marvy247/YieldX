// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentWallet
 * @dev This contract is a simple, ownable wallet for a single agent.
 * Its owner will be the AgentFactory, which is the only entity allowed to command it.
 * This allows each agent to have a unique on-chain address to hold assets and interact
 * with other protocols.
 */
contract AgentWallet is Ownable {
    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @dev Allows the owner (AgentFactory) to execute an arbitrary call from this wallet's context.
     * This is how the agent performs actions like depositing into a YieldPool.
     * @param to The target contract address.
     * @param value The amount of ETH to send with the call.
     * @param data The calldata for the target function.
     */
    function execute(address to, uint256 value, bytes calldata data) external onlyOwner returns (bool, bytes memory) {
        (bool success, bytes memory result) = to.call{value: value}(data);
        return (success, result);
    }

    // Allow the wallet to receive ETH if needed in the future.
    receive() external payable {}
}
