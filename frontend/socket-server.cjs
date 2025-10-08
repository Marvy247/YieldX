const { WebSocketServer } = require('ws');
const { createPublicClient, createWalletClient, http, encodeFunctionData } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

const wss = new WebSocketServer({ port: 8080 });

console.log('WebSocket server started on port 8080');

// Define the chain
const chain = {
  id: 50312,
  name: 'Somnia Testnet',
  rpcUrls: {
    default: { http: ['https://dream-rpc.somnia.network/'] },
  },
};

// Create clients
const publicClient = createPublicClient({
  chain,
  transport: http(),
});

const OPERATOR_PRIVATE_KEY = '0x6c6b2b6b61a58912d1589a9d4cc9cc49f506bb577df5c26aaa7a510c6ed017eb';
const account = privateKeyToAccount(OPERATOR_PRIVATE_KEY);
const walletClient = createWalletClient({
  chain,
  transport: http(),
  account,
});

// ABIs
const DEMO_USD_ABI = [
  { "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "mint", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "approve", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },
];

const YIELD_POOL_ABI = [
  { "inputs": [], "name": "rewardRate", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "deposit", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "newRate", "type": "uint256" }], "name": "setRewardRate", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "type": "event", "name": "RewardRateChanged", "inputs": [{ "indexed": false, "internalType": "uint256", "name": "oldRate", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "newRate", "type": "uint256" }] },
];

const AGENT_FACTORY_ABI = [
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "agentIdToWallet", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "agentId", "type": "uint256" }, { "internalType": "address", "name": "target", "type": "address" }, { "internalType": "bytes", "name": "data", "type": "bytes" }], "name": "execute", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
];

const AGENT_WALLET_ABI = [
  { "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "value", "type": "uint256" }, { "internalType": "bytes", "name": "data", "type": "bytes" }], "name": "execute", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }, { "internalType": "bytes", "name": "", "type": "bytes" }], "stateMutability": "nonpayable", "type": "function" },
];

// Addresses
const POOL_A_ADDRESS = '0xd3cCC5aB56f930249263A79C3af100C3B38ef9eF';
const POOL_B_ADDRESS = '0x54749f9F53d184D65f55dC7856cBdb7BdbD37B21';
const AGENT_FACTORY_ADDRESS = '0xbE838aC4968Db6905285bF260d7f0F54257d3737';
const DEMO_USD_ADDRESS = '0xf199FFc0f226F70A0fE3475358114212772C6342';

// Function to send message to all clients
function broadcast(message) {
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

// Handle rate change
async function handleRateChange() {
  try {
    // Get current rates
    const rateA = await publicClient.readContract({
      address: POOL_A_ADDRESS,
      abi: YIELD_POOL_ABI,
      functionName: 'rewardRate',
    });
    const rateB = await publicClient.readContract({
      address: POOL_B_ADDRESS,
      abi: YIELD_POOL_ABI,
      functionName: 'rewardRate',
    });
    const message = `Current rates: A: ${rateA}%, B: ${rateB}%`;
    console.log(message);
    broadcast(message);

    // For agent 0
    const agentId = 0n;
    const wallet = await publicClient.readContract({
      address: AGENT_FACTORY_ADDRESS,
      abi: AGENT_FACTORY_ABI,
      functionName: 'agentIdToWallet',
      args: [agentId],
    });
    if (wallet === '0x0000000000000000000000000000000000000000') {
      broadcast('No agent wallet found');
      return;
    }

    // Get balances in pools
    const balanceA = await publicClient.readContract({
      address: POOL_A_ADDRESS,
      abi: YIELD_POOL_ABI,
      functionName: 'balanceOf',
      args: [wallet],
    });
    const balanceB = await publicClient.readContract({
      address: POOL_B_ADDRESS,
      abi: YIELD_POOL_ABI,
      functionName: 'balanceOf',
      args: [wallet],
    });

    // Get wallet balance in DUSD
    const walletBalance = await publicClient.readContract({
      address: DEMO_USD_ADDRESS,
      abi: DEMO_USD_ABI,
      functionName: 'balanceOf',
      args: [wallet],
    });

    broadcast(`Agent wallet balance: ${walletBalance} DUSD, Pool A: ${balanceA} DUSD, Pool B: ${balanceB} DUSD`);

    // Decide which pool to move to
    let targetPool, amount;
    if (rateA > rateB) {
      targetPool = POOL_A_ADDRESS;
      amount = walletBalance + balanceB; // move all from B to A
    } else if (rateB > rateA) {
      targetPool = POOL_B_ADDRESS;
      amount = walletBalance + balanceA; // move all from A to B
    } else {
      broadcast('Rates are equal, no action needed');
      return;
    }

    // Withdraw from the other pool if any
    if (balanceA > 0n && targetPool !== POOL_A_ADDRESS) {
      const withdrawData = encodeFunctionData({
        abi: YIELD_POOL_ABI,
        functionName: 'withdraw',
        args: [balanceA],
      });
      const executeData = encodeFunctionData({
        abi: AGENT_WALLET_ABI,
        functionName: 'execute',
        args: [POOL_A_ADDRESS, 0n, withdrawData],
      });
      await walletClient.writeContract({
        address: AGENT_FACTORY_ADDRESS,
        abi: AGENT_FACTORY_ABI,
        functionName: 'execute',
        args: [agentId, wallet, executeData],
      });
      broadcast(`Withdrew ${balanceA} DUSD from Pool A`);
    }

    if (balanceB > 0n && targetPool !== POOL_B_ADDRESS) {
      const withdrawData = encodeFunctionData({
        abi: YIELD_POOL_ABI,
        functionName: 'withdraw',
        args: [balanceB],
      });
      const executeData = encodeFunctionData({
        abi: AGENT_WALLET_ABI,
        functionName: 'execute',
        args: [POOL_B_ADDRESS, 0n, withdrawData],
      });
      await walletClient.writeContract({
        address: AGENT_FACTORY_ADDRESS,
        abi: AGENT_FACTORY_ABI,
        functionName: 'execute',
        args: [agentId, wallet, executeData],
      });
      broadcast(`Withdrew ${balanceB} DUSD from Pool B`);
    }

    // Deposit to the target pool
    if (amount > 0n) {
      // First, approve the pool to spend the tokens
      const approveData = encodeFunctionData({
        abi: DEMO_USD_ABI,
        functionName: 'approve',
        args: [targetPool, amount],
      });
      const approveExecuteData = encodeFunctionData({
        abi: AGENT_WALLET_ABI,
        functionName: 'execute',
        args: [DEMO_USD_ADDRESS, 0n, approveData],
      });
      await walletClient.writeContract({
        address: AGENT_FACTORY_ADDRESS,
        abi: AGENT_FACTORY_ABI,
        functionName: 'execute',
        args: [agentId, wallet, approveExecuteData],
      });
      broadcast(`Approved ${amount} DUSD for Pool ${targetPool === POOL_A_ADDRESS ? 'A' : 'B'}`);

      // Then deposit
      const depositData = encodeFunctionData({
        abi: YIELD_POOL_ABI,
        functionName: 'deposit',
        args: [amount],
      });
      const depositExecuteData = encodeFunctionData({
        abi: AGENT_WALLET_ABI,
        functionName: 'execute',
        args: [targetPool, 0n, depositData],
      });
      await walletClient.writeContract({
        address: AGENT_FACTORY_ADDRESS,
        abi: AGENT_FACTORY_ABI,
        functionName: 'execute',
        args: [agentId, wallet, depositExecuteData],
      });
      const poolName = targetPool === POOL_A_ADDRESS ? 'A' : 'B';
      broadcast(`Deposited ${amount} DUSD to Pool ${poolName}`);
    }
  } catch (error) {
    console.error('Error in handleRateChange:', error);
    broadcast('Error handling rate change: ' + error.message);
  }
}

// Poll for rate changes
let previousRateA = 0n;
let previousRateB = 0n;

setInterval(async () => {
  try {
    const rateA = await publicClient.readContract({
      address: POOL_A_ADDRESS,
      abi: YIELD_POOL_ABI,
      functionName: 'rewardRate',
    });
    const rateB = await publicClient.readContract({
      address: POOL_B_ADDRESS,
      abi: YIELD_POOL_ABI,
      functionName: 'rewardRate',
    });

    if (rateA !== previousRateA) {
      const message = `Pool A rate changed to ${rateA}%`;
      console.log(message);
      broadcast(message);
      previousRateA = rateA;
      await handleRateChange();
    }

    if (rateB !== previousRateB) {
      const message = `Pool B rate changed to ${rateB}%`;
      console.log(message);
      broadcast(message);
      previousRateB = rateB;
      await handleRateChange();
    }
  } catch (error) {
    console.error('Error polling rates:', error);
  }
}, 30000); // Poll every 30 seconds

// Polling interval is increased to 30 seconds to reduce system load and make the websocket server lighter.
// You can adjust this interval as needed to balance performance and responsiveness.

wss.on('connection', function connection(ws) {
  console.log('A new client connected');

  ws.on('message', function message(data) {
    console.log('received: %s', data);
    // Broadcast the message to all clients except the sender
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === ws.OPEN) {
        client.send(data.toString());
      }
    });
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.send('Welcome to the agent log stream!');
});
