"use client";

import { Search, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useAdminSession } from '@/hooks/useAdminSession';
import { useAdminAPI } from '@/hooks/useAdminAPI';
import { useUserActivity } from '@/hooks/useUserActivity';
import { useRates } from '@/hooks/useRates';
import CancelOrderModal from "./modal/cancelOrder";

interface Order {
  usdtAmount: any;
  id: string;
  fullId: string;
  time: string;
  amount: number;
  type: string;
  orderType: string;
  price: number;
  currency: string;
  status: string;
  adminUpiId?: string | null;
  scannedUpiId?: string | null;
  isQrTransaction?: boolean;
  user: {
    id: string;
    walletAddress: string;
    smartWalletAddress?: string | null;
    upiId: string | null;
    bankDetails: any;
  };
}

export default function AdminLeftSide() {
  const [activeFilter, setActiveFilter] = useState("Pending");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [qrOrders, setQrOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  const { address } = useAdminSession();
  const { makeAdminRequest } = useAdminAPI();
  const isUserActive = useUserActivity(5000);
  const { getBuyRate, getSellRate } = useRates();

  useEffect(() => {
    fetchOrders();
  }, [activeFilter, address]);

  useEffect(() => {
    if (!autoRefreshEnabled || !address) return;

    const interval = setInterval(() => {
      if (!isUserActive && !showCancelModal) {
        console.log('🔄 Auto-refreshing orders (user inactive)');
        fetchOrders();
        setLastRefresh(Date.now());
      } else {
        console.log('⏸️ Skipping auto-refresh (user active or modal open)');
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, address, isUserActive, showCancelModal]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (!isUserActive && autoRefreshEnabled && address) {
      timeout = setTimeout(() => {
        if (!isUserActive && !showCancelModal) {
          console.log('🔄 Manual refresh after user became inactive');
          fetchOrders();
          setLastRefresh(Date.now());
        }
      }, 2000);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isUserActive, autoRefreshEnabled, address, showCancelModal]);

  const fetchOrders = async () => {
    if (!address) {
      console.log('No wallet address available');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let statusParam = activeFilter.toLowerCase();

      // Include sell orders that need admin payment in pending filter
      if (statusParam === 'pending') {
        statusParam = 'pending,pending_admin_payment';
      }

      // Map "rejected" filter to "CANCELLED" status
      if (statusParam === 'rejected') {
        statusParam = 'cancelled';
      }

      console.log('Fetching orders with status:', statusParam);

      const data = await makeAdminRequest(`/api/admin/orders?status=${statusParam}`);

      if (data.success) {
        console.log('Orders found:', data.orders.length);
        setOrders(data.orders);
      } else {
        console.error('API returned error:', data.error);
        setError(data.error);
      }

      let qrStatusParam = statusParam;
      if (qrStatusParam === 'pending,pending_admin_payment') {
        qrStatusParam = 'pending';
      }
      const qrData = await makeAdminRequest(`/api/admin/qr-transactions?status=${qrStatusParam}`);
      if (qrData.success) {
        setQrOrders(qrData.transactions || []);
      } else {
        setQrOrders([]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    fetchOrders();
    setLastRefresh(Date.now());
  };

  const toggleAutoRefresh = () => {
    setAutoRefreshEnabled(!autoRefreshEnabled);
  };

  const handleAccept = async (order: Order) => {
    try {
      console.log('Accepting order:', order.fullId);

      // Sell orders move to PENDING_ADMIN_PAYMENT after acceptance
      // Buy orders move to ADMIN_APPROVED
      const nextStatus = order.orderType.includes('SELL') ? 'PENDING_ADMIN_PAYMENT' : 'ADMIN_APPROVED';

      const data = await makeAdminRequest(`/api/admin/orders/${order.fullId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: nextStatus
        })
      });

      if (data.success) {
        console.log('Order accepted successfully');
        fetchOrders();

        window.dispatchEvent(new CustomEvent('orderAccepted', {
          detail: { orderId: order.fullId, order }
        }));
      } else {
        console.error('Failed to accept order:', data.error);
      }
    } catch (error) {
      console.error('Error accepting order:', error);
    }
  };

  const handleReject = (order: Order) => {
    setSelectedOrder(order);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async (reason: string) => {
    if (selectedOrder) {
      try {
        console.log('Rejecting order:', selectedOrder.fullId);
        const endpoint = selectedOrder.isQrTransaction || selectedOrder.orderType === 'QR_SCAN'
          ? `/api/admin/qr-transactions/${selectedOrder.fullId}`
          : `/api/admin/orders/${selectedOrder.fullId}`;

        const data = await makeAdminRequest(endpoint, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'CANCELLED',
            adminNotes: reason
          })
        });

        if (data.success) {
          console.log('Order rejected successfully');
          fetchOrders();
        } else {
          console.error('Failed to reject order:', data.error);
        }
      } catch (error) {
        console.error('Error rejecting order:', error);
      }
    }
    setShowCancelModal(false);
    setSelectedOrder(null);
  };

  const handleCloseCancelModal = () => {
    setShowCancelModal(false);
    setSelectedOrder(null);
  };

  const handleAcceptQr = async (order: Order) => {
    try {
      const data = await makeAdminRequest(`/api/admin/qr-transactions/${order.fullId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'APPROVED' }),
      });

      if (data.success) {
        fetchOrders();
        window.dispatchEvent(new CustomEvent('orderAccepted', {
          detail: { orderId: order.fullId, order: data.transaction },
        }));
      }
    } catch (error) {
      console.error('Error accepting QR transaction:', error);
    }
  };

  const handleRejectQr = (order: Order) => {
    setSelectedOrder(order);
    setShowCancelModal(true);
  };

  const handleConfirmQrPayment = async (order: Order) => {
    try {
      const data = await makeAdminRequest(`/api/admin/qr-transactions/${order.fullId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'COMPLETED' }),
      });

      if (data.success) {
        fetchOrders();
      }
    } catch (error) {
      console.error('Error completing QR transaction:', error);
    }
  };

  const handleConfirmPayment = async (order: Order) => {
    try {
      console.log('Confirming payment sent for sell order:', order.fullId);
      const data = await makeAdminRequest(`/api/admin/orders/${order.fullId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'COMPLETED'
        })
      });

      if (data.success) {
        console.log('Payment confirmed successfully');
        fetchOrders();
      } else {
        console.error('Failed to confirm payment:', data.error);
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
    }
  };

  const filteredOrders = orders.filter(order =>
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.user.walletAddress.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredQrOrders = qrOrders.filter(order =>
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.user.walletAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.scannedUpiId || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
      case 'PENDING_ADMIN_PAYMENT':
      case 'APPROVED':
        return 'bg-yellow-500';
      case 'ADMIN_APPROVED':
        return 'bg-blue-500';
      case 'PAYMENT_SUBMITTED':
        return 'bg-purple-500';
      case 'COMPLETED':
        return 'bg-green-500';
      case 'CANCELLED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-[#141414] text-white h-full py-4 px-2 overflow-y-auto">
      <div className="flex bg-[#1E1E1E] rounded-sm items-center justify-between mb-4 px-3 py-2">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-[#622DBF] rounded-full"></div>
          <h2 className="text-lg font-semibold text-white">All Orders</h2>
        </div>

        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isUserActive ? 'bg-green-400' : 'bg-gray-400'}`}></div>

          <button
            onClick={toggleAutoRefresh}
            className={`text-xs px-2 py-1 rounded transition-all ${autoRefreshEnabled
              ? 'bg-green-600/20 text-green-400 border border-green-600/30'
              : 'bg-gray-600/20 text-gray-400 border border-gray-600/30'
              }`}
            title={autoRefreshEnabled ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
          >
            Auto
          </button>

          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            title="Manual refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="text-center mb-4">
        <p className="text-xs text-gray-500">
          Last updated: {new Date(lastRefresh).toLocaleTimeString()}
          {autoRefreshEnabled && !isUserActive && (
            <span className="text-green-400 ml-2">• Auto-refresh active</span>
          )}
          {autoRefreshEnabled && isUserActive && (
            <span className="text-yellow-400 ml-2">• Auto-refresh paused</span>
          )}
          {!autoRefreshEnabled && (
            <span className="text-gray-400 ml-2">• Auto-refresh disabled</span>
          )}
        </p>
      </div>

      <div className="relative mb-6 flex justify-center">
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
          <Search className="w-4 h-4 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search by Order ID or Wallet..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-[95%] bg-[#111010] rounded-md py-2 pl-10 pr-4 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-[#622DBF] focus:ring-1 focus:ring-purple-500/20"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-6 w-[90%] mx-auto">
        <button
          onClick={() => setActiveFilter("Pending")}
          className={`flex items-center justify-center space-x-2 py-1 px-2 rounded-xs text-xs font-medium transition-all flex-1 min-w-0 ${activeFilter === "Pending"
            ? "bg-[#622DBF] text-white"
            : "bg-[#1E1E1E] text-gray-300 hover:bg-gray-700/50"
            }`}
        >
          <div className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0"></div>
          <span className="truncate">Pending</span>
        </button>
        <button
          onClick={() => setActiveFilter("Completed")}
          className={`flex items-center justify-center space-x-2 py-1 px-2 rounded-xs text-xs font-medium transition-all flex-1 min-w-0 ${activeFilter === "Completed"
            ? "bg-[#622DBF] text-white"
            : "bg-[#1E1E1E] text-gray-300 hover:bg-gray-700/50"
            }`}
        >
          <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
          <span className="truncate">Completed</span>
        </button>
        <button
          onClick={() => setActiveFilter("Rejected")}
          className={`flex items-center justify-center space-x-2 py-1 px-2 rounded-xs text-xs font-medium transition-all flex-1 min-w-0 ${activeFilter === "Rejected"
            ? "bg-[#622DBF] text-white"
            : "bg-[#1E1E1E] text-gray-300 hover:bg-gray-700/50"
            }`}
        >
          <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
          <span className="truncate">Rejected</span>
        </button>
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

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
            <p className="text-gray-400 mt-2">Loading orders...</p>
          </div>
        ) : !address ? (
          <div className="text-center py-8">
            <p className="text-gray-400">Connect admin wallet to view orders</p>
          </div>
        ) : filteredOrders.length === 0 && filteredQrOrders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No orders found</p>
            <p className="text-xs text-gray-500 mt-2">Filter: {activeFilter}</p>
            {!error && (
              <button
                onClick={fetchOrders}
                className="mt-3 px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition-colors"
              >
                Refresh Orders
              </button>
            )}
          </div>
        ) : (
          <>
          {filteredQrOrders.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-blue-300">
                  QR Scan Orders
                </h3>
              </div>
              <div className="space-y-4">
                {filteredQrOrders.map((order) => {
                  const sellRate = getSellRate('UPI');
                  const displayAmount = `${parseFloat(String(order.usdtAmount || 0)).toFixed(2)} USDT`;
                  const displayConversion = `₹${order.amount}`;

                  return (
                    <div key={`qr-${order.fullId}`} className="bg-[#1D1C1C] rounded-md py-2 px-2 border border-blue-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-white text-md">{order.id}</span>
                          <div className="text-white text-xs">{order.time}</div>
                          <div className="text-xs text-blue-300 mt-1 font-medium">QR Scan &amp; Pay</div>
                        </div>
                        <span className="bg-blue-600/40 text-blue-200 text-[0.6rem] font-bold px-2 py-0.5 rounded border border-blue-500/30">
                          QR SCAN
                        </span>
                      </div>

                      <div className="bg-black/30 border border-blue-500/20 rounded p-2 mb-2">
                        <p className="text-[0.65rem] text-blue-300 uppercase font-bold mb-1">Merchant UPI (from scan)</p>
                        <p className="text-sm text-white font-mono break-all">
                          {order.scannedUpiId || 'Waiting for user scan...'}
                        </p>
                      </div>

                      <div className="flex items-center justify-center mb-2">
                        <div className="flex items-center space-x-2 border border-[#464646] py-0.5 px-0.5 rounded">
                          <span className="text-white font-bold bg-[#222] py-0.5 px-1.5 rounded-sm">{displayAmount}</span>
                          <span className="text-gray-400 text-sm">{order.type}</span>
                          <span className="text-white font-bold bg-[#222] py-0.5 px-1.5 rounded-sm">{displayConversion}</span>
                        </div>
                      </div>

                      <div className="text-center mb-3">
                        <span className="text-xs text-gray-500">Rate: ₹{sellRate} per USDT</span>
                      </div>

                      {activeFilter === 'Pending' && order.status === 'PENDING' && (
                        <div className="flex space-x-3 justify-end">
                          <button
                            onClick={() => handleAcceptQr(order)}
                            disabled={!order.scannedUpiId}
                            className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white px-6 py-1 rounded-xs text-sm font-medium transition-all"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectQr(order)}
                            className="bg-yellow-600 hover:bg-red-700 text-white px-6 py-1 rounded-xs text-sm font-medium transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {activeFilter === 'Pending' && order.status === 'APPROVED' && (
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleConfirmQrPayment(order)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-1 rounded-xs text-sm font-medium transition-all"
                          >
                            Confirm Payment Sent
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredOrders.map((order, index) => {
            const buyRate = getBuyRate(order.currency as 'UPI' | 'CDM');
            const sellRate = getSellRate(order.currency as 'UPI' | 'CDM');

            let displayAmount = '';
            let displayConversion = '';

            if (order.orderType.includes('BUY')) {

              const usdtAmount = (order.amount / buyRate).toFixed(2);
              displayAmount = `₹${order.amount}`;
              displayConversion = `${usdtAmount} USDT`;
            } else {

              if (order.usdtAmount) {

                displayAmount = `${parseFloat(order.usdtAmount).toFixed(2)} USDT`;
                displayConversion = `₹${order.amount}`;
              } else {

                const usdtAmount = (order.amount / sellRate).toFixed(2);
                displayAmount = `${usdtAmount} USDT`;
                displayConversion = `₹${order.amount}`;
              }
            }

            return (
              <div key={order.fullId} className="bg-[#1D1C1C] rounded-md py-2 px-2">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-white text-md">{order.id}</span>
                    <div className="text-white text-xs">{order.time}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {order.user.smartWalletAddress ? (
                        <span>{order.user.smartWalletAddress.slice(0, 6)}...{order.user.smartWalletAddress.slice(-4)}</span>
                      ) : (
                        <span>{order.user.walletAddress.slice(0, 6)}...{order.user.walletAddress.slice(-4)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <div className="flex items-center space-x-2">
                      {(order.orderType === 'QR_SCAN' || order.scannedUpiId) && (
                        <span className="bg-blue-600/40 text-blue-300 text-[0.6rem] font-bold px-1.5 py-0.5 rounded border border-blue-500/30 animate-pulse">
                          QR
                        </span>
                      )}
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
                        <span className="text-white text-sm">{order.currency}</span>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(order.status)}`}></div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center mb-2">
                  <div className="flex items-center space-x-2 border border-[#464646] py-0.5 px-0.5 rounded">
                    <span className="text-white font-bold bg-[#222] py-0.5 px-1.5 rounded-sm">
                      {displayAmount}
                    </span>
                    <div className="flex items-center space-x-1">
                      {order.type.includes("Buy") ? (
                        <Image
                          src="/buy.svg"
                          alt="Buy"
                          width={14}
                          height={14}
                          className="flex-shrink-0"
                        />
                      ) : (
                        <Image
                          src="/sell.svg"
                          alt="Sell"
                          width={14}
                          height={14}
                          className="flex-shrink-0"
                        />
                      )}
                      <span className="text-gray-400 text-sm">{order.type}</span>
                    </div>
                    <span className="text-white font-bold bg-[#222] py-0.5 px-1.5 rounded-sm">
                      {displayConversion}
                    </span>
                  </div>
                </div>

                <div className="text-center mb-3">
                  <span className="text-xs text-gray-500">
                    Rate: ₹{order.orderType.includes('BUY') ? buyRate : sellRate} per USDT
                  </span>
                </div>

                {activeFilter === "Pending" && (
                  (order.status === "PENDING" || order.status === "PENDING_ADMIN_PAYMENT") && (
                    <div className="flex space-x-3 justify-end">
                      {order.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => handleAccept(order)}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-1 rounded-xs text-sm font-medium transition-all"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleReject(order)}
                            className="bg-yellow-600 hover:bg-red-700 text-white px-6 py-1 rounded-xs text-sm font-medium transition-all"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {order.status === "PENDING_ADMIN_PAYMENT" && order.orderType.includes('SELL') && (
                        <button
                          onClick={() => handleConfirmPayment(order)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-1 rounded-xs text-sm font-medium transition-all"
                        >
                          Confirm Payment Sent
                        </button>
                      )}
                    </div>
                  )
                )}
              </div>
            );
          })}
          </>
        )}
      </div>

      <CancelOrderModal
        isOpen={showCancelModal}
        onClose={handleCloseCancelModal}
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
}
