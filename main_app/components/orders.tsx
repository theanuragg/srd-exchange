"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserOrders } from "@/hooks/useUserOrders";
import { useIsSignedIn } from '@coinbase/cdp-hooks';
import BuyCDMModal from './modal/buy-cdm';
import BuyUPIModal from './modal/buy-upi';
import SellUPIModal from './modal/sell-upi';
import SellCDMModal from './modal/sell-cdm';

export default function Orders() {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showBuyCDMModal, setShowBuyCDMModal] = useState(false);
  const [showBuyUPIModal, setShowBuyUPIModal] = useState(false);
  const [showSellUPIModal, setShowSellUPIModal] = useState(false);
  const [showSellCDMModal, setShowSellCDMModal] = useState(false);
  
  const { isSignedIn } = useIsSignedIn();
  
  // Get real user orders
  const { orders, isLoading } = useUserOrders();

  // Filter orders based on active tab and status
  const getFilteredOrders = (status: 'ongoing' | 'completed') => {
    let filteredOrders = orders;

    // Filter by tab (all, buy, sell)
    if (activeTab === 'buy') {
      filteredOrders = filteredOrders.filter(order => 
        order.orderType.includes('BUY')
      );
    } else if (activeTab === 'sell') {
      filteredOrders = filteredOrders.filter(order => 
        order.orderType.includes('SELL')
      );
    }

    // Filter by status
    if (status === 'ongoing') {
      return filteredOrders.filter(order => 
        ['PENDING', 'PENDING_ADMIN_PAYMENT', 'ADMIN_APPROVED', 'PAYMENT_SUBMITTED'].includes(order.status)
      );
    } else {
      return filteredOrders.filter(order => 
        ['COMPLETED', 'CANCELLED'].includes(order.status)
      );
    }
  };

  const ongoingOrders = getFilteredOrders('ongoing');
  const completedOrders = getFilteredOrders('completed');

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'PENDING':
        return {
          label: 'Pending',
          color: 'text-yellow-500',
          dotColor: 'bg-yellow-500'
        };
      case 'PENDING_ADMIN_PAYMENT':
        return {
          label: 'Pending',
          color: 'text-yellow-500',
          dotColor: 'bg-yellow-500'
        };
      case 'ADMIN_APPROVED':
        return {
          label: 'Approved',
          color: 'text-green-500',
          dotColor: 'bg-green-500'
        };
      case 'PAYMENT_SUBMITTED':
        return {
          label: 'Payment Submitted',
          color: 'text-blue-500',
          dotColor: 'bg-blue-500'
        };
      case 'COMPLETED':
        return {
          label: 'Completed',
          color: 'text-gray-400',
          dotColor: 'bg-gray-400'
        };
      case 'CANCELLED':
        return {
          label: 'Rejected',
          color: 'text-red-500',
          dotColor: 'bg-red-500'
        };
      default:
        return {
          label: status,
          color: 'text-gray-400',
          dotColor: 'bg-gray-400'
        };
    }
  };

  // Handle order click to reopen modal
  const handleOrderClick = (order: any) => {
    console.log('Order clicked:', order);
    setSelectedOrder(order);
    
    // Open appropriate modal based on order type
    if (order.orderType === 'BUY_CDM') {
      setShowBuyCDMModal(true);
    } else if (order.orderType === 'BUY_UPI') {
      setShowBuyUPIModal(true);
    } else if (order.orderType === 'SELL' && order.currency === 'UPI') {
      setShowSellUPIModal(true);
    } else if (order.orderType === 'SELL_CDM' || (order.orderType === 'SELL' && order.currency === 'CDM')) {
      setShowSellCDMModal(true);
    } else if (order.orderType === 'SELL') {
      setShowSellUPIModal(true);
    }
  };

  // Close modal handlers
  const handleCloseModal = () => {
    setShowBuyCDMModal(false);
    setShowBuyUPIModal(false);
    setShowSellUPIModal(false);
    setShowSellCDMModal(false);
    setSelectedOrder(null);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3
      }
    }
  };

  if (!isSignedIn) {
    return (
      <div className="bg-black max-w-4xl mx-auto text-white min-h-screen flex flex-col">
        <div className="flex-1 p-4 sm:p-6 text-center">
          <h2 className="text-xl sm:text-2xl mb-6 text-white">Your Orders</h2>
          <div className="bg-[#1C1B1B] p-8 rounded-lg">
            <p className="text-gray-400">Connect your wallet to view orders</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-black max-w-4xl mx-auto text-white min-h-screen flex flex-col">
        {/* Orders Section */}
        <div className="flex-1 p-4 sm:p-6">
          {/* Your Orders Header */}
          <motion.div 
            className="mb-4 sm:mb-6 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-xl sm:text-2xl mb-4 sm:mb-6 text-white">Your Orders</h2>

            {/* Tabs */}
            <div className="flex space-x-2 sm:space-x-3 justify-center">
              {["All", "Buy", "Sell"].map((tab, index) => (
                <motion.button
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase())}
                  className={`px-8 sm:px-16 py-1 rounded-sm font-medium text-sm sm:text-base transition-all ${
                    activeTab === tab.toLowerCase()
                      ? "bg-[#622DBF] text-white shadow-lg shadow-purple-600/25"
                      : "bg-[#101010] text-white border border-[#3E3E3E] hover:bg-gray-700/50"
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  {tab}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
              <p className="text-gray-400 mt-2">Loading orders...</p>
            </div>
          ) : (
            <>
              {/* Ongoing Section */}
              <motion.div 
                className="mb-6 sm:mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <h3 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4 text-left sm:text-center">
                  Ongoing ({ongoingOrders.length})
                </h3>
                <motion.div 
                  className="space-y-2 sm:space-y-3 bg-[#1C1B1B] p-3 sm:p-4 rounded-lg"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <AnimatePresence>
                    {ongoingOrders.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-400">No ongoing orders</p>
                      </div>
                    ) : (
                      ongoingOrders.map((order, index) => {
                        const statusInfo = getStatusInfo(order.status);
                        return (
                          <motion.div
                            key={order.fullId}
                            onClick={() => handleOrderClick(order)}
                            className="grid grid-cols-3 sm:grid-cols-4 items-center justify-between p-3 sm:p-4 bg-[#101010] rounded-lg border border-[#3E3E3E] hover:border-purple-500 transition-colors cursor-pointer"
                            variants={itemVariants}
                            whileHover={{ 
                              scale: 1.02,
                              transition: { duration: 0.2 }
                            }}
                            whileTap={{ scale: 0.98 }}
                            layout
                          >
                            <div className="flex items-center">
                              {/* Mobile: Status dot on left, Desktop: No dot here */}
                              <motion.div 
                                className={`w-3 h-3 ${statusInfo.dotColor} rounded-full mr-2 sm:hidden`}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.3, delay: 0.2 }}
                              />
                              <span className="text-sm sm:text-base text-white font-medium truncate">
                                <span className="hidden sm:inline">{order.id} ({order.type})</span>
                                <span className="sm:hidden">{order.id}</span>
                              </span>
                            </div>
                            <div className="text-center sm:text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <span className="text-xs sm:text-base text-gray-300">
                                  <span className="hidden sm:inline">{order.time.split(' ')[0]}</span>
                                  <span className="sm:hidden">Today</span>
                                </span>
                                {/* Mobile: Show buy/sell SVG icon on the right of date */}
                                <motion.img 
                                  src={order.orderType.includes('BUY') ? "/buy.svg" : "/sell.svg"} 
                                  alt={order.orderType} 
                                  className="w-4 h-4 sm:hidden"
                                  whileHover={{ rotate: 5 }}
                                  transition={{ duration: 0.2 }}
                                />
                              </div>
                            </div>
                            <div className="text-center">
                              <span className="text-xs sm:text-base text-gray-300">
                                {order.time.includes('Today') ? order.time.split(' ').slice(1).join(' ') : order.time}
                              </span>
                            </div>
                            <div className="hidden sm:flex items-center justify-end space-x-1 sm:space-x-2">
                              {/* Desktop: Status dot on right */}
                              <motion.div 
                                className={`w-3 h-3 ${statusInfo.dotColor} rounded-full`}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.3, delay: 0.3 }}
                              />
                              <span className={`text-base font-medium ${statusInfo.color} truncate`}>
                                {statusInfo.label}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>

              {/* Completed Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <h3 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4 text-left sm:text-center">
                  Completed ({completedOrders.length})
                </h3>
                <motion.div 
                  className="space-y-2 sm:space-y-3 bg-[#1C1B1B] p-3 sm:p-4 rounded-lg"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <AnimatePresence>
                    {completedOrders.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-400">No completed orders</p>
                      </div>
                    ) : (
                      completedOrders.map((order, index) => {
                        const statusInfo = getStatusInfo(order.status);
                        return (
                          <motion.div
                            key={order.fullId}
                            className="grid grid-cols-3 sm:grid-cols-4 items-center justify-between p-3 sm:p-4 bg-[#101010] rounded-lg border border-[#3E3E3E] hover:border-gray-600 transition-colors cursor-pointer"
                            variants={itemVariants}
                            whileHover={{ 
                              scale: 1.02,
                              transition: { duration: 0.2 }
                            }}
                            whileTap={{ scale: 0.98 }}
                            layout
                          >
                            <div className="flex items-center">
                              {/* Mobile: Status dot on left, Desktop: No dot here */}
                              <motion.div 
                                className={`w-3 h-3 ${statusInfo.dotColor} rounded-full mr-2 sm:hidden`}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.3, delay: 0.2 }}
                              />
                              <span className="text-sm sm:text-base text-white font-medium truncate">
                                <span className="hidden sm:inline">{order.id}</span>
                                <span className="sm:hidden">{order.id}</span>
                              </span>
                            </div>
                            <div className="text-center sm:text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <span className="text-xs sm:text-base text-gray-300">
                                  <span className="hidden sm:inline">{order.time.split(' ')[0]}</span>
                                  <span className="sm:hidden">Today</span>
                                </span>
                                {/* Mobile: Show buy/sell SVG icon on the right of date */}
                                <motion.img 
                                  src={order.orderType.includes('BUY') ? "/buy.svg" : "/sell.svg"} 
                                  alt={order.orderType} 
                                  className="w-4 h-4 sm:hidden"
                                  whileHover={{ rotate: 5 }}
                                  transition={{ duration: 0.2 }}
                                />
                              </div>
                            </div>
                            <div className="text-center">
                              <span className="text-xs sm:text-base text-gray-300">
                                {order.time.includes('Today') ? order.time.split(' ').slice(1).join(' ') : order.time}
                              </span>
                            </div>
                            <div className="hidden sm:flex items-center justify-end space-x-1 sm:space-x-2">
                              {/* Desktop: Status dot on right */}
                              <motion.div 
                                className={`w-3 h-3 ${statusInfo.dotColor} rounded-full`}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.3, delay: 0.3 }}
                              />
                              <span className={`text-base font-medium ${statusInfo.color} truncate`}>
                                {statusInfo.label}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            </>
          )}
        </div>
      </div>

      {/* Modals - Pass selected order data */}
      {selectedOrder && (
        <>
          <BuyCDMModal 
            isOpen={showBuyCDMModal}
            onClose={handleCloseModal}
            amount={selectedOrder.amount?.toString() || '0'}
            usdtAmount={selectedOrder.usdtAmount?.toString() || '0'}
            orderData={selectedOrder}
          />

          <BuyUPIModal 
            isOpen={showBuyUPIModal}
            onClose={handleCloseModal}
            amount={selectedOrder.amount?.toString() || '0'}
            usdtAmount={selectedOrder.usdtAmount?.toString() || '0'}
            orderData={selectedOrder}
          />

          <SellUPIModal 
            isOpen={showSellUPIModal}
            onClose={handleCloseModal}
            usdtAmount={selectedOrder.usdtAmount?.toString() || '0'}
            amount={selectedOrder.amount?.toString() || '0'}
            orderData={selectedOrder}
          />

          <SellCDMModal 
            isOpen={showSellCDMModal}
            onClose={handleCloseModal}
            usdtAmount={selectedOrder.usdtAmount?.toString() || '0'}
            amount={selectedOrder.amount?.toString() || '0'}
            orderData={selectedOrder}
          />
        </>
      )}
    </>
  );
}
