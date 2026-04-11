"use client";

import { Copy, User, ExternalLink, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWalletManager } from "@/hooks/useWalletManager";
import { useUserOrders } from "@/hooks/useUserOrders";
import { useRates } from "@/hooks/useRates";
import { useModalState } from "@/hooks/useModalState";
import BuyCDMModal from "./modal/buy-cdm";
import BuyUPIModal from "./modal/buy-upi";
import SellUPIModal from "./modal/sell-upi";
import SellCDMModal from "./modal/sell-cdm";
import BankDetailsModal, { BankDetailsData } from "./modal/bank-details-modal";
import { useBankDetails } from "@/hooks/useBankDetails";
import { config } from "@/lib/wagmi";
import { parseUnits, formatUnits, erc20Abi } from "viem";

import {
  ConnectButton,
  useAccount,
  usePublicClient,
  useParticleAuth,
  useSmartAccount,
  useWallets,
} from "@particle-network/connectkit";
import { AAWrapProvider, SendTransactionMode } from "@particle-network/aa"; // Only when using EIP1193Provider

// Blockchain Utilities
import { ethers, type Eip1193Provider } from "ethers";
import { formatEther, parseEther, verifyMessage } from "viem";

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
  const BUY_CDM_MIN_USDT = 1;
  const BUY_CDM_MAX_USDT = 150;

  // Sell Limits
  const SELL_UPI_MAX_USDT = 100;
  const SELL_CDM_MIN_USDT = 58.4112; // Approx ₹5,000 at 85.6 rate
  const SELL_CDM_MAX_USDT = 250;

  const { chainId } = useAccount();
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
  const { getUserInfo } = useParticleAuth();
  const publicClient = usePublicClient();
  const smartAccount = useSmartAccount();
  const [primaryWallet] = useWallets();

  const { saveModalState } = useModalState();

  const [recipientAddress, setRecipientAddress] = useState<string>("0x16071780eaaa5e5ac7a31ca2485026eb24071662");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [needsGasStationApproval, setNeedsGasStationApproval] = useState<boolean>(false);

  // Initialize ethers provider with gasless transaction mode
  const customProvider = smartAccount
    ? new ethers.BrowserProvider(
      new AAWrapProvider(
        smartAccount,
        SendTransactionMode.Gasless
      ) as Eip1193Provider,
      "any"
    )
    : null;

  const walletClient = primaryWallet?.getWalletClient();


  /**
   * Send USDT using Particle Network's gasless transaction feature
   * @param recipientAddress - Address to send USDT to
   * @param usdtAmount - Amount of USDT to send (as string)
   * @param usdtDecimals - USDT token decimals
   * @returns Transaction hash
   */
  const sendGaslessUSDT = async (
    recipientAddress: string,
    usdtAmount: string,
    usdtDecimals: number
  ): Promise<string> => {
    if (!smartAccount) throw new Error('Smart account not initialized');

    try {
      console.log(`🚀 Sending ${usdtAmount} USDT to ${recipientAddress} (gasless)`);

      // Validate recipient address
      if (!ethers.isAddress(recipientAddress)) {
        throw new Error('Invalid recipient address format');
      }

      // Validate amount
      const amount = parseFloat(usdtAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid USDT amount');
      }

      // Create contract interface for USDT transfer
      const iface = new ethers.Interface(erc20Abi);
      const parsedAmount = parseUnits(usdtAmount, usdtDecimals);

      // Encode transfer function
      const data = iface.encodeFunctionData('transfer', [
        recipientAddress,
        parsedAmount
      ]);

      // Prepare transaction
      const tx = {
        to: CONTRACTS.USDT[56],
        value: '0x0',
        data: data,
      };

      console.log('📋 Getting gasless fee quotes...');

      // Get fee quotes with timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Fee quote timeout. Please try again.')), 30000)
      );

      const feeQuotesResult = await Promise.race([
        smartAccount.getFeeQuotes(tx),
        timeoutPromise
      ]) as any;

      if (!feeQuotesResult) {
        throw new Error('Failed to get fee quotes');
      }

      const gaslessQuote = feeQuotesResult.verifyingPaymasterGasless;

      if (!gaslessQuote) {
        throw new Error('Gasless transactions not available right now. Please try again later.');
      }

      console.log('✅ Sending gasless user operation...');

      // Send user operation
      const hash = await smartAccount.sendUserOperation({
        userOp: gaslessQuote.userOp,
        userOpHash: gaslessQuote.userOpHash,
      });

      console.log('✅ Transaction hash:', hash);
      return hash;

    } catch (error: any) {
      console.error('❌ Gasless USDT transfer error:', error);

      let userMessage = 'Transaction failed: ';

      if (error.message.includes('insufficient')) {
        userMessage += 'Insufficient USDT balance in your smart wallet.';
      } else if (error.message.includes('timeout')) {
        userMessage += 'Request timed out. Please check your connection and try again.';
      } else if (error.message.includes('rejected')) {
        userMessage += 'Transaction was rejected or canceled.';
      } else if (error.message.includes('gasless')) {
        userMessage += 'Gasless transactions are temporarily unavailable.';
      } else {
        userMessage += error.message || 'Unknown error occurred.';
      }

      throw new Error(userMessage);
    }
  };

  /**
   * Wait for transaction confirmation with retry logic
   * @param txHash - Transaction hash to wait for
   * @param maxRetries - Maximum number of retries (default: 3)
   * @param retryDelay - Delay between retries in ms (default: 5000)
   * @returns true if confirmed, false if failed
   */
  const waitForTransactionConfirmation = async (
    txHash: string,
    maxRetries: number = 3,
    retryDelay: number = 5000
  ): Promise<boolean> => {
    if (!publicClient) {
      console.error('❌ Public client not available');
      return false;
    }

    console.log(`⏳ Waiting for transaction confirmation: ${txHash}`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Confirmation attempt ${attempt}/${maxRetries}...`);

        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash as `0x${string}`,
          timeout: 30000, // 30 second timeout per attempt
        });

        if (receipt.status === 'success') {
          console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
          return true;
        } else {
          console.error(`❌ Transaction failed with status: ${receipt.status}`);
          return false;
        }
      } catch (error) {
        console.error(`⚠️ Confirmation attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          console.log(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          console.error(`❌ Transaction confirmation failed after ${maxRetries} attempts`);
          return false;
        }
      }
    }

    return false;
  };

  /**
   * Create database order with retry logic
   * @param orderPayload - Order data to send to API
   * @param maxRetries - Maximum number of retries (default: 3)
   * @returns Order data if successful, throws error if failed
   */
  const createDatabaseOrderWithRetry = async (
    orderPayload: any,
    maxRetries: number = 3
  ): Promise<any> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📝 Database order creation attempt ${attempt}/${maxRetries}...`);

        const dbResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderPayload),
        });

        if (!dbResponse.ok) {
          const errorText = await dbResponse.text();
          throw new Error(
            `Database API error: ${dbResponse.status} - ${errorText}`
          );
        }

        const data = await dbResponse.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to create database order');
        }

        console.log(`✅ Database order created successfully on attempt ${attempt}`);
        return data.order;
      } catch (error) {
        console.error(`❌ Database order creation attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          const retryDelay = 2000 * attempt; // Exponential backoff: 2s, 4s, 6s
          console.log(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          console.error(`❌ Database order creation failed after ${maxRetries} attempts`);
          throw error;
        }
      }
    }

    throw new Error('Database order creation failed after all retries');
  };

  // Wallet and orders data
  const {
    address: eoaAddress,
    isConnected,
    walletData,
    isLoading: walletLoading,
    refetchBalances,
    createSellOrderOnChain,
    approveUSDT,
  } = useWalletManager();

  // CRITICAL: Only use smart wallet address for orders - no EOA fallback
  // This ensures orders are always created with the correct smart wallet address
  const address = walletData?.smartWallet?.address;
  const isSmartWalletReady = !!address;

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
        console.log("💰 SELL ORDER: Completely gasless via Gas Station");

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
          "USDT transfer failed. Please ensure you have enough USDT and BNB for gas fees.";
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
    let txHash: string | null = null;

    try {
      console.log('🚀 Starting gasless sell order creation:', {
        orderType,
        finalOrderAmount,
        finalUsdtAmount,
        rate,
        userAddress: address,
        adminWallet: ADMIN_WALLET_ADDRESS
      });

      // Get USDT decimals (BSC USDT uses 18 decimals)
      const usdtDecimals = 18;

      // Send USDT directly to admin using gasless transfer
      console.log('💸 Initiating gasless USDT transfer to admin wallet...');
      txHash = await sendGaslessUSDT(
        ADMIN_WALLET_ADDRESS,
        finalUsdtAmount,
        usdtDecimals
      );

      console.log('✅ Gasless USDT transfer successful:', txHash);

      // CRITICAL: Create database order IMMEDIATELY after getting hash
      // This ensures we capture the order even if confirmation times out
      console.log('📝 Creating database order immediately with transaction hash...');

      const orderPayload = {
        walletAddress: address,
        orderType: orderType,
        amount: finalOrderAmount,
        usdtAmount: finalUsdtAmount,
        buyRate: null,
        sellRate: rate,
        paymentMethod: paymentMethod.toUpperCase(),
        blockchainOrderId: null,
        status: 'PENDING_ADMIN_PAYMENT',
        gasStationTxHash: txHash, // Store the gasless transfer hash
        linkedEoaAddress: eoaAddress, // Link Smart Wallet to EOA user
      };

      // Create database order with retry logic
      // We explicitly catch errors here to ensure we don't lose the txHash context
      let databaseOrder;
      try {
        databaseOrder = await createDatabaseOrderWithRetry(orderPayload);
        console.log('✅ Sell order created - USDT transferred to admin via gasless transaction');
      } catch (dbError) {
        console.error('❌ Database creation failed but Transaction Sent:', txHash, dbError);
        const errMessage = dbError instanceof Error ? dbError.message : String(dbError);
        // Throw a specific error that includes the hash so the user can save it
        throw new Error(`CRITICAL: Transaction sent (Hash: ${txHash}) but Order creation failed. Please contact support with this hash. Error: ${errMessage}`);
      }

      // Wait for transaction confirmation (Background process to not block UI)
      // The order is already safe in DB, so we return immediately to update UI
      console.log('⏳ Transaction sent. Waiting for confirmation in background...');

      // Start confirmation check in background without awaiting
      waitForTransactionConfirmation(txHash!)
        .then(isConfirmed => {
          if (isConfirmed) {
            console.log('✅ Background: Transaction confirmed on chain');
            // Refresh balances again after confirmation to ensure accurate wallet state
            refetchBalances();
          } else {
            console.warn('⚠️ Background: Transaction confirmation timed out or check failed');
          }
        })
        .catch(confirmError => {
          console.warn('⚠️ Background: Confirmation check error:', confirmError);
        });

      // Immediately refresh orders since DB entry is created
      await refetchOrders();
      // Trigger balance refresh (might be stale until block confirms, but good to trigger)
      refetchBalances();

      return databaseOrder;

    } catch (sellError) {
      console.error('❌ Gasless sell order creation failed:', sellError);

      const errorMessage =
        sellError instanceof Error ? sellError.message : String(sellError);

      if (errorMessage.includes('CRITICAL')) {
        // Pass through our critical error as-is
        throw sellError;
      } else if (errorMessage.includes('Insufficient USDT balance')) {
        throw new Error(
          'Insufficient USDT balance. Please ensure you have enough USDT for this order.'
        );
      } else if (errorMessage.includes('timeout')) {
        throw new Error('Request timed out. Please try again.');
      } else {
        throw new Error(`Gasless sell order failed: ${errorMessage}`);
      }
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
        if (usdtAmount < SELL_CDM_MIN_USDT) {
          return {
            isValid: false,
            error: `Sell CDM orders require minimum ${SELL_CDM_MIN_USDT} USDT. Current: ${usdtAmount.toFixed(
              4
            )} USDT`,
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
      const minLimit =
        activeTab === "buy" ? BUY_CDM_MIN_USDT : SELL_CDM_MIN_USDT;
      const maxLimit =
        activeTab === "buy" ? BUY_CDM_MAX_USDT : SELL_CDM_MAX_USDT;
      return {
        min: minLimit * currentRate,
        max: maxLimit * currentRate,
      };
    }
    return { min: 0, max: Infinity };
  };

  // Update the handleBuySellClick function to include validation
  const handleBuySellClick = async () => {
    if (!isConnected || !amount || parseFloat(amount) <= 0) return;

    // CRITICAL: Check if smart wallet is ready before creating orders
    if (!isSmartWalletReady) {
      alert('Please wait for your smart wallet to initialize before creating orders.');
      console.log('⏳ Smart wallet not ready yet, please wait...');
      return;
    }

    console.log("🎯 Handle buy/sell click:", {
      activeTab,
      paymentMethod,
      hasBankDetails: !!bankDetails,
      walletAddress: address,
      isSmartWalletReady,
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
    !isSmartWalletReady ||
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

  function executeTxEthers(event: React.MouseEvent<HTMLButtonElement>): void {
    throw new Error("Function not implemented.");
  }

  async function approveGasStationAfterFunding(storedUsdtAmount: string, arg1: string, storedOrderType: string): Promise<boolean> {
    throw new Error("Function not implemented.");
    return false; // This line won't be reached, but satisfies TypeScript
  }

  return (
    <>
      <div className="bg-black text-white h-full flex items-center justify-center p-4 sm:p-8 max-w-4xl mx-auto">
        <div className="w-full space-y-4">
          {/* Enhanced Wallet Balance Card */}

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

                <div className="relative mb-4 sm:mb-6 flex justify-center">
                  <span className="absolute left-3 sm:left-65 top-1/2 transform -translate-y-1/2 text-gray-400 text-2xl sm:text-3xl">
                    {activeTab === "buy" ? "₹" : "$"}
                  </span>
                  <motion.input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-[#1E1C1C] border border-gray-600/50 rounded-xl py-4 sm:py-5 pl-10 sm:pl-12 pr-4 text-xl sm:text-2xl font-medium focus:outline-none focus:border-[#622DBF] focus:ring-2 focus:ring-purple-500/20 text-white placeholder-gray-500 w-full max-w-xs"
                    placeholder={
                      activeTab === "buy" ? "Enter rupees" : "Enter USDT"
                    }
                    whileFocus={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  />
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
                        Limits: {activeTab === "buy" ? BUY_CDM_MIN_USDT : SELL_CDM_MIN_USDT}-{activeTab === "buy" ? BUY_CDM_MAX_USDT : SELL_CDM_MAX_USDT} USDT (₹
                        {(
                          (activeTab === "buy" ? BUY_CDM_MIN_USDT : SELL_CDM_MIN_USDT) *
                          (activeTab === "buy" ? buyPrice : sellPrice)
                        ).toFixed(0)}{" "}
                        - ₹
                        {(
                          (activeTab === "buy" ? BUY_CDM_MAX_USDT : SELL_CDM_MAX_USDT) *
                          (activeTab === "buy" ? buyPrice : sellPrice)
                        ).toFixed(0)}
                        )
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

          {needsGasStationApproval && (
            <motion.div
              className="mt-4 bg-[#101010] border border-[#3E3E3E] rounded-md p-4 sm:p-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-green-600/20 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    Approve Gas Station for USDT Transfer
                  </h3>
                </div>

                {/* Description */}
                <p className="text-gray-300 text-sm leading-relaxed">
                  Please approve Gas Station to spend your USDT. After approval,
                  your USDT will be automatically transferred to the admin
                  account and your sell order will be created.
                </p>

                {/* Action Button */}
                <motion.button
                  onClick={async () => {
                    try {
                      setIsLoading(true);

                      const storedUsdtAmount = amount;
                      const storedInrAmount = calculateRupee(amount);
                      const storedOrderType =
                        paymentMethod === "cdm" ? "SELL_CDM" : "SELL";

                      console.log(
                        "🚀 Starting complete gasless sell order flow..."
                      );
                      console.log("📋 Order details:", {
                        usdtAmount: storedUsdtAmount,
                        inrAmount: storedInrAmount,
                        orderType: storedOrderType,
                        paymentMethod: paymentMethod.toUpperCase(),
                      });

                      // Execute approval and transfer
                      const transferSuccessful =
                        await approveGasStationAfterFunding(
                          storedUsdtAmount,
                          storedInrAmount.toString(),
                          storedOrderType
                        );

                      if (transferSuccessful) {
                        console.log(
                          "✅ Transfer completed successfully, creating database order..."
                        );

                        // Clear the approval UI
                        setNeedsGasStationApproval(false);

                        // Create database order after successful USDT transfer
                        const finalOrderAmount = parseFloat(storedInrAmount);
                        const rate = getSellRate(
                          paymentMethod === "cdm" ? "CDM" : "UPI"
                        );

                        const orderPayload = {
                          walletAddress: address,
                          orderType: storedOrderType,
                          amount: finalOrderAmount,
                          usdtAmount: storedUsdtAmount,
                          buyRate: null,
                          sellRate: rate,
                          paymentMethod: paymentMethod.toUpperCase(),
                          blockchainOrderId: null,
                          status: "PENDING_ADMIN_PAYMENT",
                          gasStationTxHash: "completed_via_approval_flow",
                        };

                        console.log(
                          "📝 Creating database order:",
                          orderPayload
                        );

                        const dbResponse = await fetch("/api/orders", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify(orderPayload),
                        });

                        if (dbResponse.ok) {
                          const data = await dbResponse.json();
                          if (data.success) {
                            console.log(
                              "✅ Database order created successfully:",
                              data.order
                            );

                            // Show success message
                            alert(
                              "✅ Sell order completed!\n\n" +
                              `• ${storedUsdtAmount} USDT transferred to admin\n` +
                              `• You will receive ₹${finalOrderAmount.toFixed(
                                2
                              )}\n` +
                              `• Order created: ${data.order.fullId || data.order.id
                              }\n\n` +
                              "Admin will process your payment shortly."
                            );

                            // Refresh data and reset form
                            setTimeout(async () => {
                              await refetchBalances();
                              await refetchOrders();
                              setAmount("");
                              console.log("🔄 Balances and orders refreshed");
                            }, 2000);
                          } else {
                            console.error(
                              "❌ Database order creation failed:",
                              data.error
                            );
                            alert(
                              "⚠️ USDT transfer was successful, but there was an issue creating the order record. Please contact support with your transaction details."
                            );
                          }
                        } else {
                          console.error(
                            "❌ Database API error:",
                            dbResponse.status
                          );
                          alert(
                            "⚠️ USDT transfer was successful, but there was an issue saving the order. Please contact support."
                          );
                        }
                      }
                    } catch (error) {
                      console.error(
                        "❌ Complete gasless sell order failed:",
                        error
                      );

                      const errorMessage =
                        error instanceof Error ? error.message : String(error);

                      if (
                        errorMessage.includes("approval transaction") ||
                        errorMessage.includes("not yet confirmed")
                      ) {
                        alert(
                          "⏳ Approval Transaction Pending\n\n" +
                          "Please wait for your approval transaction to be confirmed on the blockchain, then try again.\n\n" +
                          "This usually takes 1-2 minutes."
                        );
                      } else if (
                        errorMessage.includes("Insufficient allowance")
                      ) {
                        alert(
                          "⚠️ Approval Issue\n\n" +
                          "There seems to be an issue with the USDT approval. Please try the approval process again."
                        );
                      } else {
                        alert(`❌ Transaction failed: ${errorMessage}`);
                      }
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading}
                  className="w-full bg-[#622DBF] hover:bg-purple-700 disabled:bg-gray-600 disabled:opacity-50 text-white py-4 px-6 rounded-xl font-bold text-lg transition-all shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40 disabled:cursor-not-allowed"
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <motion.div
                        className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                      <span>Processing Transfer...</span>
                    </div>
                  ) : (
                    "Approve & Transfer USDT"
                  )}
                </motion.button>


                {/* Process Information */}
                <div className="bg-gray-900/30 border border-gray-700/50 rounded-lg p-4 mt-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <svg
                      className="w-5 h-5 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-sm font-medium text-white">
                      Process Overview
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-[#622DBF]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-[#622DBF]">
                          1
                        </span>
                      </div>
                      <span className="text-sm text-gray-300">
                        You approve Gas Station for USDT spending
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-[#622DBF]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-[#622DBF]">
                          2
                        </span>
                      </div>
                      <span className="text-sm text-gray-300">
                        Gas Station automatically transfers your USDT to admin
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-[#622DBF]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-[#622DBF]">
                          3
                        </span>
                      </div>
                      <span className="text-sm text-gray-300">
                        Your sell order is created
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-green-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-green-400">
                          4
                        </span>
                      </div>
                      <span className="text-sm text-gray-300">
                        Admin processes your payment
                      </span>
                    </div>
                  </div>
                </div>

                {/* Security Notice */}
                <div className="flex items-start space-x-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <svg
                    className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-blue-400 mb-1">
                      100% Safe Transaction
                    </h4>
                    <p className="text-xs text-gray-300">
                      Gas Station is our verified smart contract. Your approval
                      only allows spending the exact USDT amount for this trade.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

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

      <BankDetailsModal
        isOpen={showBankDetailsModal}
        onClose={() => setShowBankDetailsModal(false)}
        onSave={handleSaveBankDetails}
        isLoading={bankDetailsLoading}
      />
    </>
  );
}
async function verifyGasStationApproval(
  address: string,
  gasStationAddress: string,
  finalUsdtAmount: string
): Promise<boolean> {
  try {
    console.log("🔍 Verifying Gas Station approval...", {
      userAddress: address,
      gasStationAddress,
      requiredAmount: finalUsdtAmount,
    });

    // Check current allowance
    if (!usePublicClient || !('readContract' in usePublicClient)) throw new Error("Public client not available");
    const currentAllowance = await (usePublicClient as any).readContract({
      address: CONTRACTS.USDT[56],
      abi: USDT_ABI,
      functionName: "allowance",
      args: [address as `0x${string}`, gasStationAddress as `0x${string}`],
    });

    const requiredAmount = parseUnits(finalUsdtAmount, 18); // BSC USDT uses 18 decimals

    console.log("🔍 Approval verification:", {
      currentAllowance: currentAllowance.toString(),
      requiredAmount: requiredAmount.toString(),
      sufficient: currentAllowance >= requiredAmount,
    });

    return currentAllowance >= requiredAmount;
  } catch (error) {
    console.error("❌ Failed to verify Gas Station approval:", error);
    return false;
  }
}