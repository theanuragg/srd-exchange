import { useState, useEffect, useRef } from "react";
import {
  useAccount,
  useSwitchChain,
  usePublicClient,
  useWallets,
  useSmartAccount,
  useAddress,
} from "@particle-network/connectkit";
import { parseUnits, formatUnits, Address } from "viem";
import { bsc } from "@particle-network/connectkit/chains";
import { PublicClient } from "viem";
import { retryWithRPCFailover, rpcManager } from "@/lib/rpcManager";
import { sendSponsoredContractWrite } from "@/lib/sponsoredTransactions";

const GAS_STATION_ENABLED =
  process.env.NEXT_PUBLIC_GAS_STATION_ENABLED === "true";

const CONTRACTS = {
  USDT: {
    [56]: "0x55d398326f99059fF775485246999027B3197955" as Address,
  },
  P2P_TRADING: {
    [56]: "0xbfb247eA56F806607f2346D9475F669F30EAf2fB" as Address,
  },
};

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

const serializeBigInt = (value: bigint): string => {
  return value.toString();
};

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
  const { address: eoaAddress, isConnected, chainId, chain, status } = useAccount();
  const smartAddress = useAddress();
  const address = smartAddress ?? eoaAddress;
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
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

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

  useEffect(() => {
    if (address && chainId === bsc.id) {
      refetchBnb();
      refetchUsdt();
    }
  }, [address, chainId]);

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
        as6Decimals: formatUnits(usdtBalance, 6),
        as18Decimals: formatUnits(usdtBalance, 18),
      });
    }
  }, [usdtBalance, usdtDecimals, address, chainId]);

  const isOnBSC = chainId === bsc.id;

  const readContractHelper = async (params: {
    address: Address;
    abi: any;
    functionName: string;
    args?: any[];
  }) => {
    if (!publicClient) {
      throw new Error("Public client not available");
    }
    const evmClient = publicClient as any;
    if (!evmClient.readContract) {
      throw new Error("Public client does not support readContract (might be Solana Connection)");
    }
    return await evmClient.readContract(params);
  };

  const writeContractHelper = async (params: {
    address: Address;
    abi: any;
    functionName: string;
    args: any[];
  }) => {
    if (!address) throw new Error("Wallet not connected");

    setIsPending(true);
    try {
      if (chainId === bsc.id && smartAccount) {
        const hash = await sendSponsoredContractWrite({
          smartAccount,
          chainId,
          address: params.address,
          abi: params.abi,
          functionName: params.functionName,
          args: params.args,
        });

        setTxHash(hash);
        setIsConfirming(false);
        setIsPending(false);
        return hash;
      }

      if (!primaryWallet) throw new Error("Wallet not connected");
      if (!publicClient) throw new Error("Public client not available");

      const walletClient = primaryWallet.getWalletClient();
      const hash = await walletClient.writeContract({
        ...params,
        account: address as Address,
        chain: chain || bsc,
      });
      setTxHash(hash);
      setIsConfirming(true);

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

  const fetchWalletData = async () => {
    if (!address || !isConnected) return null;

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

      console.log("📊 Fetching wallet data for BSC Mainnet...");

      let formattedUsdtBalance = "0";
      if (usdtBalance) {
        try {
          const actualDecimals = usdtDecimals ? Number(usdtDecimals) : 18;
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

      const walletInfo = {
        address,
        chainId: bsc.id,
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
        canTrade: true,
        lastUpdated: new Date().toISOString(),
      };

      console.log("💰 Wallet info (BSC Mainnet):", {
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

  const createBuyOrderOnChain = async (
    usdtAmount: string,
    inrAmount: string,
    orderType: string
  ) => {
    if (!address) throw new Error("Wallet not connected");
    if (!isOnBSC) throw new Error("Please switch to a supported BSC network");

    const actualDecimals = usdtDecimals ? Number(usdtDecimals) : 18;
    const usdtAmountWei = parseUnits(usdtAmount, actualDecimals);
    const inrAmountWei = parseUnits(inrAmount, 2);

    try {
      return await writeContractHelper({
        address: CONTRACTS.P2P_TRADING[56],
        abi: P2P_TRADING_ABI,
        functionName: "createBuyOrder",
        args: [usdtAmountWei, inrAmountWei, orderType],
      });
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
      contractAddress: CONTRACTS.P2P_TRADING[56],
      usdtContract: CONTRACTS.USDT[56],
    });

    if (!usdtAmount || !inrAmount) {
      throw new Error("Invalid amounts provided");
    }

    try {
      const actualDecimals = usdtDecimals ? Number(usdtDecimals) : 18;
      const usdtAmountWei = parseUnits(usdtAmount, actualDecimals);
      const inrAmountWei = parseUnits(inrAmount, 2);

      console.log("💰 Amounts for direct sell order:", {
        usdtAmount,
        inrAmount,
        usdtAmountWei: usdtAmountWei.toString(),
        inrAmountWei: inrAmountWei.toString(),
        actualDecimals,
      });

      const adminWallet = await readContractHelper({
        address: CONTRACTS.P2P_TRADING[56],
        abi: P2P_TRADING_ABI,
        functionName: "getAdminWallet",
      });

      console.log("🔍 Admin wallet address:", adminWallet);

      const userBalance = await readContractHelper({
        address: CONTRACTS.USDT[56],
        abi: USDT_ABI,
        functionName: "balanceOf",
        args: [address],
      });

      if (userBalance < usdtAmountWei) {
        throw new Error(
          `Insufficient USDT balance. Required: ${usdtAmount} USDT, Available: ${formatUnits(
            userBalance,
            actualDecimals
          )} USDT`
        );
      }

      const currentAllowance = await readContractHelper({
        address: CONTRACTS.USDT[56],
        abi: USDT_ABI,
        functionName: "allowance",
        args: [
          address,
          CONTRACTS.P2P_TRADING[56],
        ],
      });

      if (currentAllowance < usdtAmountWei) {
        console.log("🔓 Need approval for P2P contract...");
        const approveAmount = usdtAmountWei * BigInt(2);

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

        throw new Error(
          "USDT approval required. Please confirm the approval transaction first, then try again."
        );
      }

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
      const orderDetails = await readContractHelper({
        address: CONTRACTS.P2P_TRADING[56],
        abi: P2P_TRADING_ABI,
        functionName: "getOrder",
        args: [BigInt(orderId)],
      });

      const usdtAmountNeeded = orderDetails.usdtAmount;
      const actualDecimals = usdtDecimals ? Number(usdtDecimals) : 18;

      const adminBalance = await readContractHelper({
        address: CONTRACTS.USDT[56],
        abi: USDT_ABI,
        functionName: "balanceOf",
        args: [address],
      });

      if (adminBalance < usdtAmountNeeded) {
        throw new Error(
          `Insufficient USDT balance. Required: ${formatUnits(
            usdtAmountNeeded,
            actualDecimals
          )}, Available: ${formatUnits(adminBalance, actualDecimals)}`
        );
      }

      const currentAllowance = await readContractHelper({
        address: CONTRACTS.USDT[56],
        abi: USDT_ABI,
        functionName: "allowance",
        args: [
          address,
          CONTRACTS.P2P_TRADING[56],
        ],
      });

      if (currentAllowance < usdtAmountNeeded) {
        console.log("🔓 Approving USDT for P2P contract...");
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

        throw new Error("USDT_APPROVAL_NEEDED");
      }

      console.log("📝 Completing buy order on contract...");
      await writeContractHelper({
        address: CONTRACTS.P2P_TRADING[56],
        abi: P2P_TRADING_ABI,
        functionName: "completeBuyOrder",
        args: [BigInt(orderId)],
      });

      console.log("✅ Buy order completion transaction sent");
    } catch (error) {
      console.error("❌ Error in completeBuyOrderOnChain:", error);
      if (error instanceof Error && error.message === "USDT_APPROVAL_NEEDED") {
        throw error;
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
      address: CONTRACTS.P2P_TRADING[56],
      abi: P2P_TRADING_ABI,
      functionName: "completeSellOrder",
      args: [BigInt(orderId)],
    });
  };

  const confirmOrderReceivedOnChain = async (orderId: number) => {
    if (!address) throw new Error("Wallet not connected");
    if (!isOnBSC) throw new Error("Please switch to a supported BSC network");

    await writeContractHelper({
      address: CONTRACTS.P2P_TRADING[56],
      abi: P2P_TRADING_ABI,
      functionName: "confirmOrderReceived",
      args: [BigInt(orderId)],
    });
  };

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
        address: CONTRACTS.P2P_TRADING[56],
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

  const transferUSDT = async (
    to: Address,
    amount: string,
  ) => {
    if (!address) throw new Error("Wallet not connected");
    if (chainId !== bsc.id) throw new Error("Please switch to BSC Mainnet");

    console.log("💸 Starting sponsored USDT transfer on BSC Mainnet:", {
      from: address,
      to,
      amount,
      chainId: bsc.id,
    });

    try {
      console.log("🚀 Using sponsored smart-account USDT transfer on BSC Mainnet...");

      const actualDecimals = 18;
      const amountWei = parseUnits(amount, actualDecimals);
      const usdtContract = CONTRACTS.USDT[56];

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

      return await writeContractHelper({
        address: usdtContract,
        abi: USDT_ABI,
        functionName: "transfer",
        args: [to, amountWei],
      });
    } catch (error) {
      console.error("❌ USDT transfer error:", error);
      throw new Error(
        `USDT transfer failed: ${error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  const createSellOrder = async (
    usdtAmount: string,
    inrAmount: number,
    orderType: string,
  ) => {
    if (!address) throw new Error("Wallet not connected");
    if (!isOnBSC) throw new Error("Please switch to a supported BSC network");

    console.log("🔗 Creating sell order:", {
      usdtAmount,
      inrAmount,
      orderType,
    });

    try {
      const actualDecimals = usdtDecimals ? Number(usdtDecimals) : 18;
      const usdtAmountWei = parseUnits(usdtAmount, actualDecimals);
      const contractAddress = CONTRACTS.P2P_TRADING[56];

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
    } catch (error) {
      console.error("❌ Sell order creation error:", error);
      throw error;
    }
  };

  const createBuyOrder = async (
    usdtAmount: string,
    inrAmount: number,
    orderType: string,
  ) => {
    if (!address) throw new Error("Wallet not connected");
    if (!isOnBSC) throw new Error("Please switch to a supported BSC network");

    console.log("🔗 Creating buy order:", {
      usdtAmount,
      inrAmount,
      orderType,
    });

    try {
      const actualDecimals = usdtDecimals ? Number(usdtDecimals) : 18;
      const usdtAmountWei = parseUnits(usdtAmount, actualDecimals);
      const contractAddress = CONTRACTS.P2P_TRADING[56];

      await writeContractHelper({
        address: contractAddress,
        abi: P2P_TRADING_ABI,
        functionName: "createBuyOrder",
        args: [usdtAmountWei, BigInt(inrAmount * 100), orderType],
      });

      console.log("✅ Direct buy order created");
    } catch (error) {
      console.error("❌ Buy order creation error:", error);
      throw error;
    }
  };

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
  }, [isConnected, address, chainId, bnbBalance, usdtBalance, usdtDecimals]);

  const refetchBalances = async () => {
    if (chainId === bsc.id) {
      await Promise.all([refetchBnb(), refetchUsdt()]);
      await fetchWalletData();
    }
  };

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
      contractAddress: CONTRACTS.P2P_TRADING[56],
    });

    if (!usdtAmount || !inrAmount) {
      throw new Error("Invalid amounts provided");
    }

    try {
      const actualDecimals = usdtDecimals ? Number(usdtDecimals) : 18;
      const usdtAmountWei = parseUnits(usdtAmount, actualDecimals);

      let adminWallet: string;
      try {
        adminWallet = (await readContractHelper({
          address: CONTRACTS.P2P_TRADING[
          chainId as keyof typeof CONTRACTS.P2P_TRADING
          ],
          abi: P2P_TRADING_ABI,
          functionName: "getAdminWallet",
        })) as string;
      } catch (error) {
        console.warn(
          "⚠️ getAdminWallet() failed, trying admin() function:",
          error
        );
        try {
          adminWallet = (await readContractHelper({
            address: CONTRACTS.P2P_TRADING[
            chainId as keyof typeof CONTRACTS.P2P_TRADING
            ],
            abi: P2P_TRADING_ABI,
            functionName: "admin",
          })) as string;
        } catch (adminError) {
          console.error("❌ Both getAdminWallet() and admin() failed:", adminError);
          throw new Error(
            "Cannot determine admin wallet address. Please contact support."
          );
        }
      }

      const userBalance = await readContractHelper({
        address: CONTRACTS.USDT[56],
        abi: USDT_ABI,
        functionName: "balanceOf",
        args: [address],
      });

      if (userBalance < usdtAmountWei) {
        throw new Error(
          `Insufficient USDT balance. Required: ${usdtAmount} USDT, Available: ${formatUnits(
            userBalance,
            actualDecimals
          )} USDT`
        );
      }

      const currentAllowance = await readContractHelper({
        address: CONTRACTS.USDT[56],
        abi: USDT_ABI,
        functionName: "allowance",
        args: [address, CONTRACTS.P2P_TRADING[56]],
      });

      if (currentAllowance < usdtAmountWei) {
        console.log("🔓 Need approval for P2P contract...");
        const approveAmount = usdtAmountWei * BigInt(2);

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

        throw new Error("USDT_APPROVAL_NEEDED");
      }

      console.log("📝 Executing direct sell transfer to admin...");
      await writeContractHelper({
        address: CONTRACTS.P2P_TRADING[56],
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
        throw error;
      }
      throw new Error(
        `Failed to create sell order: ${error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

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
      const actualDecimals = usdtDecimals ? Number(usdtDecimals) : 18;
      const usdtAmountWei = parseUnits(usdtAmount, actualDecimals);
      const inrAmountWei = parseUnits(inrAmount, 2);

      console.log("📝 Executing admin-paid sell transfer...");
      await writeContractHelper({
        address: CONTRACTS.P2P_TRADING[56],
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
      const actualDecimals = usdtDecimals ? Number(usdtDecimals) : 18;
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

  return {
    address,
    eoaAddress,
    smartWalletAddress: smartAddress,
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
