'use client'

import { useState, useEffect } from 'react'
import { User, FileText, Copy, CheckCircle, AlertTriangle, RefreshCw, Send, Edit3, Info } from 'lucide-react'
import { useRates } from '@/hooks/useRates'
import { useAdminRates } from '@/hooks/useAdminRates'
import { useAdminAPI } from '@/hooks/useAdminAPI'
import { motion, AnimatePresence } from 'framer-motion'

interface SelectedOrder {
  id: string;
  fullId: string;
  time: string;
  amount: number;
  type: string;
  orderType: string;
  price: number;
  currency: string;
  status: string;
  paymentProof?: string;
  adminUpiId?: string;
  scannedUpiId?: string;
  adminBankDetails?: string;
  user: {
    id: string;
    walletAddress: string;
    smartWalletAddress?: string | null;
    upiId: string | null;
    bankDetails: any;
  };
}

export default function AdminRight() {
  const QR_SCAN_PAY_FLAG_KEY = 'qr_scan_pay_enabled'
  const [activeTab, setActiveTab] = useState('UPI')
  const [userDetailsTab, setUserDetailsTab] = useState('UPI')
  const [newBuyRate, setNewBuyRate] = useState('')
  const [newSellRate, setNewSellRate] = useState('')
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<SelectedOrder | null>(null)
  const [adminUpiId, setAdminUpiId] = useState('')
  const [adminBankDetails, setAdminBankDetails] = useState({
    accountNumber: '',
    ifscCode: '',
    branchName: '',
    accountHolderName: ''
  })
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [sendingPaymentDetails, setSendingPaymentDetails] = useState(false)
  const [paymentDetailsSent, setPaymentDetailsSent] = useState(false)
  const [qrScanPayEnabled, setQrScanPayEnabled] = useState(false)
  const [qrFeatureLoading, setQrFeatureLoading] = useState(true)
  const [qrFeatureSaving, setQrFeatureSaving] = useState(false)

  // Custom order values
  const [customOrderValue, setCustomOrderValue] = useState('')
  const [isEditingOrderValue, setIsEditingOrderValue] = useState(false)

  // Custom amount
  const [customAmount, setCustomAmount] = useState('')

  // 🔥 ADD: State for user money received notifications
  const [userMoneyNotification, setUserMoneyNotification] = useState<{
    orderId: string;
    message: string;
    amount: string;
    timestamp: Date;
  } | null>(null)

  const [uploadedReceipts, setUploadedReceipts] = useState<{
    [orderId: string]: {
      fileName: string;
      fileUrl: string;
      uploadedAt: Date;
    }
  }>({})

  const { rates, loading, refetch } = useRates()
  const { updateRates, loading: updating, error: updateError } = useAdminRates()
  const { makeAdminRequest } = useAdminAPI()

  // Get current rates for selected currency
  const currentRate = rates.find(rate => rate.currency === activeTab)
  const currentBuyRate = currentRate?.buyRate.toString() || '85.6'
  const currentSellRate = currentRate?.sellRate.toString() || '85.6'

  const [isOrderSelected, setIsOrderSelected] = useState(false)

  // Listen for order selection events from admin center
  useEffect(() => {
    const handleOrderSelected = (event: CustomEvent) => {
      console.log('Order selected event received in admin right:', event.detail);
      const selectedOrderData = event.detail.order;

      console.log('Setting selected order:', {
        id: selectedOrderData.id,
        fullId: selectedOrderData.fullId,
        orderType: selectedOrderData.orderType,
        amount: selectedOrderData.amount
      });

      setSelectedOrder(selectedOrderData);
      setCustomOrderValue(selectedOrderData.amount.toString());
      setIsEditingOrderValue(false);
      setPaymentDetailsSent(false);
      setIsOrderSelected(true);


      if (selectedOrderData.currency === 'CDM') {
        setUserDetailsTab('BANK');
      } else {
        setUserDetailsTab('UPI');
      }
    };

    const handleOrderDeselected = () => {
      console.log('Order deselected');
      setSelectedOrder(null);
      setCustomOrderValue('');
      setIsEditingOrderValue(false);
      setPaymentDetailsSent(false);
      setIsOrderSelected(false); // Add this line
    };

    window.addEventListener('orderSelected', handleOrderSelected as EventListener);
    window.addEventListener('orderDeselected', handleOrderDeselected as EventListener);

    return () => {
      window.removeEventListener('orderSelected', handleOrderSelected as EventListener);
      window.removeEventListener('orderDeselected', handleOrderDeselected as EventListener);
    };
  }, []);

  // Reset input fields when tab changes
  useEffect(() => {
    setNewBuyRate('')
    setNewSellRate('')
    setUpdateSuccess(false)
  }, [activeTab])

  useEffect(() => {
    const handleReceiptUploaded = (event: CustomEvent) => {
      const { orderId, fileName, fileUrl } = event.detail;

      console.log('📄 Receipt uploaded notification received:', {
        orderId,
        fileName,
        fileUrl
      });

      setUploadedReceipts(prev => ({
        ...prev,
        [orderId]: {
          fileName,
          fileUrl,
          uploadedAt: new Date()
        }
      }));
    };

    window.addEventListener('receiptUploaded', handleReceiptUploaded as EventListener);

    return () => {
      window.removeEventListener('receiptUploaded', handleReceiptUploaded as EventListener);
    };
  }, []);

  useEffect(() => {
    const handleUserReceivedMoney = (event: CustomEvent) => {
      const { orderId, orderType, amount, timestamp } = event.detail;

      console.log('💰 User received money notification in admin right:', {
        orderId,
        orderType,
        amount,
        timestamp
      });

      // Only show notification if this is the currently selected order and it's a SELL order
      if (selectedOrder &&
        (selectedOrder.fullId === orderId || selectedOrder.id === orderId) &&
        orderType.includes('SELL')) {

        setUserMoneyNotification({
          orderId,
          message: "User got money in bank",
          amount: amount,
          timestamp: new Date(timestamp)
        });

        console.log('📢 Showing user money notification for selected order:', orderId);

        // Auto-remove notification after 15 seconds
        setTimeout(() => {
          setUserMoneyNotification(null);
        }, 15000);
      }
    };

    window.addEventListener('userReceivedMoney', handleUserReceivedMoney as EventListener);

    return () => {
      window.removeEventListener('userReceivedMoney', handleUserReceivedMoney as EventListener);
    };
  }, [selectedOrder]); // Include selectedOrder in dependency array

  useEffect(() => {
    const loadQrFeatureFlag = async () => {
      try {
        setQrFeatureLoading(true)
        const data = await makeAdminRequest('/api/admin/feature-flags')
        const featureEnabled = Boolean(data?.featureFlag?.enabled)
        setQrScanPayEnabled(featureEnabled)
      } catch (error) {
        console.error('Failed to load QR Scan & Pay feature flag:', error)
      } finally {
        setQrFeatureLoading(false)
      }
    }

    loadQrFeatureFlag()
  }, [makeAdminRequest])

  // 🔥 ADD: Clear notification when order changes
  useEffect(() => {
    // Clear notification when order selection changes
    setUserMoneyNotification(null);
  }, [selectedOrder]);

  // Add function to manually dismiss notification
  const dismissUserMoneyNotification = () => {
    setUserMoneyNotification(null);
  };

  const handleToggleQrScanPay = async () => {
    try {
      setQrFeatureSaving(true)
      const nextEnabled = !qrScanPayEnabled
      const data = await makeAdminRequest('/api/admin/feature-flags', {
        method: 'PATCH',
        body: JSON.stringify({
          key: QR_SCAN_PAY_FLAG_KEY,
          enabled: nextEnabled,
        }),
      })

      const updatedEnabled = Boolean(data?.featureFlag?.enabled)
      setQrScanPayEnabled(updatedEnabled)
      window.dispatchEvent(
        new CustomEvent('qrScanPayFeatureUpdated', {
          detail: { enabled: updatedEnabled },
        })
      )
    } catch (error) {
      console.error('Failed to update QR Scan & Pay feature flag:', error)
      alert('Failed to update Scan QR & Pay status. Please try again.')
    } finally {
      setQrFeatureSaving(false)
    }
  }

  const handleUpdatePrice = async () => {
    if (!newBuyRate || !newSellRate) {
      return
    }

    try {
      console.log('Updating rates:', { currency: activeTab, buyRate: newBuyRate, sellRate: newSellRate })

      await updateRates(activeTab as 'UPI' | 'CDM', newBuyRate, newSellRate)

      // Wait a moment then refresh rates
      setTimeout(async () => {
        await refetch()

        // Broadcast rate update event to other components
        window.dispatchEvent(new CustomEvent('ratesUpdated', {
          detail: {
            currency: activeTab,
            buyRate: parseFloat(newBuyRate),
            sellRate: parseFloat(newSellRate)
          }
        }))
      }, 500)

      setNewBuyRate('')
      setNewSellRate('')
      setUpdateSuccess(true)

      // Hide success message after 3 seconds
      setTimeout(() => setUpdateSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to update rates:', error)
    }
  }

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleSendPaymentDetails = async (paymentMethod: 'BUY_UPI' | 'BUY_CDM') => {
    if (!selectedOrder) {
      console.error('No selected order available');
      return;
    }

    console.log('🚀 Starting to send payment details for order:', selectedOrder);
    setSendingPaymentDetails(true);

    try {
      const orderId = selectedOrder.fullId || selectedOrder.id;
      const trimmedUpiId = adminUpiId.trim();

      // Validate inputs
      if (paymentMethod === 'BUY_UPI') {
        if (!trimmedUpiId || trimmedUpiId.length === 0) {
          alert('Please enter a valid UPI ID');
          setSendingPaymentDetails(false);
          return;
        }
        console.log('✅ UPI ID validation passed:', trimmedUpiId);
      }

      if (paymentMethod === 'BUY_CDM') {
        if (!trimmedUpiId || trimmedUpiId.length === 0) {
          alert('Please enter a valid UPI ID for ₹5 verification');
          setSendingPaymentDetails(false);
          return;
        }
        console.log('✅ CDM UPI ID validation passed:', trimmedUpiId);
      }

      // 🔥 FIX: Parse custom amount properly
      const customAmountValue = parseFloat(customOrderValue);
      if (isNaN(customAmountValue) || customAmountValue <= 0) {
        alert('Please enter a valid custom amount');
        setSendingPaymentDetails(false);
        return;
      }

      console.log('🚀 Sending payment details:', {
        orderId,
        paymentMethod,
        adminUpiId: trimmedUpiId,
        customOrderValue,
        parsedCustomAmount: customAmountValue
      });

      const paymentDetailsUpdate = {
        status: 'ADMIN_APPROVED',
        adminUpiId: trimmedUpiId,
        adminBankDetails: paymentMethod === 'BUY_UPI' ? null : null,
        adminNotes: paymentMethod === 'BUY_CDM'
          ? `UPI ID provided for ₹5 verification. Custom amount: ₹${customAmountValue}`
          : `Payment details provided. Custom amount: ₹${customAmountValue}`,
        customAmount: paymentMethod === 'BUY_CDM' ? undefined : customAmountValue // 🔥 FIX: Only update custom amount for UPI at this stage
      };

      console.log('📝 Sending payment details update:', paymentDetailsUpdate);

      // Update order in database with admin payment details
      const updateResponse = await makeAdminRequest(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify(paymentDetailsUpdate)
      });

      console.log('✅ Database update response:', updateResponse);

      if (updateResponse.success) {
        // Mark as sent
        setPaymentDetailsSent(true);

        // Show success message
        setUpdateSuccess(true);
        setTimeout(() => setUpdateSuccess(false), 3000);

        console.log('🎉 Payment details with custom amount saved successfully!', {
          customAmount: customAmountValue,
          adminUpiId: trimmedUpiId
        });

        // Clear UPI field after sending
        setAdminUpiId('');

      } else {
        throw new Error(updateResponse.error || 'Failed to update order');
      }

    } catch (error) {
      console.error('💥 Error sending payment details:', error);
      alert('Failed to send payment details. Please try again.');
    } finally {
      setSendingPaymentDetails(false);
    }
  }

  const handleOrderValueChange = () => {
    setIsEditingOrderValue(false)
    // Validate the custom value
    const value = parseFloat(customOrderValue)
    if (isNaN(value) || value <= 0) {
      setCustomOrderValue(selectedOrder?.amount.toString() || '')
    }
  }

  const [sendingBankDetails, setSendingBankDetails] = useState(false)

  const handleViewReceipt = async (fileUrl: string, fileName: string) => {
    try {
      console.log('📄 Viewing receipt:', { fileUrl, fileName });

      const response = await fetch('/api/view-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ receiptUrl: fileUrl }),
      });

      const result = await response.json();

      if (result.success) {
        // Open PDF in new window
        window.open(result.signedUrl, '_blank', 'width=800,height=600');
      } else {
        alert('Failed to open receipt: ' + result.error);
      }
    } catch (error) {
      console.error('Error viewing receipt:', error);
      alert('Failed to open receipt');
    }
  };

  const handleSendBankDetails = async () => {
    if (!selectedOrder) return;

    setSendingBankDetails(true);
    try {
      const orderId = selectedOrder.fullId || selectedOrder.id;

      const bankDetailsUpdate = {
        adminBankDetails: JSON.stringify(adminBankDetails),
        adminNotes: `Bank details provided for main transfer. Amount: ${customOrderValue}`,
        status: 'ADMIN_SENT_PAYMENT_INFO', // 🔥 CHANGE: Update status when sending bank details
        customAmount: parseFloat(customOrderValue) // 🔥 ADD: Save custom amount when sending bank details
      };

      const updateResponse = await makeAdminRequest(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify(bankDetailsUpdate)
      });

      if (updateResponse.success) {
        setUpdateSuccess(true);
        setTimeout(() => setUpdateSuccess(false), 3000);
        console.log('🎉 Bank details sent successfully!');

        // Clear bank details form after sending
        setAdminBankDetails({
          accountNumber: '',
          ifscCode: '',
          branchName: '',
          accountHolderName: ''
        });
      }
    } catch (error) {
      console.error('💥 Error sending bank details:', error);
      alert('Failed to send bank details. Please try again.');
    } finally {
      setSendingBankDetails(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-[#141414] text-white h-full py-4 px-2 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-gray-400">Loading rates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#141414] text-white h-full py-4 px-2 space-y-6 overflow-y-auto font-montserrat">
      <div className="bg-[#101010] border border-[#3E3E3E] rounded-md p-4">
        <div className="flex items-center justify-between gap-4 rounded-[1.1rem] border border-white/10 bg-[#0d0d14] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <div>
            <h2 className="text-[1.05rem] font-semibold text-white">Scan QR &amp; Pay</h2>
            <p className="pt-1 text-xs text-gray-400">
              User-side QR flow is currently {qrScanPayEnabled ? 'Online' : 'Offline'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleQrScanPay}
            disabled={qrFeatureLoading || qrFeatureSaving}
            aria-pressed={qrScanPayEnabled}
            aria-label={`Turn Scan QR and Pay ${qrScanPayEnabled ? 'off' : 'on'}`}
            className={`relative flex h-[4.55rem] w-[10.6rem] items-center rounded-full border border-white/10 px-4 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9f67ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141414] disabled:cursor-not-allowed disabled:opacity-60 ${
              qrScanPayEnabled
                ? 'bg-[linear-gradient(90deg,#6d2de0_0%,#7b3ff1_55%,#5720bb_100%)]'
                : 'bg-[linear-gradient(90deg,#1a1a22_0%,#232331_100%)]'
            }`}
          >
            <span className="absolute left-6 text-[0.95rem] font-medium text-white/95">
              {qrScanPayEnabled ? 'Online' : 'Offline'}
            </span>
            <span
              className={`ml-auto flex h-[3.2rem] w-[3.2rem] items-center justify-center rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.32)] transition-transform duration-200 ${
                qrScanPayEnabled
                  ? 'translate-x-0 bg-[radial-gradient(circle_at_35%_35%,#d8c6ff_0%,#b998ff_42%,#8b59ff_100%)]'
                  : '-translate-x-[3.55rem] bg-[radial-gradient(circle_at_35%_35%,#f1eaff_0%,#d1b9ff_42%,#9d76ff_100%)]'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Rate Management Section */}
      <div className="bg-[#101010] border border-[#3E3E3E] rounded-md p-4">
        {/* Tab Buttons */}
        <div className="flex space-x-3 mb-4">
          <button
            onClick={() => setActiveTab('UPI')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all font-montserrat ${activeTab === 'UPI'
              ? 'bg-[#622DBF] text-white'
              : 'bg-[#101010] text-gray-300 border border-[#3E3E3E] hover:bg-gray-700/50'
              }`}
          >
            UPI
          </button>
          <button
            onClick={() => setActiveTab('CDM')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all font-montserrat ${activeTab === 'CDM'
              ? 'bg-[#622DBF] text-white'
              : 'bg-[#101010] text-gray-300 border border-[#3E3E3E] hover:bg-gray-700/50'
              }`}
          >
            CDM
          </button>
        </div>

        {/* Rate Management Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-white mb-1 font-montserrat">Rate Management</h2>
          <p className="text-gray-400 text-sm font-montserrat">Update Buy and Sell rates for USDT ({activeTab})</p>
        </div>

        {/* Current Rates with Real-time Updates */}
        <div className="flex space-x-4 mb-6">
          <div className="flex-1 text-center">
            <div className="text-gray-400 text-sm mb-1 font-montserrat">Current Buy Rate</div>
            <motion.div
              className="text-3xl font-bold text-white font-montserrat"
              key={`buy-${currentBuyRate}`}
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.3 }}
            >
              {currentBuyRate} ₹
            </motion.div>
          </div>
          <div className="flex-1 text-center">
            <div className="text-gray-400 text-sm mb-1 font-montserrat">Current Sell Rate</div>
            <motion.div
              className="text-3xl font-bold text-white font-montserrat"
              key={`sell-${currentSellRate}`}
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.3 }}
            >
              {currentSellRate} ₹
            </motion.div>
          </div>
        </div>

        {/* Last Updated Info */}
        <div className="text-center mb-4">
          <p className="text-xs text-gray-500 font-montserrat">
            Last updated: {currentRate?.updatedAt ? new Date(currentRate.updatedAt).toLocaleTimeString() : 'Never'}
          </p>
        </div>

        {/* New Rates Input */}
        <div className="flex space-x-4 mb-6">
          <div className="flex-1">
            <div className="text-gray-400 text-sm mb-2 font-montserrat">New Buy Rate</div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-montserrat">₹</span>
              <input
                type="number"
                step="0.01"
                value={newBuyRate}
                onChange={(e) => setNewBuyRate(e.target.value)}
                className="w-full bg-[#1E1C1C] border border-gray-600/50 rounded-md py-2 pl-7 pr-4 text-white placeholder-gray-400 focus:outline-none focus:border-[#622DBF] focus:ring-1 focus:ring-purple-500/20 font-montserrat"
                placeholder={currentBuyRate}
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="text-gray-400 text-sm mb-2 font-montserrat">New Sell Rate</div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-montserrat">₹</span>
              <input
                type="number"
                step="0.01"
                value={newSellRate}
                onChange={(e) => setNewSellRate(e.target.value)}
                className="w-full bg-[#1E1C1C] border border-gray-600/50 rounded-md py-2 pl-7 pr-4 text-white placeholder-gray-400 focus:outline-none focus:border-[#622DBF] focus:ring-1 focus:ring-purple-500/20 font-montserrat"
                placeholder={currentSellRate}
              />
            </div>
          </div>
        </div>

        {/* Error Display */}
        <AnimatePresence>
          {updateError && (
            <motion.div
              className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <p className="text-red-400 text-sm font-montserrat">{updateError}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Display */}
        <AnimatePresence>
          {updateSuccess && (
            <motion.div
              className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-md"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <p className="text-green-400 text-sm font-montserrat">
                  {activeTab} rates updated successfully! Changes will reflect across the platform.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Update Price Button */}
        <button
          onClick={handleUpdatePrice}
          disabled={updating || !newBuyRate || !newSellRate}
          className="w-full bg-[#622DBF] hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-6 rounded-md font-bold transition-all shadow-lg shadow-purple-600/25 font-montserrat"
        >
          {updating ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Updating Rates...</span>
            </div>
          ) : (
            `Update ${activeTab} Rates`
          )}
        </button>
      </div>

      {/* Selected Order Info */}
      {selectedOrder ? (
        <>
          {/* 🔥 ADD: User Money Received Notification - Only for SELL orders */}
          {userMoneyNotification && selectedOrder.orderType.includes('SELL') && (
            <div className="bg-[#101010] border border-green-500/50 rounded-md p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce"></div>
                  <div>
                    <h3 className="text-lg font-semibold text-green-400 font-montserrat">
                      💰 {userMoneyNotification.message}
                    </h3>
                    <p className="text-sm text-green-300 font-montserrat">
                      Order: {userMoneyNotification.orderId.slice(-8)} •
                      Amount: ₹{userMoneyNotification.amount} •
                      Time: {userMoneyNotification.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={dismissUserMoneyNotification}
                  className="text-green-300 hover:text-white text-xs px-3 py-1 rounded bg-green-700/30 hover:bg-green-600/50 transition-colors font-montserrat"
                >
                  ✕ Dismiss
                </button>
              </div>
              <div className="mt-3 p-2 bg-green-500/10 rounded text-xs text-green-200 font-montserrat">
                <strong>User confirmed:</strong> They have received ₹{userMoneyNotification.amount} in their bank account for this sell order.
              </div>
            </div>
          )}

          {/* Order Info Section with Custom Value */}
          <div className="bg-[#101010] border border-[#3E3E3E] rounded-md p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white font-montserrat">Selected Order</h3>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-500 text-sm font-montserrat">Active</span>
                </div>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('orderDeselected'))}
                  className="text-gray-400 hover:text-white text-xs px-3 py-1 rounded bg-gray-700/50 hover:bg-gray-600/50 transition-colors"
                >
                  Deselect
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm font-montserrat">Order ID:</span>
                <span className="text-white text-sm font-montserrat">{selectedOrder.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm font-montserrat">Type:</span>
                <span className="text-white text-sm font-montserrat">{selectedOrder.type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm font-montserrat">Original Amount:</span>
                <span className="text-gray-300 text-sm font-montserrat">₹{selectedOrder.amount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm font-montserrat">Custom Amount:</span>
                <div className="flex items-center space-x-2">
                  {isEditingOrderValue ? (
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">₹</span>
                        <input
                          type="number"
                          value={customOrderValue}
                          onChange={(e) => setCustomOrderValue(e.target.value)}
                          onBlur={handleOrderValueChange}
                          onKeyDown={(e) => e.key === 'Enter' && handleOrderValueChange()}
                          className="w-20 bg-[#1E1C1C] border border-gray-600/50 rounded py-1 pl-5 pr-2 text-white text-sm focus:outline-none focus:border-[#622DBF]"
                          autoFocus
                        />
                      </div>
                      <button
                        onClick={handleOrderValueChange}
                        className="text-green-400 hover:text-green-300"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-white text-sm font-montserrat font-bold">₹{customOrderValue}</span>
                      <button
                        onClick={() => setIsEditingOrderValue(true)}
                        className="text-gray-400 hover:text-white"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm font-montserrat">Rate:</span>
                <span className="text-white text-sm font-montserrat">${selectedOrder.price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm font-montserrat">Currency:</span>
                <span className="text-white text-sm font-montserrat">{selectedOrder.currency}</span>
              </div>
            </div>
          </div>

          {/* User Info Section */}
          <div className="bg-[#101010] border border-[#3E3E3E] rounded-md p-4">
            <h3 className="text-lg font-semibold text-white mb-4 font-montserrat">User Info</h3>
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-white" />
                    <span className="text-white text-sm font-montserrat">
                      {(() => { const addr = selectedOrder.user.smartWalletAddress ?? selectedOrder.user.walletAddress; return `${addr.slice(0, 6)}...${addr.slice(-4)}`; })()}
                    </span>
                    <button
                      onClick={() => handleCopy(selectedOrder.user.smartWalletAddress ?? selectedOrder.user.walletAddress, 'wallet')}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {copiedField === 'wallet' ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
            </div>
          </div>

          {/* User Bank & UPI Details Section */}
          <div className="bg-[#101010] border border-[#3E3E3E] rounded-md p-4">
            <h3 className="text-lg font-semibold text-white mb-4 font-montserrat">
              {selectedOrder.scannedUpiId ? "Merchant Payout Details" : "User Payment Details"}
            </h3>

            {selectedOrder.scannedUpiId ? (
              /* CRITICAL: For QR Scan orders, ONLY show the merchant payout info. Hide everything else to prevent admin payout mistakes. */
              <div className="space-y-4">
                <div className="p-4 bg-blue-600/25 border-2 border-blue-500 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(96,165,250,0.8)]"></div>
                    <span className="text-blue-400 font-black text-sm uppercase tracking-widest italic">⚡ QR MERCHANT PAYOUT ⚡</span>
                  </div>
                  
                  <div className="bg-black/50 p-3 rounded-lg border border-blue-500/40 mb-3">
                    <div className="text-[0.65rem] text-blue-300 uppercase font-black mb-1 tracking-tighter">TRANSFER TO MERCHANT UPI:</div>
                    <div className="text-xl text-white font-mono font-bold break-all leading-tight selection:bg-blue-500">
                      {selectedOrder.scannedUpiId}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleCopy(selectedOrder.scannedUpiId!, 'merchantUpi')}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all active:scale-[0.98] shadow-lg border border-blue-400/50"
                    >
                      {copiedField === 'merchantUpi' ? (
                        <><CheckCircle className="w-5 h-5" /> COPIED!</>
                      ) : (
                        <><Copy className="w-5 h-5" /> COPY MERCHANT UPI</>
                      )}
                    </button>

                    <div className="bg-yellow-500/15 border border-yellow-500/40 p-3 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                        <div className="text-[0.72rem] text-yellow-100 font-medium leading-normal">
                          <span className="font-black text-yellow-400 underline">WARNING:</span> This is a direct QR scan payment. <span className="text-white font-black underline">NEVER</span> use the user&apos;s default UPI ID for this order.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 border border-red-900/20 bg-red-900/5 rounded-lg opacity-40 grayscale pointer-events-none">
                  <p className="text-xs text-red-300 font-bold mb-2 uppercase tracking-tighter">⚠️ User Personal Data Locked</p>
                  <p className="text-[0.65rem] text-red-200/60">The user&apos;s default profile data (UPI/Bank) is hidden for this QR transaction to ensure the payout goes to the vendor QR.</p>
                </div>
              </div>
            ) : (
              /* Regular Buy/Sell Workflow */
              <>
                {/* Tab Buttons */}
                <div className="flex space-x-3 mb-4">
                  <button
                    onClick={() => setUserDetailsTab('UPI')}
                    className={`py-2 px-4 rounded text-sm font-medium transition-all font-montserrat ${userDetailsTab === 'UPI'
                      ? 'bg-[#622DBF] text-white'
                      : 'bg-[#1E1C1C] text-gray-400 border border-gray-600/50 hover:bg-gray-700/50'
                      }`}
                  >
                    USER UPI ID
                  </button>
                  <button
                    onClick={() => setUserDetailsTab('BANK')}
                    className={`py-2 px-4 rounded text-sm font-medium transition-all font-montserrat ${userDetailsTab === 'BANK'
                      ? 'bg-[#622DBF] text-white'
                      : 'bg-[#1E1C1C] text-gray-400 border border-gray-600/50 hover:bg-gray-700/50'
                      }`}
                  >
                    USER BANK DETAILS
                  </button>
                </div>

                {/* UPI Details */}
                {userDetailsTab === 'UPI' && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="w-4 h-4 text-white" />
                        <span className="text-gray-400 text-sm font-montserrat">User UPI ID</span>
                      </div>
                      <div className="flex items-center space-x-2 bg-[#1E1C1C] border border-gray-600/50 rounded-md py-2 px-4">
                        <span className="text-white text-sm font-montserrat flex-1">
                          {selectedOrder.user.upiId || 'Not provided'}
                        </span>
                        {selectedOrder.user.upiId && (
                          <button
                            onClick={() => handleCopy(selectedOrder.user.upiId!, 'userUpi')}
                            className="text-gray-400 hover:text-white transition-colors"
                          >
                            {copiedField === 'userUpi' ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-gray-400 text-sm font-montserrat">Verification Status</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${selectedOrder.user.upiId ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className={`text-sm font-montserrat ${selectedOrder.user.upiId ? 'text-green-500' : 'text-red-500'}`}>
                          {selectedOrder.user.upiId ? 'Verified' : 'Not Verified'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bank Details */}
                {userDetailsTab === 'BANK' && (
                  <div className="space-y-4">
                    {selectedOrder.user.bankDetails ? (
                      <>
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-gray-400 text-sm font-montserrat">Account Number</span>
                          </div>
                          <div className="flex items-center space-x-2 bg-[#1E1C1C] border border-gray-600/50 rounded-md py-2 px-4">
                            <span className="text-white text-sm font-montserrat flex-1">
                              ****{selectedOrder.user.bankDetails.accountNumber?.slice(-4) || '****'}
                            </span>
                            <button
                              onClick={() => handleCopy(selectedOrder.user.bankDetails.accountNumber, 'accountNumber')}
                              className="text-gray-400 hover:text-white transition-colors"
                            >
                              {copiedField === 'accountNumber' ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-gray-400 text-sm font-montserrat">IFSC CODE</span>
                          </div>
                          <div className="flex items-center space-x-2 bg-[#1E1C1C] border border-gray-600/50 rounded-md py-2 px-4">
                            <span className="text-white text-sm font-montserrat flex-1">
                              {selectedOrder.user.bankDetails.ifscCode || 'Not provided'}
                            </span>
                            {selectedOrder.user.bankDetails.ifscCode && (
                              <button
                                onClick={() => handleCopy(selectedOrder.user.bankDetails.ifscCode, 'ifsc')}
                                className="text-gray-400 hover:text-white transition-colors"
                              >
                                {copiedField === 'ifsc' ? (
                                  <CheckCircle className="w-4 h-4 text-green-400" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-gray-400 text-sm font-montserrat">Bank Name</span>
                          </div>
                          <div className="bg-[#1E1C1C] border border-gray-600/50 rounded-md py-2 px-4">
                            <span className="text-white text-sm font-montserrat">
                              {selectedOrder.user.bankDetails.bankName || 'Not provided'}
                            </span>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-gray-400 text-sm font-montserrat">Branch Name</span>
                          </div>
                          <div className="bg-[#1E1C1C] border border-gray-600/50 rounded-md py-2 px-4">
                            <span className="text-white text-sm font-montserrat">
                              {selectedOrder.user.bankDetails.branchName || 'Not provided'}
                            </span>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-gray-400 text-sm font-montserrat">Account Holder Name</span>
                          </div>
                          <div className="bg-[#1E1C1C] border border-gray-600/50 rounded-md py-2 px-4">
                            <span className="text-white text-sm font-montserrat">
                              {selectedOrder.user.bankDetails.accountHolderName || 'Not provided'}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-400 font-montserrat">No bank details provided</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Payment section for UPI */}
          {selectedOrder.orderType === 'BUY_UPI' && (
            <div className="bg-[#101010] border border-[#3E3E3E] rounded-md p-4">
              <h3 className="text-lg font-semibold text-white mb-4 font-montserrat">Send UPI Payment Details</h3>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <User className="w-4 h-4 text-white" />
                    <span className="text-gray-400 text-sm font-montserrat">Admin UPI ID</span>
                  </div>
                  <input
                    type="text"
                    value={adminUpiId}
                    onChange={(e) => setAdminUpiId(e.target.value)}
                    className="w-full bg-[#1E1C1C] border border-gray-600/50 rounded-md py-2 px-4 text-white placeholder-gray-400 focus:outline-none focus:border-[#622DBF] focus:ring-1 focus:ring-purple-500/20 font-montserrat"
                    placeholder="Enter your UPI ID"
                  />
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-gray-400 text-sm font-montserrat">Amount user should pay</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-montserrat">₹</span>
                    <input
                      type="text"
                      value={customOrderValue}
                      readOnly
                      className="w-full bg-[#2a2a2a] border border-gray-600/50 rounded-md py-2 pl-7 pr-4 text-white focus:outline-none font-montserrat font-bold"
                    />
                  </div>
                </div>

                {paymentDetailsSent && (
                  <motion.div
                    className="p-3 bg-green-500/10 border border-green-500/20 rounded-md"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <p className="text-green-400 text-sm font-montserrat">
                        Payment details sent to user! They will see your UPI ID and the custom amount.
                      </p>
                    </div>
                  </motion.div>
                )}

                <button
                  onClick={() => handleSendPaymentDetails('BUY_UPI')}
                  disabled={!adminUpiId || sendingPaymentDetails || paymentDetailsSent}
                  className="w-full bg-[#622DBF] hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-6 rounded-md font-medium transition-all font-montserrat"
                >
                  {sendingPaymentDetails ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending...</span>
                    </div>
                  ) : paymentDetailsSent ? (
                    <div className="flex items-center justify-center space-x-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Payment Details Sent</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <Send className="w-4 h-4" />
                      <span>Send UPI Details to User</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Payment section for CDM */}
          {selectedOrder.orderType === 'BUY_CDM' && (
            <>
              {/* UPI Verification Section for CDM Orders */}
              <div className="bg-[#101010] border border-[#3E3E3E] rounded-md p-4 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4 font-montserrat">Send UPI for ₹5 Verification</h3>

                <div className="space-y-4">
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                    <div className="flex items-center space-x-2 mb-1">
                      <Info className="w-4 h-4 text-blue-400" />
                      <span className="text-blue-400 text-sm font-montserrat">CDM Order Process</span>
                    </div>
                    <p className="text-gray-300 text-xs">
                      For CDM orders, user must first pay ₹5 verification fee via UPI before bank transfer
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <User className="w-4 h-4 text-white" />
                      <span className="text-gray-400 text-sm font-montserrat">Admin UPI ID for ₹5 Verification</span>
                    </div>
                    <input
                      type="text"
                      value={adminUpiId}
                      onChange={(e) => setAdminUpiId(e.target.value)}
                      className="w-full bg-[#1E1C1C] border border-gray-600/50 rounded-md py-2 px-4 text-white placeholder-gray-400 focus:outline-none focus:border-[#622DBF] focus:ring-1 focus:ring-purple-500/20 font-montserrat"
                      placeholder="Enter your UPI ID for ₹5 verification"
                    />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-gray-400 text-sm font-montserrat">Verification Amount</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-montserrat">₹</span>
                      <input
                        type="text"
                        value="5"
                        readOnly
                        className="w-full bg-[#2a2a2a] border border-gray-600/50 rounded-md py-2 pl-7 pr-4 text-yellow-400 focus:outline-none font-montserrat font-bold"
                      />
                    </div>
                  </div>

                  {paymentDetailsSent && (
                    <motion.div
                      className="p-3 bg-green-500/10 border border-green-500/20 rounded-md"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <p className="text-green-400 text-sm font-montserrat">
                          UPI ID sent! User can now pay ₹5 verification fee.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  <button
                    onClick={() => handleSendPaymentDetails('BUY_CDM')}
                    disabled={!adminUpiId || sendingPaymentDetails || paymentDetailsSent}
                    className="w-full bg-[#622DBF] hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-6 rounded-md font-medium transition-all font-montserrat"
                  >
                    {sendingPaymentDetails ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending...</span>
                      </div>
                    ) : paymentDetailsSent ? (
                      <div className="flex items-center justify-center space-x-2">
                        <CheckCircle className="w-4 h-4" />
                        <span>UPI ID Sent for Verification</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <Send className="w-4 h-4" />
                        <span>Send UPI ID for ₹5 Verification</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Bank Details Section - Show after UPI verification */}
              <div className="bg-[#101010] border border-[#3E3E3E] rounded-md p-4">
                <h3 className="text-lg font-semibold text-white mb-4 font-montserrat">Send Bank Details for Main Transfer</h3>

                {!paymentDetailsSent && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md mb-4">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      <p className="text-yellow-400 text-sm font-montserrat">
                        Send UPI ID first for ₹5 verification before providing bank details
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-gray-400 text-sm font-montserrat">Admin Account Number</span>
                    </div>
                    <input
                      type="text"
                      value={adminBankDetails.accountNumber}
                      onChange={(e) => setAdminBankDetails({ ...adminBankDetails, accountNumber: e.target.value })}
                      className={`w-full border border-gray-600/50 rounded-md py-2 px-4 text-white placeholder-gray-400 focus:outline-none focus:border-[#622DBF] focus:ring-1 focus:ring-purple-500/20 font-montserrat ${paymentDetailsSent ? 'bg-[#1E1C1C]' : 'bg-[#2a2a2a] opacity-50'
                        }`}
                      placeholder="Enter account number"
                      disabled={!paymentDetailsSent}
                    />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-gray-400 text-sm font-montserrat">IFSC CODE</span>
                    </div>
                    <input
                      type="text"
                      value={adminBankDetails.ifscCode}
                      onChange={(e) => setAdminBankDetails({ ...adminBankDetails, ifscCode: e.target.value })}
                      className={`w-full border border-gray-600/50 rounded-md py-2 px-4 text-white placeholder-gray-400 focus:outline-none focus:border-[#622DBF] focus:ring-1 focus:ring-purple-500/20 font-montserrat ${paymentDetailsSent ? 'bg-[#1E1C1C]' : 'bg-[#2a2a2a] opacity-50'
                        }`}
                      placeholder="Enter IFSC code"
                      disabled={!paymentDetailsSent}
                    />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-gray-400 text-sm font-montserrat">Branch Name</span>
                    </div>
                    <input
                      type="text"
                      value={adminBankDetails.branchName}
                      onChange={(e) => setAdminBankDetails({ ...adminBankDetails, branchName: e.target.value })}
                      className={`w-full border border-gray-600/50 rounded-md py-2 px-4 text-white placeholder-gray-400 focus:outline-none focus:border-[#622DBF] focus:ring-1 focus:ring-purple-500/20 font-montserrat ${paymentDetailsSent ? 'bg-[#1E1C1C]' : 'bg-[#2a2a2a] opacity-50'
                        }`}
                      placeholder="Enter branch name"
                      disabled={!paymentDetailsSent}
                    />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-gray-400 text-sm font-montserrat">Account Holder Name</span>
                    </div>
                    <input
                      type="text"
                      value={adminBankDetails.accountHolderName}
                      onChange={(e) => setAdminBankDetails({ ...adminBankDetails, accountHolderName: e.target.value })}
                      className={`w-full border border-gray-600/50 rounded-md py-2 px-4 text-white placeholder-gray-400 focus:outline-none focus:border-[#622DBF] focus:ring-1 focus:ring-purple-500/20 font-montserrat ${paymentDetailsSent ? 'bg-[#1E1C1C]' : 'bg-[#2a2a2a] opacity-50'
                        }`}
                      placeholder="Enter account holder name"
                      disabled={!paymentDetailsSent}
                    />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-gray-400 text-sm font-montserrat">Amount user should pay</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-montserrat">₹</span>
                      <input
                        type="text"
                        value={customOrderValue}
                        readOnly
                        className="w-full bg-[#2a2a2a] border border-gray-600/50 rounded-md py-2 pl-7 pr-4 text-white focus:outline-none font-montserrat font-bold"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSendBankDetails}
                    disabled={!adminBankDetails.accountNumber || !adminBankDetails.ifscCode || !adminBankDetails.branchName || !adminBankDetails.accountHolderName || !paymentDetailsSent || sendingBankDetails}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-6 rounded-md font-medium transition-all font-montserrat"
                  >
                    {sendingBankDetails ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <Send className="w-4 h-4" />
                        <span>Send Bank Details for Main Transfer</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        /* No Order Selected */
        <div className="bg-[#101010] border border-[#3E3E3E] rounded-md p-4">
          <div className="text-center py-8">
            <div className="mb-4">
              <RefreshCw className="w-12 h-12 text-gray-400 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2 font-montserrat">No Order Selected</h3>
            <p className="text-gray-400 text-sm font-montserrat">
              Select an order from the center panel to view user details and manage payment information.
            </p>
          </div>
        </div>
      )}

      {/* 🔥 ADD: Floating User Money Notification */}
      <AnimatePresence>
        {userMoneyNotification && selectedOrder?.orderType.includes('SELL') && (
          <motion.div
            className="fixed top-4 right-4 z-50 max-w-sm"
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            <div className="bg-green-600 border border-green-500 rounded-lg p-4 shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
                  <h4 className="text-white font-bold font-montserrat">
                    💰 {userMoneyNotification.message}
                  </h4>
                </div>
                <button
                  onClick={dismissUserMoneyNotification}
                  className="text-white hover:text-gray-200 text-lg"
                >
                  ✕
                </button>
              </div>
              <div className="text-sm text-green-100 font-montserrat">
                <div>Order: {userMoneyNotification.orderId.slice(-8)}</div>
                <div>Amount: ₹{userMoneyNotification.amount}</div>
                <div>Time: {userMoneyNotification.timestamp.toLocaleTimeString()}</div>
              </div>
              <div className="mt-2 text-xs text-green-50 bg-green-700/30 rounded p-2 font-montserrat">
                User confirmed they received money in their bank account.
              </div>
            </div>
          </motion.div>
        )}
        {selectedOrder && (
          <div className="bg-[#101010] border border-[#3E3E3E] rounded-md p-4">
            <h3 className="text-lg font-semibold text-white mb-4 font-montserrat">
              Uploaded Payment Receipts
            </h3>

            {uploadedReceipts[selectedOrder.fullId] || uploadedReceipts[selectedOrder.id] || selectedOrder.paymentProof ? (
              <div className="space-y-3">
                {/* Receipt from state (newly uploaded) */}
                {(uploadedReceipts[selectedOrder.fullId] || uploadedReceipts[selectedOrder.id]) && (
                  <motion.div
                    className="bg-[#1E1C1C] border border-gray-600/50 rounded-lg p-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-purple-400" />
                        <div>
                          <div className="text-white font-medium font-montserrat">
                            {(uploadedReceipts[selectedOrder.fullId] || uploadedReceipts[selectedOrder.id])?.fileName || 'Payment Receipt'}
                          </div>
                          <div className="text-xs text-gray-400 font-montserrat">
                            Uploaded: {(uploadedReceipts[selectedOrder.fullId] || uploadedReceipts[selectedOrder.id])?.uploadedAt?.toLocaleString() || 'Just now'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const receipt = uploadedReceipts[selectedOrder.fullId] || uploadedReceipts[selectedOrder.id];
                          if (receipt) {
                            handleViewReceipt(receipt.fileUrl, receipt.fileName);
                          }
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all font-montserrat"
                      >
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4" />
                          <span>View PDF</span>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}

                {selectedOrder.paymentProof && !uploadedReceipts[selectedOrder.fullId] && !uploadedReceipts[selectedOrder.id] && (
                  <div className="bg-[#1E1C1C] border border-gray-600/50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-green-400" />
                        <div>
                          <div className="text-white font-medium font-montserrat">
                            Payment Receipt (Existing)
                          </div>
                          <div className="text-xs text-gray-400 font-montserrat">
                            Previously uploaded
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewReceipt(selectedOrder.paymentProof!, 'payment-receipt.pdf')}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all font-montserrat"
                      >
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4" />
                          <span>View PDF</span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400 font-montserrat">No payment receipts uploaded yet</p>
                <p className="text-gray-500 text-sm font-montserrat">
                  User will upload payment receipt after making the transfer
                </p>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
