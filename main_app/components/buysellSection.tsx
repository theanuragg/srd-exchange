"use client";

import { Copy, User, ExternalLink, RefreshCw, History } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HistoryDrawer from "./HistoryDrawer";
import { useWalletManager } from "@/hooks/useWalletManager";
import { useUserOrders } from "@/hooks/useUserOrders";
import { useRates } from "@/hooks/useRates";
import { useModalState } from "@/hooks/useModalState";
import {
  BUY_CDM_MAX_USDT,
  BUY_CDM_MIN_USDT,
  SELL_CDM_MAX_USDT,
  SELL_CDM_MIN_INR,
  getSellCdmMinUsdt,
} from "@/lib/order-limits";
import BuyCDMModal from "./modal/buy-cdm";
import BuyUPIModal from "./modal/buy-upi";
import SellUPIModal from "./modal/sell-upi";
import SellCDMModal from "./modal/sell-cdm";
import BankDetailsModal, { BankDetailsData } from "./modal/bank-details-modal";
import { useBankDetails } from "@/hooks/useBankDetails";
import { parseAbi, parseUnits, formatUnits, type Address } from "viem";
import { bsc } from "@particle-network/connectkit/chains";
import { sendSponsoredContractWriteDetailed } from "@/lib/sponsoredTransactions";
import { retryWithRPCFailover } from "@/lib/rpcManager";

import {
  ConnectButton,
  useSmartAccount,
} from "@particle-network/connectkit";

const CONTRACTS = {
  P2P_TRADING: {
    [56]: "0xD64d78dCFc550F131813a949c27b2b439d908F54" as `0x${string}`,
  },
  USDT: {
    [56]: "0x55d398326f99059fF775485246999027B3197955" as `0x${string}`,
  },
};

// Admin wallet address for receiving USDT from sell orders
const ADMIN_WALLET_ADDRESS = "0xA4c9991e1bA3F4aeB0D360186Ba6f8f7c66cC2BF" as `0x${string}`;

const USDT_ABI = [
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
] as const;

export default function BuySellSection() {
  // Universal Limits
  const GLOBAL_MIN_USDT = 0.1;

  // Buy Limits
  const BUY_UPI_MAX_USDT = 1;
  // Sell Limits
  const SELL_UPI_MAX_USDT = 100;

  const [activeTab, setActiveTab] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [amount, setAmount] = useState("");
  const [showBuyCDMModal, setShowBuyCDMModal] = useState(false);
  const [showBuyUPIModal, setShowBuyUPIModal] = useState(false);
  const [showSellUPIModal, setShowSellUPIModal] = useState(false);
  const [showSellCDMModal, setShowSellCDMModal] = useState(false);
  const [showBankDetailsModal, setShowBankDetailsModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const smartAccount = useSmartAccount();

  const { saveModalState } = useModalState();

  const USDT_TRANSFER_ABI = parseAbi([
    "function transfer(address to, uint256 amount) returns (bool)",
  ]);

  const sendSponsoredSellTransfer = async (
    recipientAddress: string,
    usdtAmount: string,
    usdtDecimals: number
  ) => {
    if (!address || !smartAccount) throw new Error("Smart account not connected");

    try {
      const parsedAmount = parseUnits(usdtAmount, usdtDecimals);

        console.log("💰 Sending sponsored USDT from smart account:", {
            from: address,
            to: recipientAddress,
            amount: usdtAmount,
            parsedAmount: parsedAmount.toString(),
        });

        // Pre-flight: check smart account's actual USDT balance
        try {
            const accountInfo = await smartAccount.getAccount();
            const smartAccountAddr = accountInfo.smartAccountAddress;
            if (smartAccountAddr) {
                const balance = await retryWithRPCFailover(async (client) => {
                    return await client.readContract({
                        address: CONTRACTS.USDT[56],
                        abi: parseAbi(["function balanceOf(address owner) view returns (uint256)"]),
                        functionName: "balanceOf",
                        args: [smartAccountAddr as Address],
                    });
                }) as bigint;

                if (balance < parsedAmount) {
                    throw new Error(
                        `Insufficient USDT balance in smart account. Required: ${usdtAmount} USDT, Available: ${formatUnits(balance, usdtDecimals)} USDT. The portfolio shows your EOA balance, but sponsored transactions use a separate smart account wallet. Use the "Send" feature to deposit USDT to your smart account (${smartAccountAddr.slice(0, 10)}...).`
                    );
                }
                console.log("✅ Smart account USDT balance sufficient:", {
                    balance: formatUnits(balance, usdtDecimals),
                    required: usdtAmount,
                });
            }
        } catch (checkError: any) {
            if (checkError.message?.includes("Insufficient USDT balance in smart account")) {
                throw checkError;
            }
            console.warn("⚠️ Could not verify smart account balance, proceeding:", checkError);
        }

        const result = await sendSponsoredContractWriteDetailed({
          smartAccount,
          chainId: bsc.id,
          address: CONTRACTS.USDT[56],
          abi: USDT_TRANSFER_ABI,
          functionName: "transfer",
          args: [recipientAddress as `0x${string}`, parsedAmount],
        });

      console.log("✅ Sponsored sell transfer submitted", result);

      return result;

    } catch (error: any) {
        console.error("❌ Sponsored USDT transfer error:", error);

        // Pass through detailed pre-flight errors directly
        if (error.message?.includes("smart account")) {
            throw error;
        }

        let userMessage = "Transaction failed: ";

        if (error.message.includes("insufficient") || error.message.includes("exceed")) {
            userMessage += "Insufficient USDT balance.";
        } else if (error.message.includes("rejected")) {
            userMessage += "Transaction was rejected or canceled.";
        } else {
            userMessage += error.message || "Unknown error occurred.";
        }

        throw new Error(userMessage);
    }
  };

  // Wallet and orders data
  const {
    address,
    eoaAddress,
    smartWalletAddress,
    isConnected,
    walletData,
    isLoading: walletLoading,
    refetchBalances,
  } = useWalletManager();

  const {
    orders,
    isLoading: ordersLoading,
    refetch: refetchOrders,
  } = useUserOrders();

  // Get dynamic rates
  const { getBuyRate, getSellRate, loading: ratesLoading } = useRates();

  // Add bank details hook
  const {
    bankDetails,
    saveBankDetails,
    isLoading: bankDetailsLoading,
  } = useBankDetails();

  // Get rates based on payment method (default to UPI)
  const currentPaymentMethod = paymentMethod === "cdm" ? "CDM" : "UPI";
  const buyPrice = getBuyRate(currentPaymentMethod);
  const sellPrice = getSellRate(currentPaymentMethod);
  const sellCdmMinUsdt = getSellCdmMinUsdt(sellPrice);

  // Helper functions
  const calculateUSDT = (rupeeAmount: string) => {
    const numericAmount = parseFloat(rupeeAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) return "0";
    // For buying: rupees / buy_rate = USDT
    const usdtAmount = numericAmount / buyPrice;
    return usdtAmount.toFixed(4); // More precision for USDT
  };

  const calculateRupee = (usdtAmount: string) => {
    const numericAmount = parseFloat(usdtAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) return "0";
    // For selling: USDT * sell_rate = rupees
    const rupeeAmount = numericAmount * sellPrice;
    return rupeeAmount.toFixed(2);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  const handleCopyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([refetchBalances(), refetchOrders()]);
  };

  const usdtAmount = calculateUSDT(amount);
  const rupeeAmount = calculateRupee(amount);

  const displayUsdtBalance = useMemo(() => {
    if (!isConnected || !walletData?.balances?.usdt?.formatted) return null;
    const n = Number.parseFloat(walletData.balances.usdt.formatted);
    if (!Number.isFinite(n)) return walletData.balances.usdt.formatted;
    return n.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [isConnected, walletData?.balances?.usdt?.formatted]);

  const getPaymentMethodName = () => {
    switch (paymentMethod) {
      case "upi":
        return "UPI";
      case "cdm":
        return "CDM";
      default:
        return "";
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setPaymentMethod("");
    setAmount("");
  };

  // Create order function with enhanced error handling
  const createOrder = async (
    orderType: string,
    orderAmount: string,
    rate: number
  ) => {
    if (!address) return null;

    try {
      let finalOrderAmount = orderAmount;
      let finalUsdtAmount = "";

      if (orderType.includes("BUY")) {
        finalOrderAmount = orderAmount;
        finalUsdtAmount = calculateUSDT(orderAmount);
      } else {
        finalUsdtAmount = orderAmount;
        finalOrderAmount = calculateRupee(orderAmount);
      }

      console.log("🚀 Creating order with conversions:", {
        orderType,
        userEnteredAmount: orderAmount,
        finalOrderAmount, // Always rupees for database
        finalUsdtAmount, // Always USDT amount
        rate,
        buyPrice,
        sellPrice,
        address,
        paymentMethod,
      });

      if (orderType.includes("SELL")) {
        console.log("💰 SELL ORDER: Particle smart account with Alchemy-sponsored gas");

        const sellResult = await handleSellOrder(
          orderType,
          finalOrderAmount,
          finalUsdtAmount,
          rate
        );
        return sellResult;
      } else {
        // For buy orders, create database order only (existing logic remains the same)
        console.log(
          "💰 BUY ORDER: Database only (Gas Station handled by admin)"
        );

        const buyOrderPayload = {
          walletAddress: address,
          orderType: orderType,
          amount: finalOrderAmount,
          usdtAmount: finalUsdtAmount,
          buyRate: orderType.includes("BUY") ? rate : null,
          sellRate: orderType.includes("SELL") ? rate : null,
          paymentMethod: paymentMethod.toUpperCase(),
          blockchainOrderId: null,
          status: "PENDING",
          linkedEoaAddress: eoaAddress, // Link Smart Wallet to EOA user
        };

        console.log("📋 Buy order payload:", buyOrderPayload);

        try {
          const response = await fetch("/api/orders", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(buyOrderPayload),
          });

          console.log("📡 Buy order response status:", response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Buy order API response error:", errorText);
            throw new Error(
              `Buy order API error: ${response.status} - ${errorText}`
            );
          }

          const data = await response.json();
          console.log("📋 Buy order response data:", data);

          if (data.success) {
            await refetchOrders();
            console.log("💾 Buy order saved to database");
            return data.order;
          } else {
            throw new Error(data.error || "Failed to create buy order");
          }
        } catch (buyOrderError) {
          console.error("❌ Buy order database error:", buyOrderError);
          const errorMessage =
            buyOrderError instanceof Error
              ? buyOrderError.message
              : String(buyOrderError);
          throw new Error(`Buy order creation failed: ${errorMessage}`);
        }
      }
    } catch (error) {
      console.error("❌ Error creating order - Full details:", error);
      console.error(
        "❌ Error stack trace:",
        error instanceof Error ? error.stack : "No stack trace"
      );

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      // Enhanced error messages for better user experience
      let displayMessage = errorMessage;
      if (errorMessage.includes("approval required")) {
        displayMessage =
          "USDT approval required. Please approve USDT spending in your wallet first, then try creating the order again.";
      } else if (errorMessage.includes("insufficient")) {
        displayMessage =
          "Insufficient USDT balance. Please check your wallet balance and ensure you have enough USDT for this order.";
      } else if (errorMessage.includes("transfer failed")) {
        displayMessage =
          "USDT transfer failed. Please ensure you have enough USDT and try again.";
      } else if (errorMessage.includes("Database error")) {
        displayMessage = `Database error: ${errorMessage}. Please try again or contact support if the issue persists.`;
      } else if (errorMessage.includes("Blockchain transaction failed")) {
        displayMessage =
          "Blockchain transaction failed. The database order was automatically cleaned up. Your funds are safe. Please try again.";
      } else if (errorMessage.includes("execution reverted")) {
        displayMessage =
          "Smart contract error. Please check your USDT balance and allowance, then try again.";
      } else if (errorMessage.includes("User rejected")) {
        displayMessage = "Transaction was cancelled by user.";
      } else if (errorMessage.includes("API error")) {
        displayMessage = `Server error: ${errorMessage}. Please try again or contact support.`;
      }

      console.error("❌ Raw error for debugging:", error);
      throw new Error(displayMessage);
    }
  };

  const handleSellOrder = async (
    orderType: string,
    finalOrderAmount: string,
    finalUsdtAmount: string,
    rate: number
  ) => {
    let submission: { userOpHash: `0x${string}`; transactionHash: `0x${string}` } | null = null;

    try {
      console.log("🚀 Starting sponsored sell order creation:", {
        orderType,
        finalOrderAmount,
        finalUsdtAmount,
        rate,
        userAddress: address,
        smartWalletAddress,
        eoaAddress,
        adminWallet: ADMIN_WALLET_ADDRESS,
      });

      const usdtDecimals = 18;

      console.log("💸 Sending sponsored smart-account USDT transfer...");
      submission = await sendSponsoredSellTransfer(
        ADMIN_WALLET_ADDRESS,
        finalUsdtAmount,
        usdtDecimals
      );

      console.log("✅ USDT transfer succeeded, creating order record", {
        userOpHash: submission.userOpHash,
        transactionHash: submission.transactionHash,
      });

      const response = await fetch("/api/orders/sell-sponsored", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chainId: bsc.id,
          walletAddress: smartWalletAddress ?? address,
          linkedEoaAddress: eoaAddress ?? address,
          orderType,
          paymentMethod: paymentMethod.toUpperCase(),
          amount: finalOrderAmount,
          usdtAmount: finalUsdtAmount,
          sellRate: rate,
          userOpHash: submission.userOpHash,
          transactionHash: submission.transactionHash,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.order) {
        throw new Error(data.error || "Failed to create sponsored sell order");
      }

      console.log("✅ Sponsored sell order created", {
        userOpHash: submission.userOpHash,
        transactionHash: submission.transactionHash,
        orderId: data.order.fullId,
      });

      await Promise.all([refetchOrders(), refetchBalances()]);

      return data.order;
    } catch (sellError) {
      console.error("❌ Sponsored sell order creation failed:", sellError);

      const errorMessage =
        sellError instanceof Error ? sellError.message : String(sellError);

      if (errorMessage.includes("Insufficient USDT balance") && !errorMessage.includes("smart account")) {
        throw new Error(
          "Insufficient USDT balance. Please ensure you have enough USDT for this order."
        );
      }

      if (errorMessage.includes("timeout")) {
        throw new Error("Request timed out. Please try again.");
      }

      // If the USDT transfer succeeded but order creation failed, we still need to create the order.
      // Try one more time directly with the server.
      if (submission?.userOpHash) {
        console.warn("⚠️ Transfer succeeded but order API failed. Retrying order creation...");
        try {
          const retryResponse = await fetch("/api/orders/sell-sponsored", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chainId: bsc.id,
              walletAddress: smartWalletAddress ?? address,
              linkedEoaAddress: eoaAddress ?? address,
              orderType,
              paymentMethod: paymentMethod.toUpperCase(),
              amount: finalOrderAmount,
              usdtAmount: finalUsdtAmount,
              sellRate: rate,
              userOpHash: submission.userOpHash,
              transactionHash: submission.transactionHash,
            }),
          });
          const retryData = await retryResponse.json();
          if (retryResponse.ok && retryData.success && retryData.order) {
            console.log("✅ Order created on retry", retryData.order.fullId);
            await Promise.all([refetchOrders(), refetchBalances()]);
            return retryData.order;
          }
        } catch (retryError) {
          console.error("❌ Order creation retry also failed:", retryError);
        }

        // If still failing, throw a clear error about the state
        throw new Error(
          `USDT transferred to admin (tx: ${submission.userOpHash.slice(0, 16)}...) but order creation failed. Please contact support with this transaction hash for manual reconciliation.`
        );
      }

      throw new Error(`Sell order failed: ${errorMessage}`);
    }
  };

  // Add validation functions
  const validateUSDTLimits = (
    usdtAmount: number,
    paymentMethod: string,
    orderSide: string
  ): { isValid: boolean; error: string } => {
    // Global minimum check
    if (usdtAmount < GLOBAL_MIN_USDT) {
      return {
        isValid: false,
        error: `Minimum order amount is ${GLOBAL_MIN_USDT} USDT.`,
      };
    }

    if (orderSide === "buy") {
      if (paymentMethod === "upi") {
        if (usdtAmount < 1) {
          return {
            isValid: false,
            error: `Buy UPI orders require minimum 1 USDT. Current: ${usdtAmount.toFixed(
              4
            )} USDT`,
          };
        }
        if (usdtAmount > BUY_UPI_MAX_USDT) {
          return {
            isValid: false,
            error: `Buy UPI orders are limited to ${BUY_UPI_MAX_USDT} USDT maximum. Current: ${usdtAmount.toFixed(
              4
            )} USDT`,
          };
        }
      } else if (paymentMethod === "cdm") {
        if (usdtAmount < BUY_CDM_MIN_USDT) {
          return {
            isValid: false,
            error: `Buy CDM orders require minimum ${BUY_CDM_MIN_USDT} USDT. Current: ${usdtAmount.toFixed(
              4
            )} USDT`,
          };
        }
        if (usdtAmount > BUY_CDM_MAX_USDT) {
          return {
            isValid: false,
            error: `Buy CDM orders are limited to ${BUY_CDM_MAX_USDT} USDT maximum. Current: ${usdtAmount.toFixed(
              4
            )} USDT`,
          };
        }
      }
    } else {
      // Sell Logic
      if (paymentMethod === "upi") {
        if (usdtAmount > SELL_UPI_MAX_USDT) {
          return {
            isValid: false,
            error: `Sell UPI orders are limited to ${SELL_UPI_MAX_USDT} USDT maximum. Current: ${usdtAmount.toFixed(
              4
            )} USDT`,
          };
        }
      } else if (paymentMethod === "cdm") {
        if (usdtAmount < sellCdmMinUsdt) {
          return {
            isValid: false,
            error: `Sell CDM orders require minimum ₹${SELL_CDM_MIN_INR.toLocaleString("en-IN")} (≈ ${sellCdmMinUsdt.toFixed(
              4
            )} USDT at current rate). Current: ${usdtAmount.toFixed(4)} USDT`,
          };
        }
        if (usdtAmount > SELL_CDM_MAX_USDT) {
          return {
            isValid: false,
            error: `Sell CDM orders are limited to ${SELL_CDM_MAX_USDT} USDT maximum. Current: ${usdtAmount.toFixed(
              4
            )} USDT`,
          };
        }
      }
    }

    return { isValid: true, error: "" };
  };

  const getRupeeLimitsForPaymentMethod = (
    paymentMethod: string
  ): { min: number; max: number } => {
    const currentRate = activeTab === "buy" ? buyPrice : sellPrice;

    if (paymentMethod === "upi") {
      const maxLimit =
        activeTab === "buy" ? BUY_UPI_MAX_USDT : SELL_UPI_MAX_USDT;
      return {
        min: GLOBAL_MIN_USDT * currentRate,
        max: maxLimit * currentRate,
      };
    } else if (paymentMethod === "cdm") {
      if (activeTab === "buy") {
        return {
          min: BUY_CDM_MIN_USDT * currentRate,
          max: BUY_CDM_MAX_USDT * currentRate,
        };
      }
      return {
        min: SELL_CDM_MIN_INR,
        max: SELL_CDM_MAX_USDT * currentRate,
      };
    }
    return { min: 0, max: Infinity };
  };

  // Update the handleBuySellClick function to include validation
  const handleBuySellClick = async () => {
    if (!isConnected || !amount || parseFloat(amount) <= 0) return;

    console.log("🎯 Handle buy/sell click:", {
      activeTab,
      paymentMethod,
      hasBankDetails: !!bankDetails,
      walletAddress: address,
    });

    // Calculate USDT amount for validation
    let usdtAmountForValidation: number;
    if (activeTab === "buy") {
      // For buy orders: user enters rupees, calculate USDT
      usdtAmountForValidation = parseFloat(calculateUSDT(amount));
    } else {
      // For sell orders: user enters USDT directly
      usdtAmountForValidation = parseFloat(amount);
    }

    // Validate USDT limits
    const validation = validateUSDTLimits(
      usdtAmountForValidation,
      paymentMethod,
      activeTab
    );
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    // Check if this is a CDM order and user doesn't have bank details
    if (paymentMethod === "cdm" && !bankDetails) {
      console.log("📋 CDM order requires bank details - opening modal");
      setShowBankDetailsModal(true);
      return;
    }

    await proceedWithOrderCreation();
  };

  // Update the amount input validation (add real-time feedback)
  const getAmountValidationStatus = (): {
    isValid: boolean;
    error: string;
    warning: string;
  } => {
    if (!amount || !paymentMethod)
      return { isValid: true, error: "", warning: "" };

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0)
      return { isValid: true, error: "", warning: "" };

    let usdtAmountForValidation: number;
    if (activeTab === "buy") {
      usdtAmountForValidation = parseFloat(calculateUSDT(amount));
    } else {
      usdtAmountForValidation = numericAmount;
    }

    const validation = validateUSDTLimits(
      usdtAmountForValidation,
      paymentMethod,
      activeTab
    );

    if (!validation.isValid) {
      return { isValid: false, error: validation.error, warning: "" };
    }

    // Add warning when approaching limits
    const upiMax = activeTab === "buy" ? BUY_UPI_MAX_USDT : SELL_UPI_MAX_USDT;
    const cdmMax = activeTab === "buy" ? BUY_CDM_MAX_USDT : SELL_CDM_MAX_USDT;

    if (
      paymentMethod === "upi" &&
      usdtAmountForValidation > upiMax * 0.9
    ) {
      return {
        isValid: true,
        error: "",
        warning: `Approaching UPI limit of ${upiMax} USDT`,
      };
    }

    if (
      paymentMethod === "cdm" &&
      usdtAmountForValidation > cdmMax * 0.9
    ) {
      return {
        isValid: true,
        error: "",
        warning: `Approaching CDM limit of ${cdmMax} USDT`,
      };
    }

    return { isValid: true, error: "", warning: "" };
  };

  const amountValidation = getAmountValidationStatus();

  // Update the button disabled condition to include validation
  const isButtonDisabled =
    !isConnected ||
    isPlacingOrder ||
    !amount ||
    parseFloat(amount) <= 0 ||
    bankDetailsLoading ||
    !amountValidation.isValid;

  const proceedWithOrderCreation = async () => {
    setIsPlacingOrder(true);

    try {
      let orderType = "";
      let orderAmount = amount;
      let rate = 0;

      if (activeTab === "buy") {
        orderType = paymentMethod === "cdm" ? "BUY_CDM" : "BUY_UPI";
        rate = buyPrice;
      } else {
        orderType = paymentMethod === "cdm" ? "SELL_CDM" : "SELL";
        rate = sellPrice;
      }

      console.log("🚀 Creating order with parameters:", {
        orderType,
        orderAmount,
        rate,
        activeTab,
        paymentMethod,
        address,
        isConnected,
      });

      const order = await createOrder(orderType, orderAmount, rate);

      if (order === null) {
        console.log("💡 Order creation returned null - approval flow needed");

        return;
      }

      if (order) {
        console.log("✅ Order created successfully:", {
          id: order.id,
          fullId: order.fullId,
          orderType: order.orderType,
          status: order.status,
          blockchainOrderId: order.blockchainOrderId,
        });

        // Set current order for modal
        setCurrentOrder(order);

        console.log("🛠️ Opening modal for order type:", activeTab, paymentMethod, order.id);

        // Save initial modal state and open appropriate modal
        if (activeTab === "buy" && paymentMethod === "cdm") {
          saveModalState(order.fullId || order.id, "BUY_CDM", 0, {}, null);
          setShowBuyCDMModal(true);
        } else if (activeTab === "buy" && paymentMethod === "upi") {
          saveModalState(order.fullId || order.id, "BUY_UPI", 0, {}, null);
          setShowBuyUPIModal(true);
        } else if (activeTab === "sell" && paymentMethod === "upi") {
          saveModalState(order.fullId || order.id, "SELL_UPI", 0, {}, null);
          setShowSellUPIModal(true);
        } else if (activeTab === "sell" && paymentMethod === "cdm") {
          if (order.id || order.fullId) {
            saveModalState(order.fullId || order.id, "SELL_CDM", 0, {}, null);
            setShowSellCDMModal(true);
          } else {
            console.error("❌ Critical: Created SELL_CDM order but ID is missing!", order);
            alert("Order created but ID missing. Please refresh.");
          }
        }

        // Reset form
        setAmount("");

        // Refresh orders after successful creation
        await Promise.all([refetchOrders(), refetchBalances()]);
      } else {
        console.log(
          "💡 Order creation returned null - this is expected for approval flows"
        );
        // Don't show error - approval flow is in progress
      }
    } catch (error) {
      console.error("💥 Error in order creation:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("💥 Error details for user:", errorMessage);

      alert(`Failed to create order: ${errorMessage}`);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleSaveBankDetails = async (
    details: BankDetailsData
  ): Promise<boolean> => {
    console.log("💾 Attempting to save bank details");

    const success = await saveBankDetails(details);

    if (success) {
      console.log("✅ Bank details saved, proceeding with order");
      setShowBankDetailsModal(false);

      // After saving bank details, proceed with order creation
      setTimeout(() => {
        proceedWithOrderCreation();
      }, 500);
    } else {
      console.error("❌ Failed to save bank details");
    }

    return success;
  };

  const handleCloseBuyCDM = () => {
    setShowBuyCDMModal(false);
    setCurrentOrder(null);
  };

  const handleCloseBuyUPI = () => {
    setShowBuyUPIModal(false);
    setCurrentOrder(null);
  };

  const handleCloseSellUPI = () => {
    setShowSellUPIModal(false);
    setCurrentOrder(null);
  };

  const handleCloseSellCDM = () => {
    setShowSellCDMModal(false);
    setCurrentOrder(null);
  };

  useEffect(() => {
    // Listen for rate updates from admin panel
    const handleRatesUpdated = (event: CustomEvent) => {
      console.log("Rates updated event received:", event.detail);
      // Refresh rates when admin updates them
      setTimeout(() => {
        // Force refetch rates
        window.location.reload(); // Simple approach to ensure fresh rates
      }, 1000);
    };

    window.addEventListener(
      "ratesUpdated",
      handleRatesUpdated as EventListener
    );

    return () => {
      window.removeEventListener(
        "ratesUpdated",
        handleRatesUpdated as EventListener
      );
    };
  }, []);

  return (
    <>
      <div className="bg-black text-white h-full flex items-center justify-center p-4 sm:p-8 max-w-4xl mx-auto">
        <div className="w-full space-y-4">
          {/* Enhanced Wallet Balance Card */}

          {/* History Icon - Top */}
          <div className="flex justify-end max-w-md mx-auto mb-2">
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 border border-[#622DBF] rounded-lg bg-[#622DBF]/5 hover:bg-[#622DBF]/15 transition-all"
            >
              <History className="w-6 h-6 text-[#622DBF]" />
              
            </button>
          </div>

          {/* Price Display - Centered */}
          <motion.div
            className="flex justify-center max-w-md space-x-3 sm:space-x-6 mx-auto mb-6 sm:mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="border border-[#3E3E3E] rounded-lg p-3 sm:p-4 min-w-[100px] sm:min-w-[120px]">
              <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                <img src="/buy.svg" alt="" className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-xs sm:text-sm text-white">Buy Price</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-center">
                {ratesLoading ? "..." : `${buyPrice} ₹`}
              </div>
            </div>
            <div className="border border-[#3E3E3E] rounded-md py-3 sm:py-4 px-2 min-w-[100px] sm:min-w-[120px]">
              <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                <img src="/sell.svg" alt="" className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-xs sm:text-sm text-white">
                  Sell Price
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-center">
                {ratesLoading ? "..." : `${sellPrice} ₹`}
              </div>
            </div>
          </motion.div>
          {/* Buy/Sell Tabs */}
          <motion.div
            className="flex space-x-3 sm:space-x-6 max-w-lg mx-auto mb-6 sm:mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <motion.button
              onClick={() => handleTabChange("buy")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex-1 py-3 sm:py-4 px-6 sm:px-12 rounded-md font-semibold text-base sm:text-lg transition-all ${activeTab === "buy"
                ? "bg-[#622DBF] text-white shadow-lg shadow-purple-600/25"
                : "bg-[#101010] text-white border border-[#3E3E3E] hover:bg-gray-700/50"
                }`}
            >
              Buy
            </motion.button>
            <motion.button
              onClick={() => handleTabChange("sell")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex-1 py-3 sm:py-4 px-6 sm:px-12 rounded-md font-semibold text-base sm:text-lg transition-all ${activeTab === "sell"
                ? "bg-[#622DBF] text-white shadow-lg shadow-purple-600/25"
                : "bg-[#101010] text-white border border-[#3E3E3E] hover:bg-gray-700/50"
                }`}
            >
              Sell
            </motion.button>
          </motion.div>
          {/* Payment Method Selection */}
          <AnimatePresence>
            {activeTab && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-gray-900/30 border border-[#3E3E3E] rounded-md p-4 sm:p-5 mb-6 sm:mb-8 overflow-hidden"
              >
                <h3 className="text-lg sm:text-xl mb-2 text-white">
                  Select how you'd like to{" "}
                  {activeTab === "buy" ? "pay" : "receive payment"}
                </h3>
                <div className="space-y-3 sm:space-y-4">
                  <motion.label
                    className="flex items-center space-x-3 sm:space-x-4 cursor-pointer group"
                    whileHover={{ x: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div
                      className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center transition-all ${paymentMethod === "upi"
                        ? "bg-[#622DBF] border-[#622DBF]"
                        : "bg-[#1E1C1C] border-[#3E3E3E]"
                        }`}
                      onClick={() => setPaymentMethod("upi")}
                      whileTap={{ scale: 0.9 }}
                    >
                      <AnimatePresence>
                        {paymentMethod === "upi" && (
                          <motion.svg
                            className="w-3 h-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </motion.svg>
                        )}
                      </AnimatePresence>
                    </motion.div>
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <img
                        src="/phonepay-gpay.svg"
                        alt=""
                        className="w-6 h-6"
                      />
                      <span className="text-sm sm:text-base font-medium group-hover:text-white transition-colors">
                        {activeTab === "buy"
                          ? "Pay with UPI"
                          : "Receive via UPI"}
                      </span>
                    </div>
                  </motion.label>
                  <motion.label
                    className="flex items-center space-x-3 sm:space-x-4 cursor-pointer group"
                    whileHover={{ x: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div
                      className={`w-5 h-5 border-2 rounded-sm flex items-center justify-center transition-all ${paymentMethod === "cdm"
                        ? "bg-[#622DBF] border-[#622DBF]"
                        : "bg-[#1E1C1C] border-[#3E3E3E]"
                        }`}
                      onClick={() => setPaymentMethod("cdm")}
                      whileTap={{ scale: 0.9 }}
                    >
                      <AnimatePresence>
                        {paymentMethod === "cdm" && (
                          <motion.svg
                            className="w-3 h-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </motion.svg>
                        )}
                      </AnimatePresence>
                    </motion.div>
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <img
                        src="/bank.svg"
                        alt=""
                        className="w-5 h-5 sm:w-6 sm:h-6"
                      />
                      <span className="text-sm sm:text-base font-medium group-hover:text-white transition-colors">
                        {activeTab === "buy"
                          ? "Cash Deposit (CDM)"
                          : "Cash Withdrawal (CDM)"}
                      </span>
                    </div>
                  </motion.label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Amount Input Section */}
          <AnimatePresence>
            {activeTab && paymentMethod && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-[#101010] border border-[#3E3E3E] rounded-md p-4 sm:p-5"
              >
                <div className="flex justify-center space-x-2 sm:space-x-3 mb-4 sm:mb-5">
                  <img
                    src={
                      paymentMethod === "upi"
                        ? "/phonepay-gpay.svg"
                        : "/bank.svg"
                    }
                    alt=""
                    className="w-5 h-5 sm:w-6 sm:h-6"
                  />
                  <span className="text-sm sm:text-md text-gray-300 text-center">
                    You are {activeTab === "buy" ? "buying" : "selling"} via{" "}
                    {getPaymentMethodName()}
                  </span>
                </div>

                <div className="relative mx-auto mb-4 w-full max-w-xs sm:mb-6">
                  <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-2xl text-gray-400 sm:left-4 sm:text-3xl">
                    {activeTab === "buy" ? "₹" : "$"}
                  </span>
                  <motion.input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-xl border border-gray-600/50 bg-[#1E1C1C] py-4 pl-10 pr-[6.5rem] text-xl font-medium text-white placeholder-gray-500 focus:border-[#622DBF] focus:outline-none focus:ring-2 focus:ring-purple-500/20 sm:py-5 sm:pl-12 sm:pr-36 sm:text-2xl"
                    placeholder={
                      activeTab === "buy" ? "Enter rupees" : "Enter USDT"
                    }
                    whileFocus={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  />
                  <span
                    className="pointer-events-none absolute right-3 top-1/2 max-w-[6rem] -translate-y-1/2 truncate text-right text-[0.65rem] font-medium leading-tight text-gray-400 sm:right-4 sm:max-w-none sm:text-xs"
                    title="Wallet USDT balance"
                  >
                    {walletLoading ? (
                      <span className="text-gray-500">…</span>
                    ) : displayUsdtBalance !== null ? (
                      <>
                        w
                        <span className="block tabular-nums text-white/75">
                          {displayUsdtBalance} USDT
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-center mb-3 sm:mb-4">
                  <motion.svg
                    className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    animate={{ rotate: amount ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    />
                  </motion.svg>
                </div>

                <motion.div
                  className="text-center"
                  key={activeTab === "buy" ? usdtAmount : rupeeAmount}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-xl sm:text-2xl font-bold mb-2 text-white">
                    {activeTab === "buy"
                      ? `${usdtAmount} USDT`
                      : `₹${rupeeAmount}`}
                  </div>
                  <div className="text-sm text-white">
                    {activeTab === "buy"
                      ? `will be credited to your wallet at ₹${buyPrice} per USDT`
                      : `will be transferred to your account at ₹${sellPrice} per USDT`}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {activeTab === "buy"
                      ? `Rate: 1 USDT = ₹${buyPrice}`
                      : `Rate: 1 USDT = ₹${sellPrice}`}
                  </div>

                  {/* Add limit information */}
                  <div className="text-xs text-gray-500 mt-2">
                    {paymentMethod === "upi" && (
                      <>
                        Limit: Max {activeTab === "buy" ? BUY_UPI_MAX_USDT : SELL_UPI_MAX_USDT} USDT (₹
                        {(
                          (activeTab === "buy" ? BUY_UPI_MAX_USDT : SELL_UPI_MAX_USDT) *
                          (activeTab === "buy" ? buyPrice : sellPrice)
                        ).toFixed(0)}
                        )
                      </>
                    )}
                    {paymentMethod === "cdm" && (
                      <>
                        {activeTab === "buy" ? (
                          <>
                            Limits: {BUY_CDM_MIN_USDT}-{BUY_CDM_MAX_USDT} USDT (₹
                            {(BUY_CDM_MIN_USDT * buyPrice).toFixed(0)} - ₹
                            {(BUY_CDM_MAX_USDT * buyPrice).toFixed(0)})
                          </>
                        ) : (
                          <>
                            Limits: {sellCdmMinUsdt.toFixed(2)}-{SELL_CDM_MAX_USDT} USDT (₹
                            {SELL_CDM_MIN_INR.toLocaleString("en-IN")} - ₹
                            {(SELL_CDM_MAX_USDT * sellPrice).toFixed(0)})
                          </>
                        )}
                      </>
                    )}
                  </div>

                  {/* Show validation error */}
                  {amountValidation.error && (
                    <motion.div
                      className="text-xs text-red-400 mt-2 px-2 py-1 bg-red-500/10 rounded border border-red-500/20"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      {amountValidation.error}
                    </motion.div>
                  )}

                  {/* Show validation warning */}
                  {amountValidation.warning && (
                    <motion.div
                      className="text-xs text-yellow-400 mt-2 px-2 py-1 bg-yellow-500/10 rounded border border-yellow-500/20"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      {amountValidation.warning}
                    </motion.div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Action Button */}
          <AnimatePresence>
            {activeTab && paymentMethod && (
              <motion.button
                onClick={handleBuySellClick}
                disabled={isButtonDisabled}
                className="w-full bg-[#622DBF] hover:bg-purple-700 text-white py-4 sm:py-5 px-6 rounded-xl font-bold text-lg sm:text-xl transition-all shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40 disabled:opacity-50 disabled:cursor-not-allowed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                whileHover={{ scale: isButtonDisabled ? 1 : 1.02 }}
                whileTap={{ scale: isButtonDisabled ? 1 : 0.98 }}
                transition={{ duration: 0.3 }}
              >
                {!isConnected
                  ? "Connect Wallet to Trade"
                  : bankDetailsLoading
                    ? "Loading Bank Details..."
                    : amountValidation.error
                      ? "Amount Exceeds Limits"
                      : isPlacingOrder
                        ? `Placing ${activeTab === "buy" ? "Buy" : "Sell"} Order...`
                        : paymentMethod === "cdm" && !bankDetails
                          ? `Add Bank Details & ${activeTab === "buy" ? "Buy" : "Sell"}`
                          : activeTab === "buy"
                            ? `Buy ${amount ? calculateUSDT(amount) : ""} USDT for ₹${amount || "0"
                            }`
                            : `Sell ${amount || "0"} USDT for ₹${amount ? calculateRupee(amount) : "0"
                            }`}
              </motion.button>
            )}
          </AnimatePresence>
          {/* How to buy/sell link */}
          <AnimatePresence>
            {activeTab && (
              <motion.div
                className="text-center pt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <motion.button
                  className="flex items-center space-x-2 text-white hover:text-white transition-colors mx-auto group"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.svg
                    className="w-4 h-4 sm:w-5 sm:h-5 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    whileHover={{ rotate: 15 }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </motion.svg>
                  <span className="font-medium text-sm sm:text-base">
                    How to {activeTab}?
                  </span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>



        </div>
      </div>

      {/* Modals */}
      <BuyCDMModal
        isOpen={showBuyCDMModal}
        onClose={handleCloseBuyCDM}
        amount={amount}
        usdtAmount={usdtAmount}
        orderData={currentOrder}
      />

      <BuyUPIModal
        isOpen={showBuyUPIModal}
        onClose={handleCloseBuyUPI}
        amount={amount}
        usdtAmount={usdtAmount}
        orderData={currentOrder}
      />

      <SellUPIModal
        isOpen={showSellUPIModal}
        onClose={handleCloseSellUPI}
        usdtAmount={amount} // User entered USDT amount
        amount={calculateRupee(amount)} // Calculated rupee amount
        orderData={currentOrder}
      />

      <SellCDMModal
        isOpen={showSellCDMModal}
        onClose={handleCloseSellCDM}
        usdtAmount={amount} // User entered USDT amount
        amount={calculateRupee(amount)} // Calculated rupee amount
        orderData={currentOrder}
      />

      <HistoryDrawer
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />

      <BankDetailsModal
        isOpen={showBankDetailsModal}
        onClose={() => setShowBankDetailsModal(false)}
        onSave={handleSaveBankDetails}
        isLoading={bankDetailsLoading}
      />
    </>
  );
}
