// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/DemoUSD.sol";
import "../src/YieldPool.sol";
import "../src/AgentNFT.sol";
import "../src/AgentFactory.sol";
import "../src/AgentWallet.sol";

contract AgentFlowTest is Test {
    DemoUSD public demoUsd;
    AgentNFT public agentNft;
    YieldPool public poolA;
    YieldPool public poolB;
    AgentFactory public agentFactory;

    address public user = address(0x1);
    address public operator = address(0x2);

    uint256 public constant INITIAL_MINT_AMOUNT = 10_000 * 1e18;

    function setUp() public {
        // Deploy Contracts
        demoUsd = new DemoUSD(address(this));
        agentNft = new AgentNFT(address(this));
        agentFactory = new AgentFactory(address(agentNft), address(demoUsd));
        poolA = new YieldPool(address(demoUsd), address(this), address(agentFactory));
        poolB = new YieldPool(address(demoUsd), address(this), address(agentFactory));

        // Transfer NFT ownership to the factory
        agentNft.transferOwnership(address(agentFactory));

        // Fund the user
        demoUsd.mint(user, INITIAL_MINT_AMOUNT);
    }

    function test_InitialState() public {
        assertEq(demoUsd.balanceOf(user), INITIAL_MINT_AMOUNT);
        assertEq(address(agentNft.owner()), address(agentFactory));
    }

    function test_DeployAgent() public {
        vm.prank(user);
        uint256 agentId = agentFactory.deployAgent(operator);

        assertEq(agentNft.ownerOf(agentId), user);
        assertEq(agentFactory.agentIdToOwner(agentId), user);
        assertEq(agentFactory.agentIdToOperator(agentId), operator);
        assertNotEq(agentFactory.agentIdToWallet(agentId), address(0));
    }

    function test_FullAgentFlow() public {
        // 1. Deploy Agent
        vm.prank(user);
        uint256 agentId = agentFactory.deployAgent(operator);
        address agentWalletAddress = agentFactory.agentIdToWallet(agentId);

        // 2. User deposits funds into the agent's wallet
        vm.startPrank(user);
        demoUsd.approve(address(agentFactory), INITIAL_MINT_AMOUNT);
        agentFactory.deposit(agentId, INITIAL_MINT_AMOUNT);
        vm.stopPrank();

        assertEq(demoUsd.balanceOf(agentWalletAddress), INITIAL_MINT_AMOUNT);
        assertEq(demoUsd.balanceOf(user), 0);

        // 3. Operator (off-chain script) approves pools to spend agent's funds
        vm.startPrank(operator);
        // Approve Pool A
        bytes memory approveCallDataA = abi.encodeWithSelector(
            demoUsd.approve.selector,
            address(poolA),
            INITIAL_MINT_AMOUNT
        );
        agentFactory.execute(agentId, address(demoUsd), approveCallDataA);
        
        // Approve Pool B
        bytes memory approveCallDataB = abi.encodeWithSelector(
            demoUsd.approve.selector,
            address(poolB),
            INITIAL_MINT_AMOUNT
        );
        agentFactory.execute(agentId, address(demoUsd), approveCallDataB);
        vm.stopPrank();

        // Check allowances
        assertEq(demoUsd.allowance(agentWalletAddress, address(poolA)), INITIAL_MINT_AMOUNT);
        assertEq(demoUsd.allowance(agentWalletAddress, address(poolB)), INITIAL_MINT_AMOUNT);

        // 4. Operator deposits funds into Pool A
        vm.startPrank(operator);
        bytes memory depositCallData = abi.encodeWithSelector(
            poolA.deposit.selector,
            INITIAL_MINT_AMOUNT
        );
        agentFactory.execute(agentId, address(poolA), depositCallData);
        vm.stopPrank();

        assertEq(poolA.balanceOf(agentWalletAddress), INITIAL_MINT_AMOUNT);
        assertEq(demoUsd.balanceOf(agentWalletAddress), 0);

        // 5. Operator moves funds from Pool A to Pool B
        vm.startPrank(operator);
        // Withdraw from A
        bytes memory withdrawCallData = abi.encodeWithSelector(
            poolA.withdraw.selector,
            INITIAL_MINT_AMOUNT
        );
        agentFactory.execute(agentId, address(poolA), withdrawCallData);

        // Deposit into B
        bytes memory depositCallDataB = abi.encodeWithSelector(
            poolB.deposit.selector,
            INITIAL_MINT_AMOUNT
        );
        agentFactory.execute(agentId, address(poolB), depositCallDataB);
        vm.stopPrank();

        assertEq(poolA.balanceOf(agentWalletAddress), 0);
        assertEq(poolB.balanceOf(agentWalletAddress), INITIAL_MINT_AMOUNT);
        assertEq(demoUsd.balanceOf(agentWalletAddress), 0);

        // 6. Transfer ownership of Pool A to the agent
        vm.prank(address(this)); // test contract owns poolA
        poolA.transferOwnership(agentWalletAddress);

        // 7. User sets reward rate via new function
        vm.prank(user);
        poolA.setRewardRateByAgentOwner(agentId, 500); // 5% APY or whatever

        assertEq(poolA.rewardRate(), 500);
    }
}
