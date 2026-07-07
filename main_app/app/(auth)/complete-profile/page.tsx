"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIsSignedIn, useIsInitialized } from '@coinbase/cdp-hooks';
import { useWalletManager } from '@/hooks/useWalletManager';
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Building,
  User,
  FileText,
  MapPin,
  ArrowRight,
  Check,
  AlertTriangle,
} from "lucide-react";
import Navigation from '@/components/landing/Navigation';

interface BankDetails {
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  branchName: string;
  accountHolderName: string;
}

export default function CompleteProfilePage() {
  const router = useRouter();
  const { isSignedIn } = useIsSignedIn();
  const { address, eoaAddress } = useWalletManager();
  const { isInitialized } = useIsInitialized();

  const [upiId, setUpiId] = useState("");
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    accountNumber: "",
    confirmAccountNumber: "",
    ifscCode: "",
    branchName: "",
    accountHolderName: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upiValidation, setUpiValidation] = useState<{
    isValid: boolean;
    isVerified: boolean;
    message?: string;
  }>({ isValid: false, isVerified: false });

  // UPI validation regex
  const validateUPI = (upi: string) => {
    // UPI format: username@bank (e.g., 9876543210@paytm, user@okaxis, name123@upi)
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;

    if (!upi.trim()) {
      return { isValid: false, isVerified: false };
    }

    if (upi.length < 3) {
      return {
        isValid: false,
        isVerified: false,
        message: "UPI ID is too short"
      };
    }

    if (!upi.includes('@')) {
      return {
        isValid: false,
        isVerified: false,
        message: "UPI ID must contain @ symbol"
      };
    }

    if (!upiRegex.test(upi)) {
      return {
        isValid: false,
        isVerified: false,
        message: "Your UPI Id is not valid please check again"
      };
    }

    // Valid UPI format
    return { isValid: true, isVerified: true };
  };

  // Handle UPI input change
  const handleUpiChange = (value: string) => {
    setUpiId(value);
    const validation = validateUPI(value);
    setUpiValidation(validation);

    // Clear general error when UPI becomes valid
    if (validation.isValid && error === "UPI ID is required") {
      setError(null);
    }
  };

  // Check if bank details are complete
  const isBankDetailsComplete = () => {
    const { accountNumber, confirmAccountNumber, ifscCode, branchName, accountHolderName } = bankDetails;
    return accountNumber && confirmAccountNumber && ifscCode && branchName && accountHolderName;
  };

  // Redirect if not connected (wait for CDP to initialize first)
  useEffect(() => {
    if (isInitialized && (!isSignedIn || !address)) {
      router.push("/");
    }
  }, [isInitialized, isSignedIn, address, router]);

  const handleBankDetailsChange = (field: keyof BankDetails, value: string) => {
    setBankDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!upiId.trim()) {
      setError("UPI ID is required");
      return false;
    }

    if (!upiValidation.isValid) {
      setError("Please enter a valid UPI ID");
      return false;
    }

    if (showBankDetails && isBankDetailsComplete()) {
      const { accountNumber, confirmAccountNumber } = bankDetails;

      if (accountNumber !== confirmAccountNumber) {
        setError("Account numbers do not match");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (skipCDM = false) => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);

    // Helper to call complete-profile
    const completeProfile = async () => {
      const smartWallet = address !== eoaAddress ? address : null;
      const requestData = {
        walletAddress: eoaAddress || address,
        smartWalletAddress: smartWallet,
        upiId: upiId.trim(),
        bankDetails: (isBankDetailsComplete() && !skipCDM) ? {
          accountNumber: bankDetails.accountNumber,
          ifscCode: bankDetails.ifscCode,
          branchName: bankDetails.branchName,
          accountHolderName: bankDetails.accountHolderName,
        } : null,
      };
      const response = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });
      return response;
    };

    try {
      let response = await completeProfile();
      let data = await response.json();

      // If user not found, register and retry
      if (response.status === 404 && data?.error?.includes("register")) {
        // Register user with both EOA and smart wallet address
        const regRes = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eoaAddress: eoaAddress || address,
            walletAddress: address,
          }),
        });
        if (regRes.ok) {
          // Retry profile completion
          response = await completeProfile();
          data = await response.json();
        } else {
          const regData = await regRes.json();
          setError(regData.error || "Registration failed");
          setIsSubmitting(false);
          return;
        }
      }

      if (response.ok) {
        setIsSuccess(true);
        setTimeout(() => {
          if (data.user.role === "ADMIN") {
            router.push("/admin");
          } else {
            router.push("/fiat");
          }
        }, 2000);
      } else {
        setError(data.error || "Failed to save profile");
      }
    } catch (error) {
      console.error("Profile completion error:", error);
      setError("Failed to save profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-black">
        <Navigation />
        <div className="flex items-center justify-center p-4" style={{ height: 'calc(100vh - 80px)' }}>
          <motion.div
            className="text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 md:w-20 md:h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <img src="/srd_final.svg" alt="" className="w-48 h-48" />
            </motion.div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 font-montserrat px-4">
              Profile Completed!
            </h1>
            <p className="text-gray-400 font-montserrat px-4">
              Redirecting to your dashboard...
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation */}
      <Navigation />

      {/* Main Content - Responsive container */}
      <div className="px-4 md:px-8 py-6 md:py-8 max-w-6xl mx-auto">
        <motion.div
          className="rounded-lg overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* UPI Section */}
          <div className="w-full p-4 md:p-6 bg-[#111010] border rounded-2xl border-[#3E3E3E]">
            <div className="flex flex-col md:flex-row md:items-center mb-4 space-y-2 md:space-y-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center md:mr-2 flex-shrink-0">
                <img src="/phonepay-gpay.svg" alt="" className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <span className="text-white font-montserrat text-base md:text-xl font-semibold leading-relaxed md:leading-normal">
                Add your UPI ID to start secure transactions instantly.
              </span>
            </div>

            <div className="relative w-full">
              <input
                type="text"
                value={upiId}
                onChange={(e) => handleUpiChange(e.target.value)}
                placeholder="Paste your UPI ID here"
                className="w-full bg-[#1E1C1C] rounded-lg px-3 py-3 pr-10 md:pr-20 text-white placeholder-gray-500 focus:outline-none focus:border-[#622DBF] focus:ring-1 focus:ring-[#622DBF]/20 font-montserrat text-sm border border-transparent"
              />

              {/* Verified Checkmark */}
              {upiValidation.isVerified && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1"
                >
                  <span className="text-green-500 text-xs font-montserrat font-medium hidden sm:inline">
                    Verified
                  </span>
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                </motion.div>
              )}
            </div>

            {/* UPI Validation Error Message */}
            <AnimatePresence>
              {upiValidation.message && !upiValidation.isValid && upiId.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-3 flex items-start space-x-2"
                >
                  <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <span className="text-orange-500 text-sm font-montserrat leading-relaxed break-words">
                    {upiValidation.message}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bank Details Dropdown */}
          <div className="w-full mt-6">
            <button
              onClick={() => setShowBankDetails(!showBankDetails)}
              className="w-full flex items-center justify-between p-4 md:p-4 bg-[#111010] border rounded-2xl border-[#3E3E3E] hover:bg-[#2a2a2a] transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                  <img src="/bank.svg" alt="" className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <span className="text-white font-semibold font-montserrat text-base md:text-xl text-left leading-relaxed">
                  Add bank details for CDM (Cash Deposit) Transactions.
                </span>
              </div>
              {showBankDetails ? (
                <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
              )}
            </button>

            <AnimatePresence>
              {showBankDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 p-4 bg-[#1E1C1C] rounded-lg border border-[#3E3E3E]">
                    <div className="space-y-4">
                      {/* Account Holder Name */}
                      <div>
                        <label className="flex items-center text-white text-xs mb-2 font-montserrat">
                          <User className="w-3 h-3 mr-2 flex-shrink-0" />
                          Account Holder Name
                        </label>
                        <input
                          type="text"
                          value={bankDetails.accountHolderName}
                          onChange={(e) => handleBankDetailsChange("accountHolderName", e.target.value)}
                          placeholder="John Doe"
                          className="w-full bg-[#2a2a2a] border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#622DBF] font-montserrat text-sm"
                        />
                      </div>

                      {/* Account Number */}
                      <div>
                        <label className="flex items-center text-white text-xs mb-2 font-montserrat">
                          <FileText className="w-3 h-3 mr-2 flex-shrink-0" />
                          Account Number
                        </label>
                        <input
                          type="text"
                          value={bankDetails.accountNumber}
                          onChange={(e) => handleBankDetailsChange("accountNumber", e.target.value)}
                          placeholder="1234567890123456"
                          className="w-full bg-[#2a2a2a] border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#622DBF] font-montserrat text-sm"
                        />
                      </div>

                      {/* Confirm Account Number */}
                      <div>
                        <label className="flex items-center text-white text-xs mb-2 font-montserrat">
                          <FileText className="w-3 h-3 mr-2 flex-shrink-0" />
                          Confirm Account Number
                        </label>
                        <input
                          type="text"
                          value={bankDetails.confirmAccountNumber}
                          onChange={(e) => handleBankDetailsChange("confirmAccountNumber", e.target.value)}
                          placeholder="Re-enter account number"
                          className="w-full bg-[#2a2a2a] border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#622DBF] font-montserrat text-sm"
                        />
                      </div>

                      {/* IFSC Code */}
                      <div>
                        <label className="flex items-center text-white text-xs mb-2 font-montserrat">
                          <Building className="w-3 h-3 mr-2 flex-shrink-0" />
                          IFSC Code
                        </label>
                        <input
                          type="text"
                          value={bankDetails.ifscCode}
                          onChange={(e) => handleBankDetailsChange("ifscCode", e.target.value.toUpperCase())}
                          placeholder="ICIC0001234"
                          className="w-full bg-[#2a2a2a] border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#622DBF] font-montserrat text-sm"
                        />
                      </div>

                      {/* Branch Name */}
                      <div>
                        <label className="flex items-center text-white text-xs mb-2 font-montserrat">
                          <MapPin className="w-3 h-3 mr-2 flex-shrink-0" />
                          Branch Name
                        </label>
                        <input
                          type="text"
                          value={bankDetails.branchName}
                          onChange={(e) => handleBankDetailsChange("branchName", e.target.value)}
                          placeholder="Mumbai Central"
                          className="w-full bg-[#2a2a2a] border border-gray-600 rounded-md px-3 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#622DBF] font-montserrat text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-red-400 text-sm font-montserrat leading-relaxed">{error}</p>
          </motion.div>
        )}

        {/* Action Buttons - Mobile Responsive */}
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-end space-y-3 sm:space-y-0 sm:space-x-4">
          {/* Skip CDM for Now - Only show when bank details are NOT complete */}
          {(!isBankDetailsComplete()) && (
            <button
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting || !upiValidation.isValid}
              className="w-full sm:w-auto text-white hover:text-gray-300 font-montserrat text-sm disabled:opacity-50 disabled:cursor-not-allowed text-center py-2 sm:py-0"
            >
              {isSubmitting ? "Saving..." : "Skip CDM for Now"}
            </button>
          )}

          {/* All Done, Let's Go - Only show when bank details ARE complete */}
          {(isBankDetailsComplete()) && (
            <button
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || !upiValidation.isValid}
              className="w-full sm:w-auto text-white hover:text-gray-300 px-6 py-3 rounded-lg bg-[#622DBF] hover:bg-[#7C3AED] font-montserrat text-sm flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>All Done, Let's Go</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}