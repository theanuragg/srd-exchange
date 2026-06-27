"use client";

import { useState, useEffect } from "react";
import {
  X,
  Copy,
  TriangleAlert,
  CreditCard,
  Clock,
  Check,
  CheckCheck,
  CircleQuestionMark,
  CheckCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useModalState } from "@/hooks/useModalState";
import { useOrderPaymentDetails } from "@/hooks/useOrderPaymentDetails";
import { useWalletManager } from '@/hooks/useWalletManager'
import { useUSDTCalculation } from '@/lib/utils/calculateUSDT'

const BUY_UPI_ONLY_ID = "6388911983@pthdfc";

interface BuyUPIModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: string;
  usdtAmount: string;
  orderData?: any;
}


export default function BuyUPIModal({
  isOpen,
  onClose,
  amount,
  usdtAmount,
  orderData,
}: BuyUPIModalProps) {
  const [isPaid, setIsPaid] = useState(false);
  const [isWaitingConfirmation, setIsWaitingConfirmation] = useState(false);
  const [isCoinReceived, setIsCoinReceived] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const { saveModalState, getModalState, clearModalState } = useModalState();

  // Fetch payment details from database at intervals
  const { 
    paymentDetails, 
    isLoading: isLoadingPaymentDetails  } = useOrderPaymentDetails(
    orderData?.fullId || orderData?.id, 
    isOpen && !!orderData
  );

  // Check if admin has provided payment details
  const hasReceivedAdminDetails = true;
  const displayUpiId = paymentDetails?.adminUpiId || BUY_UPI_ONLY_ID;
  const displayAmount = paymentDetails?.customAmount?.toString() || amount;

  const { confirmOrderReceivedOnChain } = useWalletManager()
  const { calculateUSDTFromINR } = useUSDTCalculation()

  // Load saved state when modal opens
  useEffect(() => {
    if (isOpen && orderData) {
      console.log('📂 Loading modal state for order:', orderData.fullId || orderData.id);
      const savedState = getModalState(orderData.fullId || orderData.id);
      if (savedState) {
        console.log('📋 Restoring modal state:', savedState);
        setCurrentStep(savedState.currentStep);
        
        // Set component states based on step
        switch (savedState.currentStep) {
          case 0:
            setIsPaid(false);
            setIsWaitingConfirmation(false);
            setIsCoinReceived(false);
            break;
          case 1:
            setIsPaid(false);
            setIsWaitingConfirmation(false);
            setIsCoinReceived(false);
            break;
          case 2:
            setIsPaid(false);
            setIsWaitingConfirmation(true);
            setIsCoinReceived(false);
            break;
          case 3:
            setIsPaid(true);
            setIsWaitingConfirmation(false);
            setIsCoinReceived(false);
            break;
          case 4:
            setIsPaid(true);
            setIsWaitingConfirmation(false);
            setIsCoinReceived(true);
            break;
        }
      } else {
        // No saved state, start fresh
        setCurrentStep(0);
        setIsPaid(false);
        setIsWaitingConfirmation(false);
        setIsCoinReceived(false);
      }
    }
  }, [isOpen, orderData]);

  // Auto-advance to step 1 when admin details are received
  useEffect(() => {
    if (hasReceivedAdminDetails && currentStep === 0) {
      console.log('✅ Admin UPI details received from database:', paymentDetails?.adminUpiId);
      setCurrentStep(1);
    }
  }, [hasReceivedAdminDetails, currentStep, paymentDetails]);

  // Save state whenever it changes
  useEffect(() => {
    if (orderData && isOpen && currentStep >= 0) {
      saveModalState(
        orderData.fullId || orderData.id,
        'BUY_UPI',
        currentStep,
        {},
        paymentDetails
      );
    }
  }, [currentStep, paymentDetails, orderData, isOpen, saveModalState]);

  // Reset modal state when opened for new orders
  useEffect(() => {
    if (isOpen && !orderData) {
      setIsPaid(false);
      setIsWaitingConfirmation(false);
      setIsCoinReceived(false);
      setCopiedField(null);
      setCurrentStep(0);
    }
  }, [isOpen, orderData]);

  // Debug logging
  useEffect(() => {
    if (isOpen && orderData) {
      console.log('🖥️ Buy UPI Modal State Debug:', {
        orderData: orderData?.fullId || orderData?.id,
        currentStep,
        hasReceivedAdminDetails,
        paymentDetails,
        displayUpiId,
        isLoadingPaymentDetails
      });
    }
  }, [isOpen, currentStep, hasReceivedAdminDetails, paymentDetails, orderData, displayUpiId, isLoadingPaymentDetails]);

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handlePaymentConfirm = () => {
    setIsWaitingConfirmation(true);
    setCurrentStep(2);
  };

  const handleWaitingConfirmation = () => {
    setIsPaid(true);
    setIsWaitingConfirmation(false);
    setCurrentStep(3);
  };

  const handleCoinReceived = async () => {
    try {
      console.log('🔗 Confirming order received on blockchain...')
      if (orderData?.blockchainOrderId) {
        await confirmOrderReceivedOnChain(parseInt(orderData.blockchainOrderId))
      }
      setIsCoinReceived(true)
      setCurrentStep(4)
    } catch (error) {
      console.error('❌ Error confirming order on blockchain:', error)
      // Still update UI even if blockchain call fails
      setIsCoinReceived(true)
      setCurrentStep(4)
    }
  }

  const handleOrderComplete = () => {
    if (orderData) {
      clearModalState(orderData.fullId || orderData.id);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/70 flex items-end md:items-center justify-center z-50 p-4 md:p-4 pb-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-[#111010] rounded-t-xl md:rounded-xl max-w-4xl w-full relative overflow-hidden max-h-[90vh] md:max-h-[90vh]"
            initial={{
              scale: typeof window !== "undefined" && window.innerWidth < 768 ? 1 : 0.9,
              opacity: typeof window !== "undefined" && window.innerWidth < 768 ? 1 : 0,
              y: typeof window !== "undefined" && window.innerWidth < 768 ? "100%" : 0,
            }}
            animate={{
              scale: 1,
              opacity: 1,
              y: 0,
            }}
            exit={{
              scale: typeof window !== "undefined" && window.innerWidth < 768 ? 1 : 0.9,
              opacity: typeof window !== "undefined" && window.innerWidth < 768 ? 1 : 0,
              y: typeof window !== "undefined" && window.innerWidth < 768 ? "100%" : 0,
            }}
            transition={{ type: "spring", duration: 0.3 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-[#2F2F2F]">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  isCoinReceived
                    ? "bg-gray-400"
                    : isPaid
                    ? "bg-green-400"
                    : hasReceivedAdminDetails
                    ? "bg-blue-400"
                    : "bg-yellow-400"
                }`}></div>
                <span className="text-white font-medium">
                  Order {orderData?.id || orderData?.fullId?.slice(-6) || '#14'}
                </span>
              </div>

              <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 space-x-1 justify-center items-center text-white text-sm">
                <CircleQuestionMark className="w-5 h-5" />
                <span>How to buy?</span>
              </div>

              <button
                onClick={onClose}
                className="text-white hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Main Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)] md:max-h-[calc(90vh-80px)]">
              <div className="p-4 text-center">
                {/* Loading State */}
                {isLoadingPaymentDetails && currentStep === 0 && (
                  <motion.div
                    className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-blue-400 font-medium">Checking for Admin Updates...</span>
                    </div>
                  </motion.div>
                )}

                {/* Order Status Messages */}
                <motion.div
                  className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-medium">BUY UPI ONLY</span>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Pay to the UPI ID below to complete purchase
                  </p>
                </motion.div>

                {isPaid && (
                  <motion.div
                    className="text-[#26AF6C] text-sm font-medium mb-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    Payment confirmed by admin
                  </motion.div>
                )}

                <div className="mb-6">
                  {/* Primary Amount - Show custom amount when admin provides it */}
                  <div className="text-4xl md:text-4xl font-bold text-white mb-2">
                    {hasReceivedAdminDetails && paymentDetails?.customAmount 
                      ? `₹${paymentDetails.customAmount}` 
                      : `₹${displayAmount}`
                    }
                  </div>
                  
                  {/* Secondary Amount - USDT equivalent when admin accepts */}
                  {hasReceivedAdminDetails && (
                    <div className="text-2xl md:text-2xl font-medium text-gray-300 mb-2">
                      ≈ {paymentDetails?.customAmount 
                          ? calculateUSDTFromINR(paymentDetails.customAmount, 'UPI')
                          : usdtAmount
                        } USDT
                    </div>
                  )}
                  
                  {/* Custom amount label - Only show if amount is different from original */}
                  {hasReceivedAdminDetails && paymentDetails?.customAmount && 
                   paymentDetails.originalAmount && 
                   Math.abs(paymentDetails.customAmount - paymentDetails.originalAmount) > 0.01 && (
                    <div className="text-sm text-green-400 mb-2">
                      ✨ Custom amount set by admin (Original: ₹{paymentDetails.originalAmount})
                    </div>
                  )}
                  
                  {/* Conversion Info */}
                  {hasReceivedAdminDetails && (
                    <div className="text-xs text-gray-400 mb-2">
                      You will receive {paymentDetails?.customAmount 
                        ? calculateUSDTFromINR(paymentDetails.customAmount, 'UPI')
                        : usdtAmount
                      } USDT for ₹{paymentDetails?.customAmount || displayAmount}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                      />
                    </svg>
                  </div>
                  <div className="text-xs text-white mt-2 mb-4">
                    UPI Payment Transfer
                  </div>
                </div>

                {/* Payment Method Badge */}
                <div className="flex items-center justify-center space-x-4 md:space-x-10 mb-6 flex-wrap gap-2">
                  <div className="bg-[#1D1C1C] text-black px-2 py-1 rounded text-sm font-medium flex items-center space-x-2">
                    <img src="/phonepay-gpay.svg" alt="" className="w-5 h-5" />
                    <span className="text-white">UPI</span>
                  </div>
                  <span className="text-white px-2 py-1 bg-[#1D1C1C] rounded-md text-sm">
                    Buy Order
                  </span>
                  <span className="text-white px-2 py-1 bg-[#1D1C1C] rounded-md text-sm">
                    {orderData ? new Date(orderData.createdAt || Date.now()).toLocaleTimeString() : 'Today 11:40 PM'}
                  </span>
                </div>

                {/* Payment Instructions */}
                {hasReceivedAdminDetails && !isWaitingConfirmation && !isPaid && (
                  <div className="mb-8">
                    <div className="text-white mb-1">
                      BUY UPI ONLY : {displayUpiId}
                    </div>
                    <div className="text-white text-xs mb-1">
                      Please pay ₹{paymentDetails?.customAmount || displayAmount} to above UPI ID
                    </div>
                    <div className="text-[#26AF6C] text-xs flex items-center justify-center mb-4">
                      
                      ⚠️ Pay Only Through Registered UPI
                    </div>
                    {/* Show rate information */}
                    {paymentDetails?.customAmount && (
                      <div className="text-xs text-gray-400 text-center">
                        You get {calculateUSDTFromINR(paymentDetails.customAmount, 'UPI')} USDT
                      </div>
                    )}
                  </div>
                )}



                {/* UPI ID Section */}
                <div className="flex items-center justify-center mb-6">
                  <div className="flex items-center justify-between rounded-lg px-4 py-3 min-w-[280px] md:min-w-[325px] max-w-md w-full mx-4 bg-[#2a2a2a]">
                    <span className="font-medium text-lg md:text-lg text-white">
                      {displayUpiId}
                    </span>
                    <button
                      onClick={() => handleCopy(displayUpiId, 'upi')}
                      className="text-gray-400 hover:text-white transition-colors ml-4"
                    >
                      {copiedField === 'upi' ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="flex flex-col items-center mb-8">
                  <div className="w-60 md:w-80 bg-gray-700 rounded-full h-2 mb-2">
                    <div className={`h-2 rounded-full transition-all duration-500 ${
                      isCoinReceived ? 'w-full bg-green-500' :
                      isPaid ? 'w-4/5 bg-green-500' :
                      hasReceivedAdminDetails ? 'w-3/5 bg-blue-500' : 'w-1/4 bg-yellow-500'
                    }`}></div>
                  </div>
                  <div className="text-white text-sm font-medium">
                    {isCoinReceived ? 'Order Complete' :
                     isPaid ? 'Payment Confirmed' :
                     hasReceivedAdminDetails ? 'Ready for Payment' : 'Waiting for Admin'}
                  </div>
                </div>

                {/* Action Button */}
                <div className="px-4 md:px-0">
                  <button
                    onClick={
                      isCoinReceived
                        ? handleOrderComplete
                        : isPaid
                        ? handleCoinReceived
                        : isWaitingConfirmation
                        ? handleWaitingConfirmation
                        : hasReceivedAdminDetails
                        ? handlePaymentConfirm
                        : undefined
                    }
                    disabled={!hasReceivedAdminDetails && !isPaid && !isCoinReceived}
                    className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
                      hasReceivedAdminDetails || isPaid || isCoinReceived
                        ? 'bg-[#622DBF] hover:bg-purple-700 cursor-pointer'
                        : 'bg-gray-600 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      {isCoinReceived ? (
                        <>
                          <CheckCheck className="w-5 h-5" />
                          <span>Order Complete</span>
                        </>
                      ) : isPaid ? (
                        <>
                          <Check className="w-5 h-5" />
                          <span>Coin Received in Wallet</span>
                        </>
                      ) : isWaitingConfirmation ? (
                        <>
                          <Clock className="w-5 h-5 animate-spin" />
                          <span>Waiting for confirmation</span>
                        </>
                      ) : hasReceivedAdminDetails ? (
                        <>
                          <CreditCard className="w-5 h-5" />
                          <span>I Paid ₹{paymentDetails?.customAmount || displayAmount} To Admin</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-5 h-5 animate-pulse" />
                          <span>Waiting for Admin Approval</span>
                        </>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
