import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  encodeFunctionData,
  Address,
  Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from 'viem';
import WebSocket from 'ws';

// --- WEBSOCKET SETUP ---
const ws = new WebSocket('ws://localhost:8080');

ws.on('open', function open() {
  log('Connected to WebSocket log stream');
});

ws.on('message', function message(data) {
  console.log('Received from server: %s', data);
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

function log(message: string) {
  console.log(message);
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(message);
  }
}

const somniaTestnet = defineChain({
  id: 50312,
  name: 'Somnia Testnet',
  nativeCurrency: { name: 'Somnia Testnet Token', symbol: 'STT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://dream-rpc.somnia.network/'] },
  },
  blockExplorers: {
    default: { name: 'Somnia Explorer', url: 'https://shannon-explorer.somnia.network' },
  },
});

// --- CONFIGURATION --- (Replace with actual deployment addresses)
const AGENT_ID = 0; // The ID of the agent this script controls
const OPERATOR_PRIVATE_KEY = (process.env.OPERATOR_PRIVATE_KEY || "0x...") as Hex;

const RPC_URL = "https://dream-rpc.somnia.network/"; // Somnia Testnet RPC

const FACTORY_ADDRESS = "0x51f4FaaF35a810b91B758B0968258aE852764E05";
const POOL_A_ADDRESS = "0xd3cCC5aB56f930249263A79C3af100C3B38ef9eF";
const POOL_B_ADDRESS = "0x54749f9F53d184D65f55dC7856cBdb7BdbD37B21";

// --- ABIs (Simplified for clarity) ---
const FACTORY_ABI = parseAbi([
  "function execute(uint256 agentId, address target, bytes calldata data)",
  "function agentIdToWallet(uint256 agentId) view returns (address)",
]);

const POOL_ABI = parseAbi([
  "function rewardRate() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function deposit(uint256 amount)",
  "function withdraw(uint256 amount)",
]);

// --- CLIENT SETUP ---
const publicClient = createPublicClient({
  chain: somniaTestnet,
  transport: http(RPC_URL),
});

const account = privateKeyToAccount(OPERATOR_PRIVATE_KEY);

const walletClient = createWalletClient({
  account,
  chain: somniaTestnet,
  transport: http(RPC_URL),
});

log(`Agent Operator Address: ${account.address}`);

// --- CORE AGENT LOGIC ---

/**
 * Fetches the current reward rate (APY) from a YieldPool.
 */
async function getPoolRate(poolAddress: Address): Promise<bigint> {
  try {
    const rate = await publicClient.readContract({
      address: poolAddress,
      abi: POOL_ABI,
      functionName: "rewardRate",
    });
    return rate;
  } catch (e) {
    log(`Error fetching rate for pool ${poolAddress}:`);
    return BigInt(0);
  }
}

/**
 * Fetches the agent's current balance in a specific YieldPool.
 */
async function getAgentPosition(
  agentWallet: Address,
  poolAddress: Address
): Promise<bigint> {
  try {
    const balance = await publicClient.readContract({
      address: poolAddress,
      abi: POOL_ABI,
      functionName: "balanceOf",
      args: [agentWallet],
    });
    return balance;
  } catch (e) {
    log(`Error fetching position for pool ${poolAddress}:`);
    return BigInt(0);
  }
}

/**
 * Executes a move by calling the AgentFactory.
 */
async function executeFactoryCall(
  agentId: number,
  target: Address,
  callData: Hex
) {
  log(`Executing call to ${target} for agent ${agentId}...`);
  try {
    const hash = await walletClient.writeContract({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: "execute",
      args: [BigInt(agentId), target, callData],
    });
    log(`Transaction sent! Hash: ${hash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    log(`Transaction confirmed! Block number: ${receipt.blockNumber}`);
    return true;
  } catch (e) {
    log(`Execution failed:`);
    return false;
  }
}

/**
 * The main decision-making loop for the agent.
 */
async function run() {
  log("--- Autonomous Yield Agent Starting ---");
  log(`Controlling Agent ID: ${AGENT_ID}`);
  log(`Pool A: ${POOL_A_ADDRESS}`);
  log(`Pool B: ${POOL_B_ADDRESS}`);

  const agentWallet = await publicClient.readContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "agentIdToWallet",
    args: [BigInt(AGENT_ID)],
  });

  if (agentWallet === "0x0000000000000000000000000000000000000000") {
    log(`Agent ${AGENT_ID} has not been deployed. Exiting.`);
    return;
  }
  log(`Agent Wallet Address: ${agentWallet}`);

  while (true) {
    try {
      log(`\n-- Checking pools at ${new Date().toLocaleTimeString()}`);

      // 1. Get current state
      const rateA = await getPoolRate(POOL_A_ADDRESS);
      const rateB = await getPoolRate(POOL_B_ADDRESS);
      log(`Rates -> Pool A: ${rateA} | Pool B: ${rateB}`);

      const positionA = await getAgentPosition(agentWallet, POOL_A_ADDRESS);
      const positionB = await getAgentPosition(agentWallet, POOL_B_ADDRESS);
      log(`Positions -> Pool A: ${positionA} | Pool B: ${positionB}`);

      const totalBalance = positionA + positionB;
      if (totalBalance === BigInt(0)) {
        log("Agent has no funds deposited. Standing by.");
        await new Promise((resolve) => setTimeout(resolve, 15000)); // Wait 15s
        continue;
      }

      // 2. Make decision
      // Move to B if its rate is >5% higher than A and we are in A
      if (positionA > BigInt(0) && rateB > rateA + rateA / BigInt(20)) {
        log("Decision: Move funds from Pool A to Pool B");

        // Withdraw from A
        const withdrawCallData = encodeFunctionData({
          abi: POOL_ABI,
          functionName: "withdraw",
          args: [positionA],
        });
        await executeFactoryCall(AGENT_ID, POOL_A_ADDRESS, withdrawCallData);

        // Deposit into B
        const depositCallData = encodeFunctionData({
          abi: POOL_ABI,
          functionName: "deposit",
          args: [positionA],
        });
        await executeFactoryCall(AGENT_ID, POOL_B_ADDRESS, depositCallData);

        log("Move complete!");

        // Move to A if its rate is >5% higher than B and we are in B
      } else if (positionB > BigInt(0) && rateA > rateB + rateB / BigInt(20)) {
        log("Decision: Move funds from Pool B to Pool A");

        // Withdraw from B
        const withdrawCallData = encodeFunctionData({
          abi: POOL_ABI,
          functionName: "withdraw",
          args: [positionB],
        });
        await executeFactoryCall(AGENT_ID, POOL_B_ADDRESS, withdrawCallData);

        // Deposit into A
        const depositCallData = encodeFunctionData({
          abi: POOL_ABI,
          functionName: "deposit",
          args: [positionB],
        });
        await executeFactoryCall(AGENT_ID, POOL_A_ADDRESS, depositCallData);

        log("Move complete!");
      } else {
        log("Decision: Stay in current position.");
      }
    } catch (error) {
      log(`An error occurred in the main loop:`);
    }

    // Wait for 10 seconds before the next cycle
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
}

// To run this agent:
// 1. Make sure contracts are deployed.
// 2. Fill in the CONFIGURATION constants.
// 3. Set the OPERATOR_PRIVATE_KEY environment variable.
// 4. Run `ts-node frontend/lib/agent.ts`
// run().catch(console.error);