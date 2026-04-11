"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { User } from "lucide-react";
import { useAccount } from "@particle-network/connectkit";
import { useAdminAPI } from "@/hooks/useAdminAPI";
import { useUserActivity } from "@/hooks/useUserActivity";
import { useRates } from "@/hooks/useRates";
import CancelOrderModal from "./modal/cancelOrder";
import { useAdminContract } from "@/hooks/useAdminContract";
import { usePublicClient } from "@particle-network/connectkit";
import { formatUnits, parseUnits } from "viem";
import { useWalletManager } from "@/hooks/useWalletManager";

interface Order {
  id: string;
  fullId: string;
  time: string;
  amount: number;
  usdtAmount?: number;
  type: string;
  orderType: string;
  price: number;
  currency: string;
  status: string;
  paymentProof?: string;
  adminUpiId?: string;
  adminBankDetails?: string;
  blockchainOrderId?: number;
  userConfirmedReceived?: boolean;
  userConfirmedAt?: string;
  user: {
    id: string;
    walletAddress: string;
    smartWalletAddress?: string | null;
    upiId: string | null;
    bankDetails: any;
  };
}

const CONTRACTS = {
  USDT: {
    [56]: "0x55d398326f99059fF775485246999027B3197955" as `0x${string}`,
  },
  P2P_TRADING: {
    [56]: "0xbfb247eA56F806607f2346D9475F669F30EAf2fB" as `0x${string}`,
  },
};

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
] as const;

const P2P_TRADING_ABI = [
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
    inputs: [],
    name: "getOrderCounter",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "orderCounter",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
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
    inputs: [{ internalType: "uint256", name: "_orderId", type: "uint256" }],
    name: "completeBuyOrder",
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
  {
    inputs: [],
    name: "getAdminWallet",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export default function AdminCenter() {
  const [orderStatuses, setOrderStatuses] = useState<{
    [key: string]: { [key: string]: "waiting" | "completed" };
  }>({});
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderIndex, setSelectedOrderIndex] = useState<number | null>(
    null
  );
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { makeAdminRequest } = useAdminAPI();
  const isUserActive = useUserActivity(5000);
  const { getBuyRate, getSellRate } = useRates();
  const [lastCenterRefresh, setLastCenterRefresh] = useState(Date.now());

  // Add approval state management
  const [adminApprovalState, setAdminApprovalState] = useState<{
    [orderIndex: number]: "none" | "approving" | "approved" | "failed";
  }>({});

  const [userMoneyNotifications, setUserMoneyNotifications] = useState<{
    [orderId: string]: {
      message: string;
      timestamp: Date;
      amount: string;
    };
  }>({});

  // In admin_center.tsx, update the database update event listener:

  useEffect(() => {
    const handleDatabaseUpdate = (event: CustomEvent) => {
      const { orderId, action, userConfirmedReceived } = event.detail;

      console.log('🔄 Database update received in admin center:', {
        orderId,
        action,
        userConfirmedReceived
      });

      if (action === 'userConfirmedReceived') {
        console.log('💾 User confirmed money received - updating orders state');

        // Update local state immediately
        setOrders(prevOrders =>
          prevOrders.map(order =>
            (order.fullId === orderId || order.id === orderId)
              ? {
                ...order,
                userConfirmedReceived: true,
                userConfirmedAt: new Date().toISOString()
              }
              : order
          )
        );

        setTimeout(() => {
          console.log('🔄 Refreshing orders from database');
          fetchAcceptedOrders();
        }, 2000);
      }
    };

    window.addEventListener('orderDatabaseUpdated', handleDatabaseUpdate as EventListener);

    return () => {
      window.removeEventListener('orderDatabaseUpdated', handleDatabaseUpdate as EventListener);
    };
  }, []);
  useEffect(() => {
    if (chainId && chainId !== 56) {
      console.warn(
        `⚠️ Admin center requires BSC Mainnet (56), currently on chain ${chainId}`
      );
    }
  }, [chainId]);

  const {
    createBuyOrderOnChain,
    completeBuyOrderOnChain,
    completeSellOrderOnChain,
    verifyPaymentOnChain,
    approveOrderOnChain,
    transferUSDT,
    approveUSDT,
    adminExecuteSellTransfer,
    hash: walletHash,
    isPending: walletPending,
  } = useWalletManager();

  const {
    handleVerifyPayment,
    handleCompleteBuyOrder,
    handleCompleteSellOrder,
    handleApproveOrder,
    isTransacting,
    lastAction,
    hash,
  } = useAdminContract();

  useEffect(() => {
    fetchAcceptedOrders();

    const handleOrderAccepted = (event: CustomEvent) => {
      console.log("Order accepted event received:", event.detail);
      setTimeout(() => fetchAcceptedOrders(), 1000);
    };

    window.addEventListener(
      "orderAccepted",
      handleOrderAccepted as EventListener
    );

    return () => {
      window.removeEventListener(
        "orderAccepted",
        handleOrderAccepted as EventListener
      );
    };
  }, [address]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if no order is selected and user is not active
      if (!selectedOrder && !isUserActive) {
        console.log("🔄 Auto-refreshing admin center orders");
        fetchAcceptedOrders();
        setLastCenterRefresh(Date.now());
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedOrder, isUserActive]);

  useEffect(() => {
    // Broadcast when order is selected/deselected to pause refresh in other components
    if (selectedOrder) {
      window.dispatchEvent(new CustomEvent("adminOrderSelected"));
    } else {
      window.dispatchEvent(new CustomEvent("adminOrderDeselected"));
    }
  }, [selectedOrder]);

  // Add useEffect to listen for user money received events:
  useEffect(() => {
    const handleUserReceivedMoney = (event: CustomEvent) => {
      const { orderId, orderType, amount, timestamp } = event.detail;

      console.log("💰 Admin Center received user money notification:", {
        orderId,
        orderType,
        amount,
        timestamp,
        currentOrders: orders.map(o => ({ id: o.id, fullId: o.fullId, orderType: o.orderType }))
      });

      // 🔥 ENHANCED: More flexible order ID matching
      const matchingOrder = orders.find(order =>
        order.fullId === orderId ||
        order.id === orderId ||
        order.fullId?.includes(orderId) ||
        orderId?.includes(order.fullId)
      );

      if (matchingOrder) {
        console.log("✅ Found matching order for notification:", matchingOrder.fullId);

        setUserMoneyNotifications((prev) => ({
          ...prev,
          [orderId]: {
            message: "User received money in their account",
            timestamp: new Date(timestamp),
            amount: amount,
          },
        }));

        // Auto-dismiss after 30 seconds
        setTimeout(() => {
          setUserMoneyNotifications((prev) => {
            const newNotifications = { ...prev };
            delete newNotifications[orderId];
            return newNotifications;
          });
        }, 30000);
      } else {
        console.warn("⚠️ No matching order found for notification:", {
          eventOrderId: orderId,
          availableOrders: orders.map(o => ({ id: o.id, fullId: o.fullId }))
        });
      }
    };

    // 🔥 ENHANCED: Add the event listener immediately and also listen on document
    console.log("🎧 Setting up user money received event listener in admin center");

    window.addEventListener('userReceivedMoney', handleUserReceivedMoney as EventListener);
    document.addEventListener('userReceivedMoney', handleUserReceivedMoney as EventListener);

    return () => {
      window.removeEventListener('userReceivedMoney', handleUserReceivedMoney as EventListener);
      document.removeEventListener('userReceivedMoney', handleUserReceivedMoney as EventListener);
    };
  }, [orders]); // 🔥 ADD: Depend on orders so it re-registers when orders change

  const fetchAcceptedOrders = async () => {
    if (!address) {
      console.log("No admin wallet address available");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("Fetching accepted orders for admin center...");

      const data = await makeAdminRequest(
        "/api/admin/orders?status=pending,pending_admin_payment"
      );

      if (data.success) {
        const acceptedOrders = data.orders.filter((order: Order) =>
          [
            "ADMIN_APPROVED",
            "PAYMENT_SUBMITTED",
            "PENDING_ADMIN_PAYMENT",
          ].includes(order.status)
        );
        console.log("Accepted orders found:", acceptedOrders.length);
        setOrders(acceptedOrders);
      } else {
        console.error("API returned error:", data.error);
        setError(data.error);
      }
    } catch (error) {
      console.error("Error fetching accepted orders:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch accepted orders"
      );
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (
    orderId: string,
    status: string,
    additionalData: any = {}
  ) => {
    try {
      console.log("Updating order status:", orderId, "to", status);

      const data = await makeAdminRequest(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          ...additionalData,
        }),
      });

      if (data.success) {
        console.log("Order status updated successfully");
        fetchAcceptedOrders();
      } else {
        console.error("Failed to update order status:", data.error);
      }
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  const getValidOrderId = (order: Order): number => {
    console.log("🔍 Getting valid order ID for:", {
      fullId: order.fullId,
      blockchainOrderId: order.blockchainOrderId,
      id: order.id,
    });

    // First try blockchainOrderId if it exists
    if (order.blockchainOrderId) {
      const blockchainId = parseInt(order.blockchainOrderId.toString());
      if (!isNaN(blockchainId) && blockchainId > 0) {
        console.log("✅ Using blockchainOrderId:", blockchainId);
        return blockchainId;
      }
    }

    // Try to extract number from fullId
    const fullIdNumbers = order.fullId.replace(/\D/g, "");
    if (fullIdNumbers) {
      const extractedId = parseInt(fullIdNumbers);
      if (!isNaN(extractedId) && extractedId > 0) {
        console.log("✅ Using extracted ID from fullId:", extractedId);
        return extractedId;
      }
    }


    const parsedId = parseInt(order.id);
    if (!isNaN(parsedId) && parsedId > 0) {
      console.log("✅ Using parsed order.id:", parsedId);
      return parsedId;
    }


    let hash = 0;
    for (let i = 0; i < order.fullId.length; i++) {
      const char = order.fullId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    const hashId = (Math.abs(hash) % 1000000) + 1;

    console.warn(
      "⚠️ Using fallback hash ID:",
      hashId,
      "for order:",
      order.fullId
    );
    return hashId;
  };

  // Update the approval function
  const approveAdminUSDT = async (orderIndex: number): Promise<boolean> => {
    if (!address || chainId !== 56) return false;

    try {
      setAdminApprovalState((prev) => ({
        ...prev,
        [orderIndex]: "approving",
      }));

      const order = orders[orderIndex];
      const buyRate = getBuyRate(order.currency as "UPI" | "CDM");

      const usdtAmountToTransfer = order.usdtAmount
        ? order.usdtAmount.toString()
        : (order.amount / buyRate).toFixed(6);

      console.log("🔓 Admin approving USDT for Gas Station address...", {
        adminAddress: address,
        orderAmountINR: order.amount,
        usdtAmountNeeded: usdtAmountToTransfer,
        buyRate,
        gasStationAddress: "0x1dA2b030808D46678284dB112bfe066AA9A8be0E",
      });

      const GAS_STATION_ADDRESS = "0x1dA2b030808D46678284dB112bfe066AA9A8be0E";

      const approveAmount = "1000000";

      console.log(
        "🔓 Approving large amount for multiple future transactions:",
        {
          approveAmount,
          gasStation: GAS_STATION_ADDRESS,
        }
      );

      await approveUSDT(GAS_STATION_ADDRESS as `0x${string}`, approveAmount);

      console.log("⏳ Waiting for Gas Station approval transaction...");
      await new Promise((resolve) => setTimeout(resolve, 15000));

      // Verify approval worked
      const isApproved = await checkAdminApproval(orderIndex);

      setAdminApprovalState((prev) => ({
        ...prev,
        [orderIndex]: isApproved ? "approved" : "failed",
      }));

      if (isApproved) {
        console.log("✅ Gas Station USDT approval successful");
      } else {
        console.error("❌ Gas Station approval verification failed");
      }

      return isApproved;
    } catch (error) {
      console.error("❌ Gas Station USDT approval failed:", error);
      setAdminApprovalState((prev) => ({
        ...prev,
        [orderIndex]: "failed",
      }));
      return false;
    }
  };

  // Update the approval check function
  const checkAdminApproval = async (orderIndex: number): Promise<boolean> => {
    if (!address || chainId !== 56) return false;

    try {
      const order = orders[orderIndex];
      const buyRate = getBuyRate(order.currency as "UPI" | "CDM");

      // 🔥 FIX: Calculate the actual USDT amount needed
      let usdtAmountNeeded: string;

      if (order.usdtAmount) {
        usdtAmountNeeded = order.usdtAmount.toString();
      } else {
        usdtAmountNeeded = (order.amount / buyRate).toFixed(6);
      }

      // 🔥 FIX: Use 18 decimals for BSC USDT, not 6
      const usdtAmountWei = parseUnits(usdtAmountNeeded, 18); // BSC USDT uses 18 decimals

      const GAS_STATION_ADDRESS = "0x1dA2b030808D46678284dB112bfe066AA9A8be0E";

      if (!publicClient || !('readContract' in publicClient)) throw new Error("Public client not available");
      const currentAllowance = await (publicClient as any).readContract({
        address: CONTRACTS.USDT[56],
        abi: [
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
        ],
        functionName: "allowance",
        args: [address, GAS_STATION_ADDRESS],
      });

      console.log("🔍 Admin approval check for Gas Station:", {
        orderAmountINR: order.amount,
        usdtAmountNeeded,
        required: formatUnits(usdtAmountWei, 18),
        approved: formatUnits(currentAllowance, 18),
        sufficient: currentAllowance >= usdtAmountWei,
        gasStationAddress: GAS_STATION_ADDRESS,
        buyRate,
      });

      return currentAllowance >= usdtAmountWei;
    } catch (error) {
      console.error("❌ Error checking Gas Station approval:", error);
      return false;
    }
  };

  // Update the approval strategy
  const handleButtonClick = async (orderIndex: number, tag: string) => {
    const order = orders[orderIndex];
    const currentStatus = orderStatuses[orderIndex]?.[tag];

    // Force mainnet check
    if (chainId !== 56) {
      alert("Please switch to BSC Mainnet (Chain ID 56) to process orders");
      return;
    }

    console.log("🎯 Button clicked (BSC Mainnet):", {
      tag,
      orderIndex,
      currentStatus,
      chainId: 56,
      order: {
        fullId: order.fullId,
        orderType: order.orderType,
        status: order.status,
        amount: order.amount,
        usdtAmount: order.usdtAmount,
      },
    });

    try {
      // Handle blockchain interactions for verified button
      if (tag.toLowerCase() === "verified" && !currentStatus) {
        console.log("🔗 First verified button clicked...");

        // Update the buy order handling with approval check
        if (order.orderType.includes("BUY")) {
          console.log(
            "💰 BUY ORDER: Processing via Gas Station on BSC Mainnet..."
          );

          try {
            const buyRate = getBuyRate(order.currency as "UPI" | "CDM");

            // 🔥 FIX: Calculate correct USDT amount based on actual order
            let usdtAmountToTransfer: string;

            if (order.usdtAmount) {
              // Use the stored USDT amount if available
              usdtAmountToTransfer = order.usdtAmount.toString();
            } else {
              // Calculate USDT amount from INR amount using the rate
              usdtAmountToTransfer = (order.amount / buyRate).toFixed(6);
            }

            console.log("📊 Buy order transfer details (BSC Mainnet):", {
              orderAmountINR: order.amount,
              usdtAmountToTransfer,
              buyRate,
              orderType: order.orderType,
              useGasStation: true,
              chainId: 56,
              calculation: `${order.amount} INR ÷ ${buyRate} rate = ${usdtAmountToTransfer} USDT`,
            });

            const transferAmount = parseFloat(usdtAmountToTransfer);
            if (transferAmount <= 0 || isNaN(transferAmount)) {
              throw new Error(
                `Invalid USDT transfer amount calculated: ${usdtAmountToTransfer}`
              );
            }

            if (transferAmount > 1000) {
              // Safety check for large amounts
              const confirmLargeTransfer = confirm(
                `⚠️ LARGE TRANSFER CONFIRMATION\n\n` +
                `You are about to transfer ${usdtAmountToTransfer} USDT\n` +
                `Order Amount: ₹${order.amount}\n` +
                `Rate: ₹${buyRate}/USDT\n\n` +
                `Click OK to confirm this transfer`
              );

              if (!confirmLargeTransfer) {
                console.log("❌ Large transfer cancelled by admin");
                return;
              }
            }

            // Step 1: Check if admin has sufficient USDT allowance
            console.log("🔍 Step 1: Checking admin USDT allowance...");
            const hasApproval = await checkAdminApproval(orderIndex);

            if (!hasApproval) {
              console.log("🔓 Admin needs one-time USDT approval...");

              // Show one-time approval modal
              const shouldApprove = confirm(
                `🔐 ONE-TIME SETUP REQUIRED\n\n` +
                `To enable Gas Station transfers, you need to approve USDT spending once.\n\n` +
                `✅ You pay gas for this approval (~$0.20)\n` +
                `✅ Gas Station pays gas for all future transfers\n` +
                `✅ Approving 1,000,000 USDT for future orders\n\n` +
                `Current order: ${usdtAmountToTransfer} USDT (₹${order.amount})\n\n` +
                `Click OK to approve (one-time only)`
              );

              if (!shouldApprove) {
                console.log("❌ Admin approval cancelled by user");
                return;
              }

              // Admin pays gas for this one approval
              setOrderStatuses((prev) => ({
                ...prev,
                [orderIndex]: {
                  ...prev[orderIndex],
                  [tag]: "waiting",
                },
              }));

              console.log(
                "🔓 Admin performing one-time USDT approval (admin pays gas)..."
              );

              try {
                await approveAdminUSDT(orderIndex);

                console.log("⏳ Waiting for admin approval transaction...");
                await new Promise((resolve) => setTimeout(resolve, 10000));

                // Verify approval worked
                const isApproved = await checkAdminApproval(orderIndex);
                if (!isApproved) {
                  throw new Error("USDT approval verification failed");
                }

                console.log("✅ One-time admin USDT approval successful");
              } catch (approvalError) {
                console.error("❌ Admin USDT approval failed:", approvalError);
                setOrderStatuses((prev) => ({
                  ...prev,
                  [orderIndex]: {
                    ...prev[orderIndex],
                    [tag]: undefined,
                  },
                }));

                const errorMessage =
                  approvalError instanceof Error
                    ? approvalError.message
                    : String(approvalError);

                if (errorMessage.includes("User rejected")) {
                  throw new Error(
                    "Approval cancelled by user. Please approve USDT spending to continue."
                  );
                } else {
                  throw new Error(`USDT approval failed: ${errorMessage}`);
                }
              }
            }

            // Step 2: Now Gas Station executes the transfer (Gas Station pays gas)
            console.log(
              `🚀 Step 2: Gas Station executing transfer of ${usdtAmountToTransfer} USDT (Gas Station pays gas)...`
            );

            // 🔥 FIX: Pass the calculated USDT amount, not hardcoded "1"
            await transferUSDT(
              order.user.walletAddress as `0x${string}`,
              usdtAmountToTransfer, // Use calculated amount instead of hardcoded "1"
              true // Use Gas Station
            );

            console.log(
              "⏳ Waiting for Gas Station transaction confirmation..."
            );
            await new Promise((resolve) => setTimeout(resolve, 8000));

            await updateOrderStatus(order.fullId, "PAYMENT_VERIFIED");

            console.log(
              `✅ Buy order completed - Transferred ${usdtAmountToTransfer} USDT via Gas Station`
            );

            setOrderStatuses((prev) => ({
              ...prev,
              [orderIndex]: {
                ...prev[orderIndex],
                [tag]: "completed",
              },
            }));
          } catch (blockchainError) {
            console.error(
              "❌ Gas Station buy order transfer failed:",
              blockchainError
            );

            // Reset button state on error
            setOrderStatuses((prev) => ({
              ...prev,
              [orderIndex]: {
                ...prev[orderIndex],
                [tag]: undefined,
              },
            }));

            const errorMessage =
              blockchainError instanceof Error
                ? blockchainError.message
                : String(blockchainError);

            // Enhanced error handling for Gas Station
            if (errorMessage.includes("Admin USDT approval failed")) {
              throw new Error(
                "Admin USDT approval failed. Please ensure your wallet is connected and try again."
              );
            } else if (errorMessage.includes("Gas Station not ready")) {
              throw new Error(
                "Gas Station is not ready on BSC Mainnet. Please contact support or try again later."
              );
            } else if (errorMessage.includes("Gas Station is disabled")) {
              throw new Error(
                "Gas Station is currently disabled. Please try again later."
              );
            } else if (errorMessage.includes("Insufficient USDT balance")) {
              throw new Error(
                "Admin has insufficient USDT balance to complete this buy order."
              );
            } else if (errorMessage.includes("insufficient allowance")) {
              throw new Error(
                "Admin USDT allowance insufficient. Please approve USDT spending first."
              );
            } else {
              throw new Error(`Buy order transfer failed: ${errorMessage}`);
            }
          }
        } else if (order.orderType.includes("SELL")) {
          console.log(
            "💰 SELL ORDER: Direct transfer completed - marking as verified..."
          );
          await updateOrderStatus(order.fullId, "PAYMENT_VERIFIED");
          console.log("✅ Sell order verified - USDT transferred to admin");
        }

        setOrderStatuses((prev) => ({
          ...prev,
          [orderIndex]: {
            ...prev[orderIndex],
            [tag]: "completed",
          },
        }));

        return;
      }

      // Rest of the existing logic...
      setOrderStatuses((prev) => {
        let newStatus: "waiting" | "completed" | undefined;

        if (hasUserIcon(tag, orderIndex)) {
          if (!currentStatus) {
            newStatus = "waiting";
          } else if (currentStatus === "waiting") {
            newStatus = "completed";

            if (tag.toLowerCase() === "complete") {
              updateOrderStatus(order.fullId, "COMPLETED");
            }
          } else {
            newStatus = "waiting";
          }
        } else {
          newStatus = currentStatus === "completed" ? undefined : "completed";

          if (newStatus === "completed") {
            if (
              tag.toLowerCase() === "pay info" ||
              tag.toLowerCase() === "pay info(full)"
            ) {
              updateOrderStatus(order.fullId, "ADMIN_SENT_PAYMENT_INFO");
            }
          }
        }

        return {
          ...prev,
          [orderIndex]: {
            ...prev[orderIndex],
            [tag]: newStatus,
          },
        };
      });
    } catch (error) {
      console.error("❌ Error in button click handler:", error);

      // Enhanced error messages
      let errorMessage = "Transaction failed.";
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (errorMsg.includes("Admin USDT approval failed")) {
        errorMessage =
          "Admin USDT approval failed. Please ensure your wallet is connected and has sufficient BNB for gas fees.";
      } else if (errorMsg.includes("insufficient")) {
        errorMessage =
          "Insufficient balance. Please ensure admin has enough USDT and BNB for gas fees.";
      } else if (errorMsg.includes("Wallet not connected")) {
        errorMessage = "Please connect your admin wallet.";
      } else if (errorMsg.includes("Admin USDT allowance insufficient")) {
        errorMessage =
          "Admin needs to approve USDT spending. Please use the approve button and try again.";
      }

      alert(`${errorMessage}\n\nDetailed error: ${errorMsg}`);
    }
  };

  const handleAcceptedDoubleClick = (order: Order) => {
    setSelectedOrder(order);
    setShowCancelModal(true);
  };

  const handleCancelOrder = async (reason: string) => {
    if (selectedOrder) {
      await updateOrderStatus(selectedOrder.fullId, "CANCELLED", {
        adminNotes: reason,
      });
    }

    setShowCancelModal(false);
    setSelectedOrder(null);
  };

  const handleCloseCancelModal = () => {
    setShowCancelModal(false);
    setSelectedOrder(null);
  };

  const getButtonStatus = (orderIndex: number, tag: string) => {
    return orderStatuses[orderIndex]?.[tag];
  };

  const getTagColor = (tag: string, orderIndex: number) => {
    const status = getButtonStatus(orderIndex, tag);

    if (hasUserIcon(tag, orderIndex)) {
      switch (status) {
        case "waiting":
        default:
          return "bg-gray-600 text-white";
      }
    }

    switch (status) {
      case "completed":
        return "bg-green-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  const hasUserIcon = (tag: string, orderIndex: number) => {
    const normalizedTag = tag.toLowerCase();
    const order = orders[orderIndex];

    if (order.currency === "CDM" && order.type.includes("Buy")) {
      return ["pay info(full)", "bank details", "complete"].includes(
        normalizedTag
      );
    }

    return ["pay info", "pay info(full)", "paid", "complete"].includes(
      normalizedTag
    );
  };

  // Update the getOrderTags function to reflect the simplified flow:
  const getOrderTags = (order: Order) => {
    if (order.orderType === "BUY_CDM") {
      return [
        "Accepted",
        "Pay info(full)",
        "Paid",
        "Bank details",
        "Paid",
        "Verified",
        "Complete",
      ];
    } else if (order.orderType === "BUY_UPI") {
      return [
        "Accepted",
        "Pay info",
        "Verified",
        "Paid",
        "Verified",
        "Complete",
      ];
    } else if (
      order.orderType.includes("SELL") &&
      order.status === "PENDING_ADMIN_PAYMENT"
    ) {
      // For sell orders where USDT is already received by admin
      return ["USDT Received", "Send Payment", "Payment Sent", "Complete"];
    } else if (order.orderType.includes("SELL")) {
      return ["Accepted", "Paid", "Verified", "Complete"];
    } else {
      return ["Accepted", "Paid", "Verified", "Complete"];
    }
  };

  const handleOrderClick = (order: Order, index: number) => {
    setSelectedOrder(order);
    setSelectedOrderIndex(index);

    window.dispatchEvent(
      new CustomEvent("orderSelected", {
        detail: { order, index },
      })
    );
  };

  const handleOrderDeselect = () => {
    setSelectedOrder(null);
    setSelectedOrderIndex(null);

    window.dispatchEvent(new CustomEvent("orderDeselected"));
  };

  useEffect(() => {
    const handleExternalOrderDeselect = () => {
      setSelectedOrder(null);
      setSelectedOrderIndex(null);
    };

    window.addEventListener(
      "orderDeselected",
      handleExternalOrderDeselect as EventListener
    );

    return () => {
      window.removeEventListener(
        "orderDeselected",
        handleExternalOrderDeselect as EventListener
      );
    };
  }, []);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selectedOrder) {
        handleOrderDeselect();
      }
    };

    window.addEventListener("keydown", handleKeyPress);

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [selectedOrder]);

  // Add function to manually dismiss notification:
  const dismissNotification = (orderId: string) => {
    setUserMoneyNotifications((prev) => {
      const newNotifications = { ...prev };
      delete newNotifications[orderId];
      return newNotifications;
    });
  };

  const handleDismissUserConfirmation = async (orderId: string) => {
    try {
      console.log('🔕 Admin dismissing user confirmation notification for:', orderId);

      setOrders(prevOrders =>
        prevOrders.map(order =>
          (order.fullId === orderId || order.id === orderId)
            ? { ...order, userConfirmedReceived: false }
            : order
        )
      );


    } catch (error) {
      console.error('❌ Error dismissing user confirmation:', error);
    }
  };

  console.log("Admin Center State:", {
    loading,
    ordersCount: orders.length,
    hasAddress: !!address,
    error,
  });

  return (
    <div className="bg-[#141414] text-white h-full py-4 px-2 overflow-y-auto">
      {/* Add mainnet warning */}
      {chainId && chainId !== 56 && (
        <div className="mb-4 p-3 bg-red-600/20 border border-red-600/50 rounded text-sm text-red-300">
          <div className="font-medium">Wrong Network</div>
          <div>
            Please switch to BSC Mainnet (Chain ID 56) to use admin functions
          </div>
        </div>
      )}

      <div className="flex bg-[#1E1E1E] rounded-sm items-center justify-center mb-6 space-x-2">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <h2 className="text-lg font-semibold text-white p-2">
          Accepted Orders
        </h2>
        {selectedOrder && (
          <div className="flex items-center space-x-1 text-xs bg-purple-600/20 px-2 py-1 rounded">
            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
            <span className="text-purple-400">
              Selected: {selectedOrder.id}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-600/20 border border-red-600/50 rounded text-sm text-red-300">
          <div className="font-medium">Error:</div>
          <div>{error}</div>
        </div>
      )}

      {!address && (
        <div className="mb-4 p-3 bg-yellow-600/20 border border-yellow-600/50 rounded text-sm text-yellow-300">
          <div className="font-medium">Admin wallet not connected</div>
          <div>Please connect your admin wallet to view orders</div>
        </div>
      )}

      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-2 bg-blue-600/20 border border-blue-600/50 rounded">
          <button
            onClick={() => {
              const testOrder = orders[0];
              if (testOrder) {
                window.dispatchEvent(new CustomEvent('userReceivedMoney', {
                  detail: {
                    orderId: testOrder.fullId || testOrder.id,
                    orderType: testOrder.orderType,
                    amount: "1000.00",
                    timestamp: new Date().toISOString()
                  }
                }));
              }
            }}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
          >
            🧪 Test Notification (Dev Only)
          </button>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
            <p className="text-gray-400 mt-2">Loading accepted orders...</p>
          </div>
        ) : !address ? (
          <div className="text-center py-8">
            <p className="text-gray-400">Connect admin wallet to view orders</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No accepted orders found</p>
            <p className="text-xs text-gray-500 mt-2">
              Orders will appear here after you accept them from the left panel
            </p>
            {!error && (
              <button
                onClick={fetchAcceptedOrders}
                className="mt-3 px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
              >
                Refresh Accepted Orders
              </button>
            )}
          </div>
        ) : (
          orders.map((order, index) => {
            const buyRate = getBuyRate(order.currency as "UPI" | "CDM");
            const sellRate = getSellRate(order.currency as "UPI" | "CDM");

            let primaryAmount = "";
            let secondaryAmount = "";
            let rateDisplay = "";

            if (order.orderType.includes("BUY")) {
              const usdtAmount = (order.amount / buyRate).toFixed(6);
              primaryAmount = `₹${order.amount}`;
              secondaryAmount = `${usdtAmount} USDT`;
              rateDisplay = `₹${buyRate}/USDT`;
            } else {
              if (order.usdtAmount) {
                primaryAmount = `${parseFloat(
                  order.usdtAmount.toString()
                ).toFixed(2)} USDT`;
                secondaryAmount = `₹${order.amount}`;
              } else {
                const usdtAmount = (order.amount / sellRate).toFixed(4);
                primaryAmount = `${usdtAmount} USDT`;
                secondaryAmount = `₹${order.amount}`;
              }
              rateDisplay = `₹${sellRate}/USDT`;
            }

            const hasUserMoneyNotification =
              userMoneyNotifications[order.fullId || order.id];

            return (
              <div
                key={order.fullId}
                className={`rounded-md py-2 px-2 cursor-pointer transition-all duration-200 ${selectedOrderIndex === index
                  ? "bg-gradient-to-r from-purple-600/30 to-purple-500/20 border-2 border-purple-500 shadow-lg shadow-purple-500/20"
                  : "bg-[#1D1C1C] border-2 border-transparent hover:bg-[#2A2A2A] hover:border-purple-500/30"
                  }`}
                onClick={() => handleOrderClick(order, index)}
              >
                {selectedOrderIndex === index && (
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                      <span className="text-purple-400 text-xs font-medium">
                        SELECTED ORDER
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOrderDeselect();
                      }}
                      className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded bg-gray-700/50 hover:bg-gray-600/50 transition-colors"
                    >
                      Deselect
                    </button>
                  </div>
                )}

                {order.orderType.includes("SELL") && order.userConfirmedReceived && (
                  <div className="mb-3 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-green-400 font-medium text-sm">
                          💰 User confirmed: Money received in their account
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismissUserConfirmation(order.fullId || order.id);
                        }}
                        className="text-green-300 hover:text-white text-xs px-2 py-1 rounded bg-green-700/30 hover:bg-green-600/50 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="text-xs text-green-300 mt-1">
                      Amount: ₹{order.amount} •
                      Confirmed: {order.userConfirmedAt ? new Date(order.userConfirmedAt).toLocaleString() : 'Just now'}
                    </div>
                    <div className="text-xs text-green-200 mt-1 italic">
                      Database confirmation • Order: {order.orderType}
                    </div>
                  </div>
                )}

                {order.orderType.includes("SELL") &&
                  (userMoneyNotifications[order.fullId] || userMoneyNotifications[order.id]) && (
                    <div className="mb-3 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-green-400 font-medium text-sm">
                            💰 User received money in their account
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissNotification(order.fullId || order.id);
                          }}
                          className="text-green-300 hover:text-white text-xs px-2 py-1 rounded bg-green-700/30 hover:bg-green-600/50 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="text-xs text-green-300 mt-1">
                        Amount: ₹{(userMoneyNotifications[order.fullId] || userMoneyNotifications[order.id])?.amount} •
                        Time: {(userMoneyNotifications[order.fullId] || userMoneyNotifications[order.id])?.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  )}

                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span
                      className={`text-md font-medium ${selectedOrderIndex === index
                        ? "text-white"
                        : "text-white"
                        }`}
                    >
                      {order.id}
                    </span>
                    <div
                      className={`text-xs ${selectedOrderIndex === index
                        ? "text-purple-200"
                        : "text-white"
                        }`}
                    >
                      {order.time}
                    </div>
                    <div
                      className={`text-xs mt-1 ${selectedOrderIndex === index
                        ? "text-purple-300"
                        : "text-gray-400"
                        }`}
                    >
                      {order.user.smartWalletAddress ? (
                        <span>{order.user.smartWalletAddress.slice(0, 6)}...{order.user.smartWalletAddress.slice(-4)}</span>
                      ) : (
                        <span>
                          {order.user.walletAddress.slice(0, 6)}...
                          {order.user.walletAddress.slice(-4)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className={`flex items-center space-x-2 border py-0.5 px-0.5 rounded ${selectedOrderIndex === index
                      ? "border-purple-400/50"
                      : "border-[#464646]"
                      }`}
                  >
                    <span
                      className={`font-bold py-0.5 px-1.5 rounded-sm ${selectedOrderIndex === index
                        ? "bg-purple-800/30 text-white"
                        : "bg-[#222] text-white"
                        }`}
                    >
                      {primaryAmount}
                    </span>
                    <div className="flex items-center space-x-1">
                      <Image
                        src={
                          order.type.includes("Buy") ? "/buy.svg" : "/sell.svg"
                        }
                        alt={order.type.includes("Buy") ? "Buy" : "Sell"}
                        width={14}
                        height={14}
                        className="flex-shrink-0"
                      />
                      <span
                        className={`text-sm ${selectedOrderIndex === index
                          ? "text-purple-200"
                          : "text-gray-400"
                          }`}
                      >
                        {order.type}
                      </span>
                    </div>
                    <span
                      className={`font-bold py-0.5 px-1.5 rounded-sm ${selectedOrderIndex === index
                        ? "bg-purple-800/30 text-white"
                        : "bg-[#222] text-white"
                        }`}
                    >
                      {secondaryAmount}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    {order.currency === "UPI" ? (
                      <Image
                        src="/phonepay-gpay.svg"
                        alt="UPI"
                        width={20}
                        height={12}
                        className="flex-shrink-0"
                      />
                    ) : (
                      <Image
                        src="/bank.svg"
                        alt="CDM"
                        width={16}
                        height={16}
                        className="flex-shrink-0"
                      />
                    )}
                    <span
                      className={`text-sm ${selectedOrderIndex === index
                        ? "text-white font-medium"
                        : "text-white"
                        }`}
                    >
                      {order.currency}
                    </span>
                  </div>
                </div>

                <div className="text-center mb-2">
                  <span
                    className={`text-xs ${selectedOrderIndex === index
                      ? "text-purple-300"
                      : "text-gray-500"
                      }`}
                  >
                    Rate: {rateDisplay}
                  </span>
                </div>

                {order.orderType.includes("BUY") && (
                  <div className="mb-2 text-xs">
                    {adminApprovalState[index] === "approving" && (
                      <div className="text-yellow-400 flex items-center space-x-1">
                        <div className="w-3 h-3 border border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                        <span>Approving USDT...</span>
                      </div>
                    )}
                    {adminApprovalState[index] === "approved" && (
                      <div className="text-green-400 flex items-center space-x-1">
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        <span>USDT Approved</span>
                      </div>
                    )}
                    {adminApprovalState[index] === "failed" && (
                      <div className="text-red-400 flex items-center space-x-1">
                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                        <span>Approval Failed</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {getOrderTags(order).map((tag, tagIndex) => (
                    <button
                      key={tagIndex}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleButtonClick(index, tag);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (tag === "Accepted") {
                          handleAcceptedDoubleClick(order);
                        }
                      }}
                      className={`px-3 py-1 rounded-xs text-xs font-medium flex items-center space-x-1 transition-all hover:opacity-80 cursor-pointer ${getTagColor(
                        tag,
                        index
                      )} ${tag === "Accepted" ? "hover:bg-red-600" : ""} ${selectedOrderIndex === index ? "shadow-sm" : ""
                        }`}
                    >
                      {hasUserIcon(tag, index) && <User className="w-3 h-3" />}
                      <span>{tag}</span>
                    </button>
                  ))}
                </div>

                {selectedOrderIndex !== index && (
                  <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="text-xs text-gray-500 text-center">
                      Click to select and view details →
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {selectedOrder && (
        <div className="mt-6 pt-4 border-t border-gray-700">
          <button
            onClick={handleOrderDeselect}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors flex items-center justify-center space-x-2"
          >
            <span>Clear Selection</span>
            <span className="text-xs bg-gray-700 px-2 py-1 rounded">ESC</span>
          </button>
        </div>
      )}

      <CancelOrderModal
        isOpen={showCancelModal}
        onClose={handleCloseCancelModal}
        onConfirm={handleCancelOrder}
      />

      {isTransacting && (
        <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>
              {lastAction === "verifying" &&
                "Verifying payment on blockchain..."}
              {lastAction === "completing_buy" &&
                "Transferring USDT to user..."}
              {lastAction === "completing_sell" && "Completing sell order..."}
              {lastAction === "approving" && "Approving order..."}
              {lastAction === "creating_buy" &&
                "Creating buy order on blockchain..."}
            </span>
          </div>
          {hash && (
            <div className="text-xs mt-1">
              <a
                href={`https://bscscan.com/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-200 hover:text-white"
              >
                View on BSCScan ↗
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
