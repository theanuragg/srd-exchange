import { useState, useEffect } from "react";
import { useIsSignedIn, useEvmAddress, useEvmAccounts, useEvmSmartAccounts, useSignEvmHash, useSignEvmTransaction } from '@coinbase/cdp-hooks';
import { parseUnits, formatUnits, Address, type Hex, type TransactionSerializableEIP1559 } from "viem";
import { retryWithRPCFailover } from "@/lib/rpcManager";
import { sendSponsoredContractWrite } from "@/lib/sponsoredTransactions";
import { getCounterfactualAddress, buildDeployTxData, broadcastRawTx, isAccountDeployed } from "@/lib/userOpBuilder";
import { wrapCoinbaseSmartWalletSignature } from "@/lib/coinbaseSmartWalletSignature";

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
  const { isSignedIn } = useIsSignedIn();
  const { evmAddress: smartOrEoaAddress } = useEvmAddress();
  const { evmAccounts: eoaAccounts } = useEvmAccounts();
  const eoaAddress = (eoaAccounts?.[0]?.address as Address) ?? smartOrEoaAddress;
  const { signEvmHash } = useSignEvmHash();
  const signHash = async ({
    hash,
    smartAccountAddress,
    chainId: _chainId = 56,
  }: {
    hash: Hex;
    smartAccountAddress?: Address;
    chainId?: number;
  }) => {
    if (!eoaAddress) {
      throw new Error("EVM account not found: wallet EOA address is not available. Please sign in again.");
    }
    if (!isSignedIn) {
      throw new Error("EVM account not found: user session has expired. Please sign in again.");
    }
    try {
      const result = await signEvmHash({ evmAccount: eoaAddress as `0x${string}`, hash });
      if (smartAccountAddress) {
        return wrapCoinbaseSmartWalletSignature(result.signature);
      }
      return result.signature;
    } catch (err: any) {
      let isAdBlockerActive = false;
      try {
        await fetch("https://cca-lite.coinbase.com/amp", { mode: "no-cors" });
      } catch (fetchErr) {
        isAdBlockerActive = true;
      }

      if (isAdBlockerActive) {
        throw new Error(
          "EVM account not found: Failed to reach Coinbase signing service due to an active ad blocker or content blocker. " +
          "Please disable Brave Shields or your ad blocker extension for this site and try again."
        );
      }

      if (err?.message?.includes?.("Failed to fetch")) {
        throw new Error(
          "EVM account not found: Failed to reach Coinbase signing service. " +
          "If you have an ad blocker or content blocker enabled, please disable it for this site and try again."
        );
      }
      throw err;
    }
  };
  const smartAccounts = useEvmSmartAccounts();
  const cdpSmartAccount: Address | undefined = (() => {
    if (!smartAccounts?.evmSmartAccounts?.length) return undefined;
    const addr = smartAccounts.evmSmartAccounts[0].address as Address;
    if (addr.toLowerCase() === (eoaAddress ?? "").toLowerCase()) return undefined;
    return addr;
  })();
  const [isCdpSmartAccountDeployed, setIsCdpSmartAccountDeployed] = useState<boolean | null>(null);
  useEffect(() => {
    if (!cdpSmartAccount) {
      setIsCdpSmartAccountDeployed(null);
      return;
    }
    let cancelled = false;
    isAccountDeployed(cdpSmartAccount).then(deployed => {
      if (!cancelled) setIsCdpSmartAccountDeployed(deployed);
    });
    return () => { cancelled = true; };
  }, [cdpSmartAccount]);
  const CACHE_PREFIX = "swa_";
  const getCached = (eoa: Address | undefined): Address | undefined => {
    if (!eoa) return undefined;
    try {
      const c = localStorage.getItem(CACHE_PREFIX + eoa.toLowerCase());
      if (c && c.startsWith("0x") && c.length === 42) return c as Address;
    } catch {}
    return undefined;
  };
  const setCached = (eoa: Address, addr: Address) => {
    try { localStorage.setItem(CACHE_PREFIX + eoa.toLowerCase(), addr); } catch {}
  };
  const [fallbackSmartAccount, setFallbackSmartAccount] = useState<Address | undefined>(
    getCached(eoaAddress)
  );
  useEffect(() => {
    if (!eoaAddress) return;
    const cached = getCached(eoaAddress);
    if (cached) { setFallbackSmartAccount(cached); return; }
    getCounterfactualAddress(eoaAddress as Address).then(cf => {
      setFallbackSmartAccount(cf);
      setCached(eoaAddress as Address, cf);
    }).catch(err => {
      console.error("❌ Counterfactual address failed:", err);
    });
  }, [eoaAddress]);
  const shouldUseCdpSmartAccount = !!(cdpSmartAccount && isCdpSmartAccountDeployed);
  const smartAccountAddress = shouldUseCdpSmartAccount ? cdpSmartAccount : fallbackSmartAccount;
  const address = smartAccountAddress ?? eoaAddress;
  const smartWalletAddress = smartAccountAddress;
  const isSmartAccountReady = !!(
    (cdpSmartAccount && isCdpSmartAccountDeployed)
      ? true
      : (fallbackSmartAccount ?? getCached(eoaAddress))
  );
  const isConnected = isSignedIn;
  const isConnecting = false;
  const chainId = 56;
  const [walletData, setWalletData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bnbBalance, setBnbBalance] = useState<bigint | null>(null);
  const [usdtBalance, setUsdtBalance] = useState<bigint | null>(null);
  const [usdtDecimals, setUsdtDecimals] = useState<number | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const balanceAddress = address;

  const refetchBnb = async () => {
    if (!balanceAddress) return;

    try {
      const balance = await retryWithRPCFailover(async (client) => {
        return await client.getBalance({ address: balanceAddress as Address });
      });

      if (balance !== null) {
        setBnbBalance(balance);
      }
    } catch (error) {
      console.error("Failed to fetch BNB balance:", error);
    }
  };

  const refetchUsdt = async () => {
    if (!balanceAddress) return;

    try {
      const balance = await retryWithRPCFailover(async (client) => {
        return await client.readContract({
          address: CONTRACTS.USDT[56],
          abi: USDT_ABI,
          functionName: "balanceOf",
          args: [balanceAddress as Address],
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
    if (balanceAddress) {
      refetchBnb();
      refetchUsdt();
    }
  }, [balanceAddress]);

  useEffect(() => {
    if (usdtBalance && balanceAddress) {
      console.log("🔍 USDT Balance Debug:", {
        address: balanceAddress,
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
  }, [usdtBalance, usdtDecimals, balanceAddress, chainId]);

  const isOnBSC = true;

  const readContractHelper = async (params: {
    address: Address;
    abi: any;
    functionName: string;
    args?: any[];
  }): Promise<any> => {
    return await retryWithRPCFailover(async (client) => {
      return await client.readContract({
        address: params.address,
        abi: params.abi,
        functionName: params.functionName,
        args: params.args,
      });
    });
  };

  const { signEvmTransaction } = useSignEvmTransaction();

  const deployAccount = async (): Promise<Hex> => {
    if (!eoaAddress) throw new Error("EOA not available");
    const smartAccountAddr = smartAccountAddress;
    if (!smartAccountAddr) throw new Error("Smart account address not available");
    const alreadyDeployed = await isAccountDeployed(smartAccountAddr);
    if (alreadyDeployed) {
      console.log("✅ Smart account already deployed:", smartAccountAddr);
      return "0x" as Hex;
    }
    setIsPending(true);
    try {
      const { to, data } = buildDeployTxData(eoaAddress);
      const nonceResult = await retryWithRPCFailover(async (client) => {
        return client.getTransactionCount({ address: eoaAddress! });
      });
      if (nonceResult === null) throw new Error("Failed to get EOA nonce");
      const nonce = nonceResult;

      const tx: TransactionSerializableEIP1559 = {
        chainId: 56,
        nonce,
        maxFeePerGas: 5000000000n,
        maxPriorityFeePerGas: 2000000000n,
        gas: 300000n,
        to,
        data,
        value: 0n,
      };

      const { signedTransaction } = await signEvmTransaction({
        evmAccount: eoaAddress,
        transaction: tx,
      });

      const deployTxHash = await broadcastRawTx(signedTransaction);
      console.log("⏳ Waiting for deploy tx:", deployTxHash);

      for (let i = 0; i < 30; i++) {
        const deployed = await isAccountDeployed(smartAccountAddress!);
        if (deployed) {
          console.log("✅ Smart account deployed:", smartAccountAddress);
          setIsPending(false);
          return deployTxHash;
        }
        await new Promise(r => setTimeout(r, 2000));
      }
      throw new Error("Deployment timed out after 60s");
    } catch (error) {
      setIsPending(false);
      throw error;
    }
  };

  const writeContractHelper = async (params: {
    address: Address;
    abi: any;
    functionName: string;
    args: any[];
  }) => {
    const smartAccountAddr = smartAccountAddress;
    if (!address) throw new Error("Wallet not connected");
    if (!smartAccountAddr) throw new Error("Smart account not available");

    setIsPending(true);
    try {
      const hash = await sendSponsoredContractWrite({
        smartAccountAddress: smartAccountAddr,
        eoaAddress: eoaAddress as Address,
        address: params.address,
        abi: params.abi,
        functionName: params.functionName,
        args: params.args,
        skipInitCode: shouldUseCdpSmartAccount,
      }, signHash);

      setTxHash(hash);
      setIsConfirming(false);
      setIsPending(false);
      return hash;
    } catch (error) {
      setIsPending(false);
      setIsConfirming(false);
      throw error;
    }
  };

  const fetchWalletData = async () => {
    if (!balanceAddress || !isConnected) return null;

    if (!walletData) {
      setIsLoading(true);
    }

    try {
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
        address: balanceAddress,
        chainId: 56,
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

    console.log("💸 Starting sponsored USDT transfer on BSC Mainnet:", {
      from: address,
      to,
      amount,
      chainId: 56,
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
    if (isConnected && balanceAddress) {
      fetchWalletData();
    }
  }, [isConnected, balanceAddress, bnbBalance, usdtBalance, usdtDecimals]);

  const refetchBalances = async () => {
    await Promise.all([refetchBnb(), refetchUsdt()]);
    await fetchWalletData();
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
    smartWalletAddress,
    isConnected,
    isConnecting,
    isSmartAccountReady,
    shouldSkipInitCode: shouldUseCdpSmartAccount,
    chainId,
    walletData,
    isLoading: isLoading || isPending || isConfirming,
    fetchWalletData,
    refetchBalances,
    switchChain: async () => {},
    isOnBSC: true,
    switchToBSC: async () => true,
    canTrade: true,

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

    deployAccount,

    signHash,

    hash: txHash,
    isPending,
    isConfirming,
  };
}
