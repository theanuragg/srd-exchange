import { useState, useEffect } from "react";
import {
  useAccount,
  useSwitchChain,
  usePublicClient,
  useWallets,
  useSmartAccount,
} from "@particle-network/connectkit";
import { parseUnits, formatUnits, Address } from "viem";
import type { Chain as ViemChain } from "viem";
import { bsc } from "@particle-network/connectkit/chains";
import { PublicClient } from "viem";
import { retryWithRPCFailover, rpcManager } from "@/lib/rpcManager";

// Add Gas Station import
const GAS_STATION_ENABLED =
  process.env.NEXT_PUBLIC_GAS_STATION_ENABLED === "true";

// Contract addresses - MAINNET ONLY
const CONTRACTS = {
  USDT: {
    [56]: "0x55d398326f99059fF775485246999027B3197955" as Address, // BSC Mainnet only
  },
  P2P_TRADING: {
    [56]: "0xbfb247eA56F806607f2346D9475F669F30EAf2fB" as Address, // BSC Mainnet only
  },
};

// Add decimals ABI for USDT
const USDT_ABI = [
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // Add decimals function
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const P2P_TRADING_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "_usdtAmount", type: "uint256" },
      { internalType: "uint256", name: "_inrAmount", type: "uint256" },
      { internalType: "string", name: "_orderType", type: "string" },
    ],
    name: "createBuyOrder",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_usdtAmount", type: "uint256" },
      { internalType: "uint256", name: "_inrAmount", type: "uint256" },
      { internalType: "string", name: "_orderType", type: "string" },
    ],
    name: "createSellOrder",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_orderId", type: "uint256" }],
    name: "verifyPayment",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_orderId", type: "uint256" }],
    name: "completeBuyOrder",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_orderId", type: "uint256" }],
    name: "completeSellOrder",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_orderId", type: "uint256" }],
    name: "confirmOrderReceived",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_orderId", type: "uint256" }],
    name: "getOrder",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "orderId", type: "uint256" },
          { internalType: "address", name: "user", type: "address" },
          { internalType: "uint256", name: "usdtAmount", type: "uint256" },
          { internalType: "uint256", name: "inrAmount", type: "uint256" },
          { internalType: "bool", name: "isBuyOrder", type: "bool" },
          { internalType: "bool", name: "isCompleted", type: "bool" },
          { internalType: "bool", name: "isVerified", type: "bool" },
          { internalType: "bool", name: "adminApproved", type: "bool" },
          { internalType: "uint256", name: "timestamp", type: "uint256" },
          { internalType: "string", name: "orderType", type: "string" },
        ],
        internalType: "struct P2PTrading.Order",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_orderId", type: "uint256" }],
    name: "approveOrder",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getOrderCounter",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_usdtAmount", type: "uint256" },
      { internalType: "uint256", name: "_inrAmount", type: "uint256" },
      { internalType: "string", name: "_orderType", type: "string" },
      { internalType: "address", name: "_adminWallet", type: "address" },
    ],
    name: "directSellTransfer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getAdminWallet",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "admin",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  // Add this new ABI entry to P2P_TRADING_ABI array:
  {
    inputs: [
      { internalType: "address", name: "_userAddress", type: "address" },
      { internalType: "uint256", name: "_usdtAmount", type: "uint256" },
      { internalType: "uint256", name: "_inrAmount", type: "uint256" },
      { internalType: "string", name: "_orderType", type: "string" },
    ],
    name: "adminExecuteSellTransfer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Helper function to safely convert BigInt to string for JSON serialization
const serializeBigInt = (value: bigint): string => {
  return value.toString();
};

// Helper function to create serializable wallet data
const createSerializableWalletData = (walletInfo: any) => {
  return {
    address: walletInfo.address,
    isConnected: walletInfo.isConnected,
    chainId: walletInfo.chainId,
    isOnBSC: walletInfo.isOnBSC,
    balances: {
      bnb: {
        raw: serializeBigInt(walletInfo.balances.bnb.raw),
        formatted: walletInfo.balances.bnb.formatted,
        symbol: walletInfo.balances.bnb.symbol,
      },
      usdt: {
        raw: serializeBigInt(walletInfo.balances.usdt.raw),
        formatted: walletInfo.balances.usdt.formatted,
        symbol: walletInfo.balances.usdt.symbol,
      },
    },
    canTrade: walletInfo.canTrade,
    lastUpdated: walletInfo.lastUpdated,
  };
};

export function useWalletManager() {
  const { address, isConnected, chainId, chain, status } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient() as PublicClient;
  const [primaryWallet] = useWallets();
  const smartAccount = useSmartAccount();
  const isConnecting = status === "connecting" || status === "reconnecting";
  const [walletData, setWalletData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bnbBalance, setBnbBalance] = useState<bigint | null>(null);
  const [usdtBalance, setUsdtBalance] = useState<bigint | null>(null);
  const [usdtDecimals, setUsdtDecimals] = useState<number | null>(null);
  const [smartWalletAddress, setSmartWalletAddress] = useState<string | null>(null);
  const [smartWalletUsdtBalance, setSmartWalletUsdtBalance] = useState<bigint | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Fetch BNB balance
  const refetchBnb = async () => {
    if (!address) return;

    try {
      const balance = await retryWithRPCFailover(async (client) => {
        return await client.getBalance({ address: address as Address });
      });

      if (balance !== null) {
        setBnbBalance(balance);
      }
    } catch (error) {
      console.error("Failed to fetch BNB balance:", error);
    }
  };


  // Fetch USDT balance and decimals for EOA
  const refetchUsdt = async () => {
    if (!address || chainId !== bsc.id) return;

    try {
      const balance = await retryWithRPCFailover(async (client) => {
        return await client.readContract({
          address: CONTRACTS.USDT[56],
          abi: USDT_ABI,
          functionName: "balanceOf",
          args: [address as Address],
        });
      });

      if (balance !== null) {
        setUsdtBalance(balance as bigint);
      }

      const decimals = await retryWithRPCFailover(async (client) => {
        return await client.readContract({
          address: CONTRACTS.USDT[56],
          abi: USDT_ABI,
          functionName: "decimals",
        });
      });

      if (decimals !== null) {
        setUsdtDecimals(Number(decimals));
      }
    } catch (error) {
      console.error("Failed to fetch USDT balance:", error);
    }
  };

  // Fetch smart account address early (separate from balance fetching)
  // This ensures the address is available for new users even before first transaction
  useEffect(() => {
    const fetchSmartAccountAddress = async () => {
      if (!smartAccount) {
        console.log("⏳ Smart account not yet initialized");
        return;
      }

      try {
        const smartAddress = await smartAccount.getAddress();
        setSmartWalletAddress(smartAddress);
        console.log("✅ Smart Account Address computed:", smartAddress);
      } catch (error) {
        console.error("❌ Failed to get smart account address:", error);
      }
    };

    fetchSmartAccountAddress();
  }, [smartAccount]);

  // Fetch smart wallet USDT balance
  const refetchSmartWalletUsdt = async () => {
    if (!smartAccount || chainId !== bsc.id) return;

    try {
      // Get smart account address (should already be set by the useEffect above)
      const smartAddress = smartWalletAddress || await smartAccount.getAddress();

      if (!smartWalletAddress && smartAddress) {
        setSmartWalletAddress(smartAddress);
      }

      const balance = await retryWithRPCFailover(async (client) => {
        return await client.readContract({
          address: CONTRACTS.USDT[56],
          abi: USDT_ABI,
          functionName: "balanceOf",
          args: [smartAddress as Address],
        });
      });

      if (balance !== null) {
        setSmartWalletUsdtBalance(balance as bigint);

        console.log("🔍 Smart Wallet USDT Balance:", {
          smartAddress,
          rawBalance: balance.toString(),
          formatted: formatUnits(balance, usdtDecimals || 18)
        });
      }
    } catch (error) {
      console.error("Failed to fetch smart wallet USDT balance:", error);
    }
  };

  // Fetch balances when address or chainId changes
  // NOTE: Do NOT include smartWalletAddress or usdtDecimals in deps - they are set inside the effects
  useEffect(() => {
    if (address && chainId === bsc.id) {
      refetchBnb();
      refetchUsdt();
      refetchSmartWalletUsdt();
    }
  }, [address, smartAccount]);

  // Add debugging for USDT balance
  useEffect(() => {
    if (usdtBalance && address) {
      console.log("🔍 USDT Balance Debug:", {
        address,
        chainId,
        contractAddress: CONTRACTS.USDT[56],
        rawBalance: usdtBalance.toString(),
        decimals: usdtDecimals ? Number(usdtDecimals) : "unknown",
        formattedWithActualDecimals: usdtDecimals
          ? formatUnits(usdtBalance, Number(usdtDecimals))
          : "unknown",
        // Test different decimal interpretations
        as6Decimals: formatUnits(usdtBalance, 6),
        as18Decimals: formatUnits(usdtBalance, 18),
      });
    }
  }, [usdtBalance, usdtDecimals, address, chainId]);

  // Force BSC mainnet only
  const isOnBSC = chainId === bsc.id;

  // Helper function to read contracts
  const readContractHelper = async (params: {
    address: Address;
    abi: any;
    functionName: string;
    args?: any[];
  }) => {
    if (!publicClient) {
      throw new Error("Public client not available");
    }
    // Type assertion for EVM chains - Particle Network's usePublicClient returns viem PublicClient for EVM
    const evmClient = publicClient as any;
    if (!evmClient.readContract) {
      throw new Error("Public client does not support readContract (might be Solana Connection)");
    }
    return await evmClient.readContract(params);
  };

  // Helper function to write contracts
  const writeContractHelper = async (params: {
    address: Address;
    abi: any;
    functionName: string;
    args: any[];
  }) => {
    if (!primaryWallet || !address) throw new Error("Wallet not connected");
    if (!publicClient) throw new Error("Public client not available");

    setIsPending(true);
    try {
      const walletClient = primaryWallet.getWalletClient();
      const hash = await walletClient.writeContract({
        ...params,
        account: address as Address,
        chain: chain || bsc,
      });
      setTxHash(hash);
      setIsConfirming(true);

      // Wait for transaction receipt
      if (publicClient && 'waitForTransactionReceipt' in publicClient) {
        await (publicClient as any).waitForTransactionReceipt({ hash });
      }
      setIsConfirming(false);
      setIsPending(false);
      return hash;
    } catch (error) {
      setIsPending(false);
      setIsConfirming(false);
      throw error;
    }
  };

  const switchToBSC = async (): Promise<boolean> => {
    try {
      if (chainId !== bsc.id) {
        console.log("🔄 Switching to BSC Mainnet...");
        await switchChainAsync({ chainId: bsc.id });
        return true;
      }
      return true;
    } catch (error) {
      console.error("Failed to switch to BSC Mainnet:", error);
      return false;
    }
  };

  // Update fetchWalletData to only work with mainnet
  const fetchWalletData = async () => {
    if (!address || !isConnected) return null;

    // Only set loading if we don't have existing data (stale-while-revalidate)
    if (!walletData) {
      setIsLoading(true);
    }

    try {
      if (chainId !== bsc.id) {
        console.log("🔄 Must switch to BSC Mainnet...");
        await switchChainAsync({ chainId: bsc.id });
        setIsLoading(false);
        return null;
      }

      console.log("📊 Fetching wallet data for BSC Mainnet only...");

      // Format USDT balance using actual decimals from contract
      let formattedUsdtBalance = "0";
      if (usdtBalance) {
        try {
          const actualDecimals = usdtDecimals ? Number(usdtDecimals) : 6;
          formattedUsdtBalance = formatUnits(usdtBalance, actualDecimals);

          console.log("✅ USDT balance (BSC Mainnet):", {
            raw: usdtBalance.toString(),
            decimals: actualDecimals,
            formatted: formattedUsdtBalance,
          });
        } catch (error) {
          console.error("❌ Error formatting USDT balance:", error);
          formattedUsdtBalance = "0";
        }
      }

      // Format smart wallet USDT balance
      let formattedSmartWalletUsdtBalance = "0";
      if (smartWalletUsdtBalance !== null) {
        formattedSmartWalletUsdtBalance = formatUnits(smartWalletUsdtBalance, usdtDecimals || 18);
      }

      const walletInfo = {
        address,
        chainId: bsc.id, // Force mainnet
        isOnBSC: true,
        balances: {
          bnb: {
            raw: bnbBalance || BigInt(0),
            formatted: bnbBalance ? formatUnits(bnbBalance, 18) : "0",
            symbol: "BNB",
          },
          usdt: {
            raw: usdtBalance || BigInt(0),
            formatted: formattedUsdtBalance,
            symbol: "USDT",
          },
        },
        smartWallet: {
          address: smartWalletAddress,
          usdtBalance: formattedSmartWalletUsdtBalance,
          usdtBalanceRaw: smartWalletUsdtBalance?.toString() || "0",
        },
        canTrade: (bnbBalance || BigInt(0)) > parseUnits("0.001", 18),
        lastUpdated: new Date().toISOString(),
      };

      console.log("💰 Wallet info (BSC Mainnet only):", {
        address: walletInfo.address,
        usdtFormatted: walletInfo.balances.usdt.formatted,
        bnbFormatted: walletInfo.balances.bnb.formatted,
        canTrade: walletInfo.canTrade,
      });

      setWalletData(walletInfo);

      return createSerializableWalletData(walletInfo);
    } catch (error) {
      console.error("Error fetching wallet data:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // P2P Trading Contract Functions
  const createBuyOrderOnChain = async (
    usdtAmount: string,
    inrAmount: string,
    orderType: string
  ) => {
    if (!address || !primaryWallet) throw new Error("Wallet not connected");
    if (!isOnBSC) throw new Error("Please switch to a supported BSC network");

    const actualDecimals = usdtDecimals ? Number(usdtDecimals) : 6;
    const usdtAmountWei = parseUnits(usdtAmount, actualDecimals);
    const inrAmountWei = parseUnits(inrAmount, 2);

    setIsPending(true);
    try {
      const walletClient = primaryWallet.getWalletClient();
      const hash = await walletClient.writeContract({
        address: CONTRACTS.P2P_TRADING[56],
        abi: P2P_TRADING_ABI,
        functionName: "createBuyOrder",
        args: [usdtAmountWei, inrAmountWei, orderType],
        account: address as Address,
        chain: chain || bsc,
      });
      setTxHash(hash);
      setIsConfirming(true);

      // Wait for transaction receipt
      if (publicClient && 'waitForTransactionReceipt' in publicClient) {
        await (publicClient as any).waitForTransactionReceipt({ hash });
        setIsConfirming(false);
        setIsPending(false);
      }
    } catch (error) {
      setIsPending(false);
      setIsConfirming(false);
      throw error;
    }
  };

  const createDirectSellOrderOnChain = async (
    usdtAmount: string,
    inrAmount: string,
    orderType: string
  ) => {
    if (!address) throw new Error("Wallet not connected");
    if (!isOnBSC) throw new Error("Please switch to a supported BSC network");

    console.log("🔗 Creating direct sell order (user to admin):", {
      usdtAmount,
      inrAmount,
      orderType,
      contractAddress:
        CONTRACTS.P2P_TRADING[56],
      usdtContract: CONTRACTS.USDT[56],
    });

    if (!usdtAmount || !inrAmount) {
      throw new Error("Invalid amounts provided");
    }

    try {
      const actualDecimals = usdtDecimals ? Number(usdtDecimals) : 6;
      const usdtAmountWei = parseUnits(usdtAmount, actualDecimals);
      const inrAmountWei = parseUnits(inrAmount, 2); // INR with 2 decimals

      console.log("💰 Amounts for direct sell order:", {
        usdtAmount,
        inrAmount,
        usdtAmountWei: usdtAmountWei.toString(),
        inrAmountWei: inrAmountWei.toString(),
        actualDecimals,
      });

      // Get admin wallet address from contract
      const adminWallet = await readContractHelper({
        address: CONTRACTS.P2P_TRADING[56],
        abi: P2P_TRADING_ABI,
        functionName: "getAdminWallet",
      });

      console.log("🔍 Admin wallet address:", adminWallet);

      // Check user's USDT balance
      const userBalance = await readContractHelper({
        address: CONTRACTS.USDT[56],
        abi: USDT_ABI,
        functionName: "balanceOf",
        args: [address],
      });

      console.log(
        "💰 User USDT balance:",
        formatUnits(userBalance, actualDecimals)
      );

      if (userBalance < usdtAmountWei) {
        throw new Error(
          `Insufficient USDT balance. Required: ${usdtAmount} USDT, Available: ${formatUnits(
            userBalance,
            actualDecimals
          )} USDT`
        );
      }

      // Check allowance for admin wallet (not contract)
      const currentAllowance = await readContractHelper({
        address: CONTRACTS.USDT[56],
        abi: USDT_ABI,
        functionName: "allowance",
        args: [
          address,
          CONTRACTS.P2P_TRADING[56],
        ],
      });

      console.log(
        "🔍 Current allowance for P2P contract:",
        formatUnits(currentAllowance, actualDecimals)
      );

      if (currentAllowance < usdtAmountWei) {
        console.log("🔓 Need approval for P2P contract...");
        const approveAmount = usdtAmountWei * BigInt(2); // Approve 2x for future transactions

        console.log(
          "📝 Approving USDT for P2P contract...",
          formatUnits(approveAmount, actualDecimals)
        );

        await writeContractHelper({
          address: CONTRACTS.USDT[56],
          abi: USDT_ABI,
          functionName: "approve",
          args: [
            CONTRACTS.P2P_TRADING[
            chainId as keyof typeof CONTRACTS.P2P_TRADING
            ],
            approveAmount,
          ],
        });

        // Wait for approval transaction
        console.log("⏳ Waiting for USDT approval...");

        // Return early to let user confirm approval first
        throw new Error(
          "USDT approval required. Please confirm the approval transaction first, then try again."
        );
      }

      // Execute direct sell transfer
      console.log("📝 Executing direct sell transfer to admin...");
      await writeContractHelper({
        address: CONTRACTS.P2P_TRADING[56],
        abi: P2P_TRADING_ABI,
        functionName: "directSellTransfer",
        args: [usdtAmountWei, inrAmountWei, orderType, adminWallet],
      });
    } catch (error) {
      console.error("❌ Error in createDirectSellOrderOnChain:", error);
      throw new Error(
        `Failed to create direct sell order: ${error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  // Admin functions
  const verifyPaymentOnChain = async (orderId: number) => {
    if (!address) throw new Error("Wallet not connected");
    if (!isOnBSC) throw new Error("Please switch to a supported BSC network");

    await writeContractHelper({
      address: CONTRACTS.P2P_TRADING[56],
      abi: P2P_TRADING_ABI,
      functionName: "verifyPayment",
      args: [BigInt(orderId)],
    });
  };

  const completeBuyOrderOnChain = async (orderId: number) => {
    if (!address) throw new Error("Wallet not connected");
    if (!isOnBSC) throw new Error("Please switch to a supported BSC network");

    console.log("🔗 Completing buy order on chain for order ID:", orderId);

    if (!orderId || isNaN(orderId) || orderId <= 0) {
      throw new Error(
        `Invalid order ID: ${orderId}. Must be a positive integer.`
      );
    }

    try {
      // First, get the order details to know how much USDT we need
      const orderDetails = await readContractHelper({
        address:
          CONTRACTS.P2P_TRADING[56],
        abi: P2P_TRADING_ABI,
        functionName: "getOrder",
        args: [BigInt(orderId)],
      });

      const usdtAmountNeeded = orderDetails.usdtAmount;
      const actualDecimals = usdtDecimals ? Number(usdtDecimals) : 6;
      console.log(
        "📊 Order requires USDT amount:",
        formatUnits(usdtAmountNeeded, actualDecimals)
      );

      // Check admin's USDT balance
      const adminBalance = await readContractHelper({
        address: CONTRACTS.USDT[56],
        abi: USDT_ABI,
        functionName: "balanceOf",
        args: [address],
      });

      console.log(
        "💰 Admin USDT balance:",
        formatUnits(adminBalance, actualDecimals)
      );

      if (adminBalance < usdtAmountNeeded) {
        throw new Error(
          `Insufficient USDT balance. Required: ${formatUnits(
            usdtAmountNeeded,
            actualDecimals
          )}, Available: ${formatUnits(adminBalance, actualDecimals)}`
        );
      }

      // Check current allowance
      const currentAllowance = await readContractHelper({
        address: CONTRACTS.USDT[56],
        abi: USDT_ABI,
        functionName: "allowance",
        args: [
          address,
          CONTRACTS.P2P_TRADING[56],
        ],
      });

      console.log(
        "🔍 Current allowance:",
        formatUnits(currentAllowance, actualDecimals)
      );

      // If allowance is insufficient, approve first
      if (currentAllowance < usdtAmountNeeded) {
        console.log("🔓 Approving USDT for P2P contract...");

        // Approve double the amount for future transactions
        const approveAmount = usdtAmountNeeded * BigInt(2);

        await writeContractHelper({
          address: CONTRACTS.USDT[56],
          abi: USDT_ABI,
          functionName: "approve",
          args: [
            CONTRACTS.P2P_TRADING[
            chainId as keyof typeof CONTRACTS.P2P_TRADING
            ],
            approveAmount,
          ],
        });

        console.log("⏳ Waiting for approval transaction...");
        // Wait for approval to complete before proceeding
        throw new Error("USDT_APPROVAL_NEEDED");
      }

      // Now complete the buy order
      console.log("📝 Completing buy order on contract...");

      await writeContractHelper({
        address:
          CONTRACTS.P2P_TRADING[56],
        abi: P2P_TRADING_ABI,
        functionName: "completeBuyOrder",
        args: [BigInt(orderId)],
      });

      console.log("✅ Buy order completion transaction sent");
    } catch (error) {
      console.error("❌ Error in completeBuyOrderOnChain:", error);
      if (error instanceof Error && error.message === "USDT_APPROVAL_NEEDED") {
        throw error; // Re-throw approval needed error
      }
      throw new Error(
        `Failed to complete buy order: ${error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  const completeSellOrderOnChain = async (orderId: number) => {
    if (!address) throw new Error("Wallet not connected");
    if (!isOnBSC) throw new Error("Please switch to a supported BSC network");

    await writeContractHelper({
      address:
        CONTRACTS.P2P_TRADING[56],
      abi: P2P_TRADING_ABI,
      functionName: "completeSellOrder",
      args: [BigInt(orderId)],
    });
  };

  const confirmOrderReceivedOnChain = async (orderId: number) => {
    if (!address) throw new Error("Wallet not connected");
    if (!isOnBSC) throw new Error("Please switch to a supported BSC network");

    await writeContractHelper({
      address:
        CONTRACTS.P2P_TRADING[56],
      abi: P2P_TRADING_ABI,
      functionName: "confirmOrderReceived",
      args: [BigInt(orderId)],
    });
  };

  // Add this function to the P2P Trading functions section:
  const approveOrderOnChain = async (orderId: number) => {
    if (!address) throw new Error("Wallet not connected");
    if (!isOnBSC) throw new Error("Please switch to a supported BSC network");

    console.log("🔗 Approving order on chain for order ID:", orderId);

    if (!orderId || isNaN(orderId) || orderId <= 0) {
      throw new Error(
        `Invalid order ID: ${orderId}. Must be a positive integer.`
      );
    }

    try {
      await writeContractHelper({
        address:
          CONTRACTS.P2P_TRADING[56],
        abi: P2P_TRADING_ABI,
        functionName: "approveOrder",
        args: [BigInt(orderId)],
      });
    } catch (error) {
      console.error("❌ Error in approveOrderOnChain:", error);
      throw new Error(
        `Failed to approve order: ${error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  // USDT functions
  const transferUSDT = async (
    to: Address,
    amount: string,
    useGasStation = true
  ) => {
    if (!address) throw new Error("Wallet not connected");
    if (chainId !== bsc.id) throw new Error("Please switch to BSC Mainnet");

    console.log("💸 Starting USDT transfer on BSC Mainnet:", {
      from: address,
      to,
      amount,
      chainId: bsc.id,
      useGasStation,
    });

    try {
      if (useGasStation && GAS_STATION_ENABLED) {
        console.log("🚀 Using Gas Station for USDT transfer on BSC Mainnet...");

        const response = await fetch("/api/gas-station/admin-transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adminAddress: address,
            userAddress: to,
            usdtAmount: amount, // 🔥 This should be the correct amount from admin_center
            chainId: 56,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Gas Station transfer failed");
        }

        console.log(
          "✅ Gas Station transfer successful (BSC Mainnet):",
          result.txHash
        );
        return result.txHash;
      } else {
        // Fallback to direct transfer on mainnet
        console.log("⚡ Using direct USDT transfer on BSC Mainnet...");

        // 🔥 FIX: Use 18 decimals for BSC USDT
        const actualDecimals = 18; // BSC USDT uses 18 decimals
        const amountWei = parseUnits(amount, actualDecimals);
        const usdtContract = CONTRACTS.USDT[56];

        // Pre-flight checks
        const adminBalance = await readContractHelper({
          address: usdtContract,
          abi: USDT_ABI,
          functionName: "balanceOf",
          args: [address],
        });

        if (adminBalance < amountWei) {
          throw new Error(
            `Insufficient USDT balance. Required: ${amount}, Available: ${formatUnits(
              adminBalance,
              actualDecimals
            )}`
          );
        }

        // Execute direct transfer
        await writeContractHelper({
          address: usdtContract,
          abi: USDT_ABI,
          functionName: "transfer",
          args: [to, amountWei],
        });

        console.log(
          "✅ Direct USDT transfer transaction submitted (BSC Mainnet)"
        );
      }
    } catch (error) {
      console.error("❌ USDT transfer error:", error);
      throw new Error(
        `USDT transfer failed: ${error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  // Enhanced sell order with Gas Station
  const createSellOrder = async (
    usdtAmount: string,
    inrAmount: number,
    orderType: string,
    useGasStation = true
  ) => {
    if (!address) throw new Error("Wallet not connected");
    if (!isOnBSC) throw new Error("Please switch to a supported BSC network");

    console.log("🔗 Creating sell order:", {
      usdtAmount,
      inrAmount,
      orderType,
      useGasStation,
    });

    try {
      if (useGasStation && GAS_STATION_ENABLED) {
        // Use Gas Station API
        const response = await fetch("/api/gas-station/create-sell-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userAddress: address,
            usdtAmount,
            inrAmount,
            orderType,
            chainId,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Gas Station sell order creation failed"
          );
        }

        console.log("✅ Sell order created via Gas Station:", result.txHash);
        return result.txHash;
      } else {
        // Fallback to direct contract interaction
        const actualDecimals = usdtDecimals ? Number(usdtDecimals) : 6;
        const usdtAmountWei = parseUnits(usdtAmount, actualDecimals);
        const contractAddress =
          CONTRACTS.P2P_TRADING[56];

        if (
          !contractAddress ||
          contractAddress === "0x0000000000000000000000000000000000000000"
        ) {
          throw new Error(
            `P2P Trading contract not deployed on chain ${chainId}`
          );
        }

        await writeContractHelper({
          address: contractAddress,
          abi: P2P_TRADING_ABI,
          functionName: "directSellTransfer",
          args: [usdtAmountWei, BigInt(inrAmount * 100), orderType, address],
        });

        console.log("✅ Direct sell order created");
      }
    } catch (error) {
      console.error("❌ Sell order creation error:", error);
      throw error;
    }
  };

  // Enhanced buy order with Gas Station
  const createBuyOrder = async (
    usdtAmount: string,
    inrAmount: number,
    orderType: string,
    useGasStation = true
  ) => {
    if (!address) throw new Error("Wallet not connected");
    if (!isOnBSC) throw new Error("Please switch to a supported BSC network");

    console.log("🔗 Creating buy order:", {
      usdtAmount,
      inrAmount,
      orderType,
      useGasStation,
    });

    try {
      if (useGasStation && GAS_STATION_ENABLED) {
        // Use Gas Station API
        const response = await fetch("/api/gas-station/create-buy-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userAddress: address,
            usdtAmount,
            inrAmount,
            orderType,
            chainId,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Gas Station buy order creation failed"
          );
        }

        console.log("✅ Buy order created via Gas Station:", result.txHash);
        return result.txHash;
      } else {
        // Fallback to direct contract interaction (existing logic)
        const actualDecimals = usdtDecimals ? Number(usdtDecimals) : 6;
        const usdtAmountWei = parseUnits(usdtAmount, actualDecimals);
        const contractAddress =
          CONTRACTS.P2P_TRADING[56];

        await writeContractHelper({
          address: contractAddress,
          abi: P2P_TRADING_ABI,
          functionName: "createBuyOrder",
          args: [usdtAmountWei, BigInt(inrAmount * 100), orderType],
        });

        console.log("✅ Direct buy order created");
      }
    } catch (error) {
      console.error("❌ Buy order creation error:", error);
      throw error;
    }
  };

  // Auto-fetch wallet data when connected and on supported BSC networks
  useEffect(() => {
    if (isConnected && address && chainId === bsc.id) {
      fetchWalletData();
    } else if (isConnected && address && chainId !== bsc.id) {
      console.log("⚠️ Not on BSC Mainnet, showing warning state");
      setWalletData({
        address,
        chainId,
        balances: {
          bnb: { raw: "0", formatted: "0", symbol: "BNB" },
          usdt: { raw: "0", formatted: "0", symbol: "USDT" },
        },
        canTrade: false,
        lastUpdated: new Date().toISOString(),
        needsMainnet: true,
      });
    }
  }, [isConnected, address, chainId, bnbBalance, usdtBalance, smartWalletUsdtBalance, usdtDecimals, smartWalletAddress]);

  const refetchBalances = async () => {
    if (chainId === bsc.id) {
      await Promise.all([refetchBnb(), refetchUsdt(), refetchSmartWalletUsdt()]);
      await fetchWalletData();
    }
  };

  // Replace the existing createSellOrderOnChain function with this:
  const createSellOrderOnChain = async (
    usdtAmount: string,
    inrAmount: string,
    orderType: string
  ) => {
    if (!address) throw new Error("Wallet not connected");
    if (!isOnBSC) throw new Error("Please switch to a supported BSC network");

    console.log("🔗 Creating sell order with direct transfer:", {
      usdtAmount,
      inrAmount,
      orderType,
      userAddress: address,
      contractAddress:
        CONTRACTS.P2P_TRADING[56],
    });

    if (!usdtAmount || !inrAmount) {
      throw new Error("Invalid amounts provided");
    }

    try {
      const actualDecimals = usdtDecimals ? Number(usdtDecimals) : 6;
      const usdtAmountWei = parseUnits(usdtAmount, actualDecimals);

      console.log("💰 Amounts for sell order:", {
        usdtAmount,
        inrAmount,
        usdtAmountWei: usdtAmountWei.toString(),
        actualDecimals,
        userAddress: address,
      });

      let adminWallet: string;
      try {
        adminWallet = (await readContractHelper({
          address:
            CONTRACTS.P2P_TRADING[
            chainId as keyof typeof CONTRACTS.P2P_TRADING
            ],
          abi: P2P_TRADING_ABI,
          functionName: "getAdminWallet",
        })) as string;
        console.log("🔍 Admin wallet from getAdminWallet():", adminWallet);
      } catch (error) {
        console.warn(
          "⚠️ getAdminWallet() failed, trying admin() function:",
          error
        );
        try {
          adminWallet = (await readContractHelper({
            address:
              CONTRACTS.P2P_TRADING[
              chainId as keyof typeof CONTRACTS.P2P_TRADING
              ],
            abi: P2P_TRADING_ABI,
            functionName: "admin",
          })) as string;
          console.log("🔍 Admin wallet from admin():", adminWallet);
        } catch (adminError) {
          console.error(
            "❌ Both getAdminWallet() and admin() failed:",
            adminError
          );

          adminWallet = "0x0000000000000000000000000000000000000000";
          if (adminWallet === "0x0000000000000000000000000000000000000000") {
            throw new Error(
              "Cannot determine admin wallet address. Please contact support."
            );
          }
        }
      }

      // Check user's USDT balance
      const userBalance = await readContractHelper({
        address: CONTRACTS.USDT[56],
        abi: USDT_ABI,
        functionName: "balanceOf",
        args: [address],
      });

      console.log(
        "💰 User USDT balance:",
        formatUnits(userBalance, actualDecimals)
      );

      if (userBalance < usdtAmountWei) {
        throw new Error(
          `Insufficient USDT balance. Required: ${usdtAmount} USDT, Available: ${formatUnits(
            userBalance,
            actualDecimals
          )} USDT`
        );
      }

      // Check allowance for P2P contract
      const currentAllowance = await readContractHelper({
        address: CONTRACTS.USDT[56],
        abi: USDT_ABI,
        functionName: "allowance",
        args: [
          address,
          CONTRACTS.P2P_TRADING[56],
        ],
      });

      console.log(
        "🔍 Current allowance for P2P contract:",
        formatUnits(currentAllowance, actualDecimals)
      );

      if (currentAllowance < usdtAmountWei) {
        console.log("🔓 Need approval for P2P contract...");
        const approveAmount = usdtAmountWei * BigInt(2); // Approve 2x for future transactions

        console.log(
          "📝 Approving USDT for P2P contract...",
          formatUnits(approveAmount, actualDecimals)
        );

        await writeContractHelper({
          address: CONTRACTS.USDT[56],
          abi: USDT_ABI,
          functionName: "approve",
          args: [
            CONTRACTS.P2P_TRADING[
            chainId as keyof typeof CONTRACTS.P2P_TRADING
            ],
            approveAmount,
          ],
        });

        // Return a special status to indicate approval is needed
        throw new Error("USDT_APPROVAL_NEEDED");
      }

      // Execute direct sell transfer to admin
      console.log("📝 Executing direct sell transfer to admin...");
      await writeContractHelper({
        address:
          CONTRACTS.P2P_TRADING[56],
        abi: P2P_TRADING_ABI,
        functionName: "directSellTransfer",
        args: [
          usdtAmountWei,
          parseUnits(inrAmount, 2),
          orderType,
          adminWallet as `0x${string}`,
        ],
      });

      console.log("✅ Direct sell transfer executed successfully");
    } catch (error) {
      console.error("❌ Error in createSellOrderOnChain:", error);
      if (error instanceof Error && error.message === "USDT_APPROVAL_NEEDED") {
        throw error; // Re-throw the approval needed error
      }
      throw new Error(
        `Failed to create sell order: ${error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  // Add admin function to execute the transfer
  const adminExecuteSellTransfer = async (
    userAddress: string,
    usdtAmount: string,
    inrAmount: string,
    orderType: string
  ) => {
    if (!address) throw new Error("Admin wallet not connected");
    if (!isOnBSC) throw new Error("Please switch to a supported BSC network");

    console.log("🔗 Admin executing sell transfer:", {
      userAddress,
      usdtAmount,
      inrAmount,
      orderType,
      adminAddress: address,
    });

    try {
      const actualDecimals = usdtDecimals ? Number(usdtDecimals) : 6;
      const usdtAmountWei = parseUnits(usdtAmount, actualDecimals);
      const inrAmountWei = parseUnits(inrAmount, 2);

      // Execute admin-paid transfer
      console.log("📝 Executing admin-paid sell transfer...");
      await writeContractHelper({
        address:
          CONTRACTS.P2P_TRADING[56],
        abi: P2P_TRADING_ABI,
        functionName: "adminExecuteSellTransfer",
        args: [
          userAddress as `0x${string}`,
          usdtAmountWei,
          inrAmountWei,
          orderType,
        ],
      });
    } catch (error) {
      console.error("❌ Error in adminExecuteSellTransfer:", error);
      throw new Error(
        `Failed to execute admin sell transfer: ${error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  const approveUSDT = async (spender: Address, amount: string) => {
    if (!address) throw new Error("Wallet not connected");
    if (!isOnBSC) throw new Error("Please switch to a supported BSC network");

    console.log("🔓 Approving USDT:", {
      spender,
      amount,
      from: address,
      chainId,
    });

    try {
      const actualDecimals = usdtDecimals ? Number(usdtDecimals) : 6;
      const amountWei = parseUnits(amount, actualDecimals);

      await writeContractHelper({
        address: CONTRACTS.USDT[56],
        abi: USDT_ABI,
        functionName: "approve",
        args: [spender, amountWei],
      });

      console.log("✅ USDT approval transaction submitted");
    } catch (error) {
      console.error("❌ USDT approval error:", error);
      throw new Error(
        `USDT approval failed: ${error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  // Add this function to handle Gas Station approvals:




  // Add new function to execute transfer after approval

  // Add new function to check if user needs manual approval




  return {
    address,
    isConnected,
    isConnecting,
    chainId,
    walletData,
    isLoading: isLoading || isPending || isConfirming,
    fetchWalletData,
    refetchBalances,
    switchChain: switchChainAsync,
    isOnBSC,
    switchToBSC,
    canTrade: walletData?.canTrade || false,

    createBuyOrderOnChain,
    createDirectSellOrderOnChain,
    createSellOrderOnChain,
    verifyPaymentOnChain,
    completeBuyOrderOnChain,
    completeSellOrderOnChain,
    confirmOrderReceivedOnChain,
    approveOrderOnChain,
    adminExecuteSellTransfer,

    transferUSDT,
    approveUSDT,

    createSellOrder,
    createBuyOrder,

    hash: txHash,
    isPending,
    isConfirming,
  };
}