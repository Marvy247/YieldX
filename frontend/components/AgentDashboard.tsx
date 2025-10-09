'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseEther, formatEther, Address } from 'viem';
import { toast } from 'sonner';

// Lucide React icons
import { Wallet, Bot, TrendingUp, Settings, Zap, Shield, BarChart3, Terminal, CheckCircle, AlertCircle } from 'lucide-react';

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// --- Contract ABIs (Simplified for frontend) ---
const DEMO_USD_ABI = [
  { "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "mint", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "approve", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },
] as const;

const YIELD_POOL_ABI = [
  { "inputs": [], "name": "rewardRate", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "owner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "deposit", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "newRate", "type": "uint256" }], "name": "setRewardRate", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "agentId", "type": "uint256" }, { "internalType": "uint256", "name": "newRate", "type": "uint256" }], "name": "setRewardRateByAgentOwner", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "totalSupply", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }
] as const;

const AGENT_FACTORY_ABI = [
  { "inputs": [{ "internalType": "address", "name": "operator", "type": "address" }], "name": "deployAgent", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "agentId", "type": "uint256" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "deposit", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "agentId", "type": "uint256" }, { "internalType": "address", "name": "target", "type": "address" }, { "internalType": "bytes", "name": "data", "type": "bytes" }], "name": "execute", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "agentId", "type": "uint256" }], "name": "agentIdToWallet", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "agentIdToOwner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "agentIdToOperator", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
] as const;

const AGENT_NFT_ABI = [
  { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "uint256", "name": "index", "type": "uint256" }], "name": "tokenOfOwnerByIndex", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
] as const;

// --- Contract Addresses ---
const DEMO_USD_ADDRESS: Address = '0x631Bf62BfF979205Eee2F73D3d63c5F495Ae67De';
const AGENT_FACTORY_ADDRESS: Address = '0xAb17b786eB7Ea92619Ac5E460e1270D58d810a75';
const AGENT_NFT_ADDRESS: Address = '0x95f356B5078afa297b09CDA22B083D639d740cF3';
const POOL_A_ADDRESS: Address = '0x573a6BDD3e683dFE93e43eCaA6B6195aB17FF23d';
const POOL_B_ADDRESS: Address = '0xadd17D61eC1dEf193e3f547bDf85e18feB98869f';

const MINT_AMOUNT = parseEther('1000000'); // 1 Million DemoUSD for testing
const DEPOSIT_AMOUNT = parseEther('10000'); // 10,000 DemoUSD to deposit into agent

export function AgentDashboard() {
  const { address, isConnected, chain } = useAccount();
  const { writeContract } = useWriteContract();
  const publicClient = usePublicClient();

  console.log("Connected Chain:", chain);
  console.log("Public Client:", publicClient);

  const [ownedAgents, setOwnedAgents] = useState<bigint[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<bigint | undefined>(undefined);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const [poolARate, setPoolARate] = useState<number>(0);
  const [poolBRate, setPoolBRate] = useState<number>(0);
  const [adminPoolARate, setAdminPoolARate] = useState<string>('0');
  const [adminPoolBRate, setAdminPoolBRate] = useState<string>('0');

  const [agentWalletAddressState, setAgentWalletAddressState] = useState<Address | undefined>(undefined);
  const [agentWalletLoadingState, setAgentWalletLoadingState] = useState<boolean>(false);

  const [operatorAddressState, setOperatorAddressState] = useState<Address | undefined>(undefined);
  const [operatorLoadingState, setOperatorLoadingState] = useState<boolean>(false);

  const [selectedPool, setSelectedPool] = useState<`0x${string}`>(POOL_A_ADDRESS);
  const [depositAmount, setDepositAmount] = useState<string>('');

  useEffect(() => {
    const fetchAgentWalletAddress = async () => {
      if (!publicClient || selectedAgentId === undefined || selectedAgentId === null) {
        setAgentWalletAddressState(undefined);
        setAgentWalletLoadingState(false);
        return;
      }

      setAgentWalletLoadingState(true);
      console.log("Calling readContract with:", {
        address: AGENT_FACTORY_ADDRESS,
        abi: AGENT_FACTORY_ABI,
        functionName: 'agentIdToWallet',
        args: [selectedAgentId],
      });
      try {
        const walletAddress = await publicClient.readContract({
          address: AGENT_FACTORY_ADDRESS,
          abi: AGENT_FACTORY_ABI,
          functionName: 'agentIdToWallet',
          args: [selectedAgentId],
        });
        setAgentWalletAddressState(walletAddress);
      } catch (err: unknown) {
        console.error("Error fetching agent wallet address directly:", err);
        setAgentWalletAddressState(undefined);
      } finally {
        setAgentWalletLoadingState(false);
      }
    };

    fetchAgentWalletAddress();
    const interval = setInterval(fetchAgentWalletAddress, 5000); // Refetch every 5 seconds
    return () => clearInterval(interval);
  }, [publicClient, selectedAgentId]);

  useEffect(() => {
    const fetchOperatorAddress = async () => {
      if (!publicClient || selectedAgentId === undefined || selectedAgentId === null) {
        setOperatorAddressState(undefined);
        setOperatorLoadingState(false);
        return;
      }

      setOperatorLoadingState(true);
      try {
        const opAddress = await publicClient.readContract({
          address: AGENT_FACTORY_ADDRESS,
          abi: AGENT_FACTORY_ABI,
          functionName: 'agentIdToOperator',
          args: [selectedAgentId],
        });
        setOperatorAddressState(opAddress);
      } catch (err: unknown) {
        console.error("Error fetching operator address:", err);
        setOperatorAddressState(undefined);
      } finally {
        setOperatorLoadingState(false);
      }
    };

    fetchOperatorAddress();
    const interval = setInterval(fetchOperatorAddress, 5000); // Refetch every 5 seconds
    return () => clearInterval(interval);
  }, [publicClient, selectedAgentId]);

  // --- WebSocket Log Streaming ---
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');

    ws.onopen = () => {
      console.log('Connected to log stream');
      setLogs((prevLogs) => [...prevLogs, '[Connected to log stream]']);
    };

    ws.onmessage = (event) => {
      setLogs((prevLogs) => [...prevLogs, event.data]);
    };

    ws.onclose = () => {
      console.log('Disconnected from log stream');
      setLogs((prevLogs) => [...prevLogs, '[Disconnected from log stream]']);
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
      setLogs((prevLogs) => [...prevLogs, '[Error connecting to log stream]']);
    };

    return () => {
      ws.close();
    };
  }, []);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // --- Read Contract Data ---
  const { data: demoUsdBalance } = useReadContract({
    address: DEMO_USD_ADDRESS,
    abi: DEMO_USD_ABI,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: isConnected && !!address, refetchInterval: 5000 },
  });

  const { data: agentBalance, refetch: refetchAgentBalance } = useReadContract({
    address: AGENT_NFT_ADDRESS,
    abi: AGENT_NFT_ABI,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: isConnected && !!address, refetchInterval: 5000 },
  });
  console.log("Agent Balance:", agentBalance);

const agentTokenQueries = [];
const agentBalanceNumber = Number(agentBalance ?? 0);
if (agentBalanceNumber > 0) {
  for (let i = 0; i < agentBalanceNumber; i++) {
    agentTokenQueries.push({
      address: AGENT_NFT_ADDRESS,
      abi: AGENT_NFT_ABI,
      functionName: 'tokenOfOwnerByIndex',
      args: [address!, BigInt(i)],
    });
  }
}

  const { data: ownedAgentTokens } = useReadContracts({
    contracts: agentTokenQueries,
    query: { enabled: agentBalance !== undefined && agentBalance > 0, refetchInterval: 5000 },
  });
  console.log("Owned Agent Tokens:", ownedAgentTokens);

  useEffect(() => {
    if (ownedAgentTokens) {
      const agentIds = ownedAgentTokens.map(token => token.result).filter(id => id !== undefined) as bigint[];
      setOwnedAgents(agentIds);
      if (agentIds.length > 0 && !selectedAgentId) {
        setSelectedAgentId(agentIds[0]);
      }
    }
  }, [ownedAgentTokens, selectedAgentId]);

  const { data: agentPoolABalance } = useReadContract({
    address: POOL_A_ADDRESS,
    abi: YIELD_POOL_ABI,
    functionName: 'totalSupply',
    query: { enabled: !!agentWalletAddressState, refetchInterval: 5000 },
  });

  const { data: agentPoolBBalance } = useReadContract({
    address: POOL_B_ADDRESS,
    abi: YIELD_POOL_ABI,
    functionName: 'totalSupply',
    query: { enabled: !!agentWalletAddressState, refetchInterval: 5000 },
  });

  const { data: currentPoolARate } = useReadContract({
    address: POOL_A_ADDRESS,
    abi: YIELD_POOL_ABI,
    functionName: 'rewardRate',
    query: { refetchInterval: 5000 },
  });

  const { data: currentPoolBRate } = useReadContract({
    address: POOL_B_ADDRESS,
    abi: YIELD_POOL_ABI,
    functionName: 'rewardRate',
    query: { refetchInterval: 5000 },
  });

  const { data: poolAOwner } = useReadContract({
    address: POOL_A_ADDRESS,
    abi: YIELD_POOL_ABI,
    functionName: 'owner',
    query: { refetchInterval: 5000 },
  });

  const { data: poolBOwner } = useReadContract({
    address: POOL_B_ADDRESS,
    abi: YIELD_POOL_ABI,
    functionName: 'owner',
    query: { refetchInterval: 5000 },
  });

  useEffect(() => {
    if (currentPoolARate !== undefined) setPoolARate(Number(currentPoolARate));
    if (currentPoolBRate !== undefined) setPoolBRate(Number(currentPoolBRate));
  }, [currentPoolARate, currentPoolBRate]);

  // --- Write Contract Functions ---
  const { data: deployTxHash, writeContract: deployAgent } = useWriteContract();

  const { isLoading: isDeploying, isSuccess: isDeployed } = useWaitForTransactionReceipt({
      hash: deployTxHash,
  });

  useEffect(() => {
    if (isDeployed) {
      toast.success('Agent deployed successfully!');
      refetchAgentBalance(); // Refetch the user's agent balance
    }
  }, [isDeployed, refetchAgentBalance]);

  const handleMintDemoUSD = () => {
    if (!address) { toast.error('Connect wallet first'); return; }
    writeContract({
      address: DEMO_USD_ADDRESS,
      abi: DEMO_USD_ABI,
      functionName: 'mint',
      args: [address, MINT_AMOUNT],
    });
    toast.success('Minting DemoUSD...');
  };

  const handleDeployAgent = () => {
    if (!address) { toast.error('Connect wallet first'); return; }
    // Use the dedicated operator address for the agent script
    const opAddress = '0xcB1c741CdBFBC4062b10Ade5Eb2cD4fced0f9689'; // Address from OPERATOR_PRIVATE_KEY

    deployAgent({
      address: AGENT_FACTORY_ADDRESS,
      abi: AGENT_FACTORY_ABI,
      functionName: 'deployAgent',
      args: [opAddress],
    }, {
      onSuccess: (hash) => {
        toast.success(`Deploying agent... Tx: ${hash}`);
      },
      onError: (error) => toast.error(`Deploy failed: ${error.message}`),
    });
  };

  const handleDepositToAgent = () => {
    console.log("handleDepositToAgent - address:", address);
    console.log("handleDepositToAgent - selectedAgentId:", selectedAgentId);
    if (!address) { toast.error('Connect wallet first'); return; }
    if (selectedAgentId === undefined || selectedAgentId === null) { toast.error('Select an agent first'); return; }
    writeContract({
      address: DEMO_USD_ADDRESS,
      abi: DEMO_USD_ABI,
      functionName: 'approve',
      args: [AGENT_FACTORY_ADDRESS, DEPOSIT_AMOUNT],
    }, {
      onSuccess: (hash) => {
        toast.success(`Approving Factory... Tx: ${hash}`);
        // After approval, deposit
        writeContract({
          address: AGENT_FACTORY_ADDRESS,
          abi: AGENT_FACTORY_ABI,
          functionName: 'deposit',
          args: [selectedAgentId, DEPOSIT_AMOUNT],
        }, {
          onSuccess: (hash) => toast.success(`Depositing to agent... Tx: ${hash}`),
          onError: (error) => toast.error(`Deposit failed: ${error.message}`),
        });
      },
      onError: (error) => toast.error(`Approval failed: ${error.message}`),
    });
  };

  const handleSetPoolARate = () => {
    if (!address) { toast.error('Connect wallet first'); return; }
    const isOwnedByAgent = poolAOwner === agentWalletAddressState && selectedAgentId !== undefined;
    if (isOwnedByAgent) {
      writeContract({
        address: POOL_A_ADDRESS,
        abi: YIELD_POOL_ABI,
        functionName: 'setRewardRateByAgentOwner',
        args: [selectedAgentId!, BigInt(adminPoolARate)],
      });
    } else {
      writeContract({
        address: POOL_A_ADDRESS,
        abi: YIELD_POOL_ABI,
        functionName: 'setRewardRate',
        args: [BigInt(adminPoolARate)],
      });
    }
    toast.success(`Setting Pool A rate to ${adminPoolARate}...`);
  };

  const handleSetPoolBRate = () => {
    if (!address) { toast.error('Connect wallet first'); return; }
    const isOwnedByAgent = poolBOwner === agentWalletAddressState && selectedAgentId !== undefined;
    if (isOwnedByAgent) {
      writeContract({
        address: POOL_B_ADDRESS,
        abi: YIELD_POOL_ABI,
        functionName: 'setRewardRateByAgentOwner',
        args: [selectedAgentId!, BigInt(adminPoolBRate)],
      });
    } else {
      writeContract({
        address: POOL_B_ADDRESS,
        abi: YIELD_POOL_ABI,
        functionName: 'setRewardRate',
        args: [BigInt(adminPoolBRate)],
      });
    }
    toast.success(`Setting Pool B rate to ${adminPoolBRate}...`);
  };

  const handleAddFundsToPool = () => {
    if (!address) {
      toast.error('Connect wallet first');
      return;
    }
    if (!depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0) {
      toast.error('Enter a valid deposit amount');
      return;
    }
    const amount = parseEther(depositAmount);
    writeContract({
      address: DEMO_USD_ADDRESS,
      abi: DEMO_USD_ABI,
      functionName: 'approve',
      args: [selectedPool, amount],
    }, {
      onSuccess: (hash) => {
        toast.success(`Approving pool... Tx: ${hash}`);
        // After approval, deposit
        writeContract({
          address: selectedPool as Address,
          abi: YIELD_POOL_ABI,
          functionName: 'deposit',
          args: [amount],
        }, {
          onSuccess: (hash) => toast.success(`Depositing to pool... Tx: ${hash}`),
          onError: (error) => toast.error(`Deposit failed: ${error.message}`),
        });
      },
      onError: (error) => toast.error(`Approval failed: ${error.message}`),
    });
  };

  // --- Render UI ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 container mx-auto p-4 space-y-8">

        {/* Hero Section */}
        <div className="text-center py-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-2xl text-white">
          <div className="flex justify-center items-center space-x-4 mb-4">
            <Bot className="h-12 w-12" />
            <h1 className="text-4xl font-bold">Somnia AI Agent Dashboard</h1>
          </div>
          <p className="text-xl mb-6">Manage your autonomous DeFi agents and monitor real-time performance</p>
          <div className="flex justify-center space-x-4">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              <CheckCircle className="h-4 w-4 mr-1" />
              {isConnected ? 'Wallet Connected' : 'Wallet Disconnected'}
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              <Bot className="h-4 w-4 mr-1" />
              Agents: {ownedAgents.length}
            </Badge>
          </div>
        </div>

        {!isConnected && (
          <div className="text-center py-12">
            <AlertCircle className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-600 dark:text-gray-300 mb-2">Connect Your Wallet</h2>
            <p className="text-lg text-gray-500">Please connect your wallet to access the dashboard and manage your agents.</p>
          </div>
        )}

        {isConnected && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* User Wallet Section */}
          <Card className="lg:col-span-1 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Wallet className="h-5 w-5 text-green-600" />
                <span>Your Wallet</span>
              </CardTitle>
              <CardDescription>Manage your DUSD and deploy agents.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-2 text-sm">Address: <span className="font-mono">{address?.slice(0,6)}...{address?.slice(-4)}</span></p>
              <p className="mb-4 text-lg font-semibold">DemoUSD Balance: {demoUsdBalance !== undefined ? formatEther(demoUsdBalance) : 'Loading...'} DUSD</p>
              <div className="flex space-x-2">
                <Button onClick={handleMintDemoUSD} className="bg-green-600 hover:bg-green-700">
                  <Zap className="h-4 w-4 mr-1" />
                  Mint 1M DemoUSD
                </Button>
                <Button onClick={handleDeployAgent} variant="secondary" disabled={isDeploying} className="hover:bg-gray-100 dark:hover:bg-gray-800">
                  <Bot className="h-4 w-4 mr-1" />
                  {isDeploying ? 'Deploying...' : 'Deploy New Agent'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Agent Status Section */}
          <Card className="lg:col-span-1 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bot className="h-5 w-5 text-blue-600" />
                <span>Agent Status</span>
              </CardTitle>
              <CardDescription>Select an agent to view its status and deposit funds.</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="mb-4">
                <Label htmlFor="agent-select">Select Agent</Label>
                <select
                  id="agent-select"
                  className="w-full p-2 border rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                  value={selectedAgentId?.toString() ?? ''}
                  onChange={(e) => setSelectedAgentId(BigInt(e.target.value))}
                  disabled={ownedAgents.length === 0}
                >
                  {ownedAgents.length > 0 ? (
                    ownedAgents.map(id => (
                      <option key={id.toString()} value={id.toString()}>
                        Agent ID: {id.toString()}
                      </option>
                    ))
                  ) : (
                    <option>No agents found</option>
                  )}
                </select>
              </div>
              {selectedAgentId === undefined ? (
                <div className="text-center py-4">
                  <Bot className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">No agent selected or deployed.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-4">
                    <p className="text-sm"><strong>Agent ID:</strong> <span className="font-mono">{selectedAgentId.toString()}</span></p>
                    <p className="text-sm"><strong>Agent Wallet:</strong> {agentWalletLoadingState ? 'Loading...' : (agentWalletAddressState && agentWalletAddressState !== '0x0000000000000000000000000000000000000000') ? <span className="font-mono">{agentWalletAddressState.slice(0,6)}...{agentWalletAddressState.slice(-4)}</span> : 'Not available'}</p>
                    <p className="text-sm"><strong>Operator:</strong> {operatorLoadingState ? 'Loading...' : (operatorAddressState && operatorAddressState !== '0x0000000000000000000000000000000000000000') ? <span className="font-mono">{operatorAddressState.slice(0,6)}...{operatorAddressState.slice(-4)}</span> : 'Not available'}</p>
                    <p className="text-sm"><strong>Funds in Pool A:</strong> {agentWalletAddressState ? (agentPoolABalance !== undefined ? formatEther(agentPoolABalance) : 'Loading...') : 'No agent selected'} DUSD</p>
                    <p className="text-sm"><strong>Funds in Pool B:</strong> {agentWalletAddressState ? (agentPoolBBalance !== undefined ? formatEther(agentPoolBBalance) : 'Loading...') : 'No agent selected'} DUSD</p>
                  </div>
                  <Button onClick={handleDepositToAgent} className="w-full bg-blue-600 hover:bg-blue-700">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Deposit {formatEther(DEPOSIT_AMOUNT)} DUSD to Agent
                  </Button>
                  <p className="mt-4 text-xs text-muted-foreground">*Agent will automatically move funds based on yield.</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Add Funds to Pool Section */}
          <Card className="lg:col-span-1 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-900/20 border-yellow-200 dark:border-yellow-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                <span>Add Funds to Pool</span>
              </CardTitle>
              <CardDescription>Deposit DemoUSD tokens directly to Pool A or Pool B.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label htmlFor="pool-select">Select Pool</Label>
                <select
                  id="pool-select"
                  className="w-full p-2 border rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-yellow-500"
                  value={selectedPool}
                  onChange={(e) => setSelectedPool(e.target.value as `0x${string}`)}
                >
                  <option value={POOL_A_ADDRESS}>Pool A</option>
                  <option value={POOL_B_ADDRESS}>Pool B</option>
                </select>
              </div>
              <div className="mb-4">
                <Label htmlFor="deposit-amount">Amount (DUSD)</Label>
                <Input
                  type="number"
                  id="deposit-amount"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Enter amount to deposit"
                />
              </div>
              <Button onClick={handleAddFundsToPool} className="w-full bg-yellow-600 hover:bg-yellow-700">
                Deposit to Pool
              </Button>
            </CardContent>
          </Card>

          {/* Live Agent Log Section */}
          <Card className="lg:col-span-1 bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-900/20 dark:to-slate-900/20 border-gray-200 dark:border-gray-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Terminal className="h-5 w-5 text-gray-600" />
                <span>Live Agent Log</span>
              </CardTitle>
              <CardDescription>Real-time logs from the autonomous agent.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 overflow-y-auto bg-black text-green-400 p-4 rounded-md border font-mono text-sm">
                {logs.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </CardContent>
          </Card>

          {/* Yield Pools Section */}
          <Card className="col-span-full bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                <span>Yield Pools</span>
              </CardTitle>
              <CardDescription>Current reward rates of the available pools.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-white dark:bg-gray-800 border shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span>Pool A</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold mb-2">Current Rate: {poolARate}%</p>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div className="bg-green-600 h-3 rounded-full transition-all duration-500" style={{ width: `${Math.min(poolARate, 100)}%` }}></div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-800 border shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span>Pool B</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold mb-2">Current Rate: {poolBRate}%</p>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div className="bg-blue-600 h-3 rounded-full transition-all duration-500" style={{ width: `${Math.min(poolBRate, 100)}%` }}></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Admin Panel Section */}
          <Card className="col-span-full border-red-500 bg-gradient-to-br from-red-50 to-orange-100 dark:from-red-900/20 dark:to-orange-900/20 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                <Settings className="h-5 w-5" />
                <span>Admin Panel (Demo Control)</span>
              </CardTitle>
              <CardDescription className="text-red-500 dark:text-red-300">Adjust pool reward rates to trigger agent actions.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="poolARate" className="text-gray-700 dark:text-gray-300">Set Pool A Rate (%)</Label>
                  <Input
                    type="number"
                    id="poolARate"
                    value={adminPoolARate}
                    onChange={(e) => setAdminPoolARate(e.target.value)}
                    className="border-red-300 focus:ring-red-500"
                  />
                  <Button onClick={handleSetPoolARate} className="w-full bg-red-600 hover:bg-red-700">
                    <Shield className="h-4 w-4 mr-1" />
                    Set Pool A Rate
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="poolBRate" className="text-gray-700 dark:text-gray-300">Set Pool B Rate (%)</Label>
                  <Input
                    type="number"
                    id="poolBRate"
                    value={adminPoolBRate}
                    onChange={(e) => setAdminPoolBRate(e.target.value)}
                    className="border-red-300 focus:ring-red-500"
                  />
                  <Button onClick={handleSetPoolBRate} className="w-full bg-red-600 hover:bg-red-700">
                    <Shield className="h-4 w-4 mr-1" />
                    Set Pool B Rate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
