// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AgentNFT.sol";
import "./AgentWallet.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title AgentFactory
 * @dev Deploys and manages autonomous agents. This contract is the main entrypoint
 * for users to create and fund their agents, and for agent scripts to execute commands.
 */
contract AgentFactory {
    AgentNFT public immutable agentNft;
    IERC20 public immutable stakingToken;

    mapping(uint256 => address) public agentIdToWallet;
    mapping(uint256 => address) public agentIdToOwner;
    mapping(uint256 => address) public agentIdToOperator;

    event AgentDeployed(uint256 indexed agentId, address indexed owner, address operator, address wallet);
    event Deposit(uint256 indexed agentId, uint256 amount);

    constructor(address _agentNft, address _stakingToken) {
        agentNft = AgentNFT(_agentNft);
        stakingToken = IERC20(_stakingToken);
    }

    /**
     * @dev Deploys a new agent: mints an NFT, creates a wallet, and assigns an operator.
     * @param operator The address for the off-chain script that will control this agent.
     * @return agentId The ID of the newly created agent.
     */
    function deployAgent(address operator) external returns (uint256) {
        require(operator != address(0), "Operator cannot be zero address");

        uint256 agentId = agentNft.safeMint(msg.sender);
        
        AgentWallet wallet = new AgentWallet(address(this));
        
        agentIdToWallet[agentId] = address(wallet);
        agentIdToOwner[agentId] = msg.sender;
        agentIdToOperator[agentId] = operator;

        emit AgentDeployed(agentId, msg.sender, operator, address(wallet));
        return agentId;
    }

    /**
     * @dev Allows the owner of an agent to deposit funds into their agent's wallet.
     * @param agentId The ID of the agent to fund.
     * @param amount The amount of staking tokens to deposit.
     */
    function deposit(uint256 agentId, uint256 amount) external {
        require(msg.sender == agentIdToOwner[agentId], "Only agent owner can deposit");
        require(amount > 0, "Amount must be positive");

        address wallet = agentIdToWallet[agentId];
        require(wallet != address(0), "Agent does not exist");

        stakingToken.transferFrom(msg.sender, wallet, amount);

        emit Deposit(agentId, amount);
    }

    /**
     * @dev Allows the agent's operator to execute a command through the agent's wallet.
     * @param agentId The ID of the agent executing the command.
     * @param target The address of the contract to call.
     * @param data The calldata of the function to call.
     */
    function execute(uint256 agentId, address target, bytes calldata data) external {
        require(msg.sender == agentIdToOperator[agentId], "Only agent operator can execute");
        
        address payable walletAddress = payable(agentIdToWallet[agentId]);
        require(walletAddress != address(0), "Agent does not exist");

        AgentWallet wallet = AgentWallet(walletAddress);
        (bool success, ) = wallet.execute(target, 0, data);
        require(success, "Execution failed");
    }
}
