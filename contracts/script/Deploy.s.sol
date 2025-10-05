// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DemoUSD.sol";
import "../src/YieldPool.sol";
import "../src/AgentNFT.sol";
import "../src/AgentFactory.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy the DemoUSD token
        DemoUSD demoUsd = new DemoUSD(deployer);

        // 2. Deploy the AgentNFT contract, with the deployer as the initial owner
        AgentNFT agentNft = new AgentNFT(deployer);

        // 3. Deploy two YieldPools for the agent to switch between
        YieldPool poolA = new YieldPool(address(demoUsd), deployer);
        YieldPool poolB = new YieldPool(address(demoUsd), deployer);

        // 4. Deploy the AgentFactory, linking the AgentNFT and DemoUSD contracts
        AgentFactory agentFactory = new AgentFactory(address(agentNft), address(demoUsd));

        // 5. Transfer ownership of the AgentNFT contract to the AgentFactory
        // This is a crucial step, allowing the factory to mint new agent NFTs.
        agentNft.transferOwnership(address(agentFactory));

        vm.stopBroadcast();

        // Log the addresses for frontend configuration
        console.log("Deployer Address:", deployer);
        console.log("DemoUSD Address:", address(demoUsd));
        console.log("AgentNFT Address:", address(agentNft));
        console.log("YieldPool A Address:", address(poolA));
        console.log("YieldPool B Address:", address(poolB));
        console.log("AgentFactory Address:", address(agentFactory));
    }
}