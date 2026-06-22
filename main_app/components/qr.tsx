"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, Delete, X, Loader2, RefreshCw, Clock3 } from "lucide-react";
import { fetchChainAssets, formatBalance, type TokenAsset } from "@/lib/ankrApi";
import { parseAbi, parseUnits, type Address } from "viem";
import { useRates } from "@/hooks/useRates";
import { useWalletManager } from "@/hooks/useWalletManager";
import { sendSponsoredContractWriteDetailed } from "@/lib/sponsoredTransactions";
import { createSignHashWithRetry } from "@/lib/sponsoredSigning";
import {
  QR_PAY_MAX_INR,
  QR_PAY_MIN_INR,
  validateQrPayInrAmount,
} from "@/lib/qr-pay-limits";

const FALLBACK_EXCHANGE_RATE = 85.6;
const NETWORK_FEE_USDT = 0.05;
const ADMIN_WALLET = "0xA4c9991e1bA3F4aeB0D360186Ba6f8f7c66cC2BF";
const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
const BSC_CHAIN_ID = 56;
const ORDER_REFRESH_MS = 5000;
const PENDING_GIFS = [
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZ3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKTDn976rzVgky4/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZ3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/l3vQYbeM7W9r945x6/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZ3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/uIJBFZoOaOrZJWLxQq/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZ3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4Z3R4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/h8S9M7U6I3YyY/giphy.gif"
];

const USDT_ABI = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);

const keypadKeys = [
  "1", "2", "3",
  "4", "5", "6",
  "7", "8", "9",
  ".", "0", "backspace",
] as const;

function QrGlyph() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="h-full w-full">
      <rect width="64" height="64" rx="12" fill="#f3e8ff" />
      <rect x="8" y="8" width="16" height="16" rx="2" fill="#181221" />
      <rect x="12" y="12" width="8" height="8" rx="1" fill="#f3e8ff" />
      <rect x="40" y="8" width="16" height="16" rx="2" fill="#181221" />
      <rect x="44" y="12" width="8" height="8" rx="1" fill="#f3e8ff" />
      <rect x="8" y="40" width="16" height="16" rx="2" fill="#181221" />
      <rect x="12" y="44" width="8" height="8" rx="1" fill="#f3e8ff" />
      <rect x="29" y="10" width="4" height="4" rx="1" fill="#181221" />
      <rect x="35" y="10" width="4" height="10" rx="1" fill="#181221" />
      <rect x="28" y="18" width="10" height="4" rx="1" fill="#181221" />
      <rect x="28" y="28" width="4" height="4" rx="1" fill="#181221" />
      <rect x="34" y="26" width="4" height="10" rx="1" fill="#181221" />
      <rect x="40" y="28" width="4" height="4" rx="1" fill="#181221" />
      <rect x="46" y="28" width="4" height="10" rx="1" fill="#181221" />
      <rect x="26" y="34" width="6" height="4" rx="1" fill="#181221" />
      <rect x="26" y="40" width="4" height="4" rx="1" fill="#181221" />
      <rect x="32" y="40" width="4" height="10" rx="1" fill="#181221" />
      <rect x="38" y="40" width="4" height="4" rx="1" fill="#181221" />
      <rect x="44" y="40" width="4" height="4" rx="1" fill="#181221" />
      <rect x="40" y="46" width="10" height="4" rx="1" fill="#181221" />
      <rect x="52" y="40" width="4" height="10" rx="1" fill="#181221" />
      <rect x="26" y="52" width="4" height="4" rx="1" fill="#181221" />
      <rect x="44" y="52" width="4" height="4" rx="1" fill="#181221" />
    </svg>
  );
}

function formatUsdtBase(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return "0.00";
  return (Math.floor(amount * 100) / 100).toFixed(2);
}

function formatUsdtTotal(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return "0.000";
  return (Math.floor(amount * 1000) / 1000).toFixed(3);
}

function calculateQrUsdtAmounts(inrAmount: number, sellRate: number) {
  if (!Number.isFinite(inrAmount) || inrAmount <= 0 || !Number.isFinite(sellRate) || sellRate <= 0) {
    return { base: 0, total: 0, baseFormatted: "0.00", totalFormatted: "0.000", transferAmount: "0" };
  }
  const base = inrAmount / sellRate;
  const total = base + NETWORK_FEE_USDT;
  return {
    base,
    total,
    baseFormatted: formatUsdtBase(base),
    totalFormatted: formatUsdtTotal(total),
    transferAmount: total.toFixed(6),
  };
}

function getDisplayFontSize(amount: string) {
  const len = amount.length;
  if (len <= 2) return "clamp(2.25rem, 14vw, 5rem)";
  if (len <= 4) return "clamp(1.75rem, 11vw, 4rem)";
  if (len <= 6) return "clamp(1.5rem, 9vw, 3rem)";
  if (len <= 8) return "clamp(1.125rem, 7vw, 2rem)";
  return "clamp(0.75rem, 5vw, 1.25rem)";
}

function getQrBoxSize() {
  if (typeof window === "undefined") return 220;
  const side = Math.min(window.innerWidth, window.innerHeight) - 56;
  return Math.max(160, Math.min(280, Math.floor(side * 0.72)));
}

function extractUpiId(text: string): string | null {
  if (!text) return null;
  const m = text.match(/[?&]pa=([^&]+)/i);
  if (m?.[1]) { const d = decodeURIComponent(m[1]); if (d.includes("@")) return d; }
  const u = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+)/);
  return u?.[1] ?? null;
}

const TELEGRAM_GROUP_URL = "https://telegram.me/SrdExchangeGlobal";
const QR_PERSONAL_ACCOUNT_WARNING_EN =
  "Warning: This QR pay flow is only for merchant and business payments. Do not use it for personal transfers.";
const QR_PERSONAL_ACCOUNT_WARNING_HI =
  "चेतावनी: यह QR पेमेंट केवल merchant या business payment के लिए है. Personal transfer के लिए इसका उपयोग न करें.";

export default function QR() {
  const { eoaAddress, smartWalletAddress, shouldSkipInitCode, signHash, isSmartAccountReady } = useWalletManager();
  const { getSellRate } = useRates();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("0");
  const [screen, setScreen] = useState<"amount" | "processing" | "scan" | "pending" | "success">("amount");
  const [featureEnabled, setFeatureEnabled] = useState(false);
  const [featureLoading, setFeatureLoading] = useState(true);
  const [showOfflineNotice, setShowOfflineNotice] = useState(false);
  const [showPersonalAccountWarning, setShowPersonalAccountWarning] = useState(false);
  const [scannedUpiId, setScannedUpiId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionData, setTransactionData] = useState<any>(null);
  const [isScannerLoading, setIsScannerLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanError, setScanError] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [walletAssetsLoading, setWalletAssetsLoading] = useState(false);
  const [walletAssetsError, setWalletAssetsError] = useState("");
  const [usdtAsset, setUsdtAsset] = useState<TokenAsset | null>(null);
  const [orderRefreshError, setOrderRefreshError] = useState("");
  const [isRefreshingOrder, setIsRefreshingOrder] = useState(false);
  const [lastStatusCheck, setLastStatusCheck] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(ORDER_REFRESH_MS / 1000);

  const videoRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const scannerRef = useRef<any>(null);
  const activeTransactionRef = useRef<any>(null);

  // Sync ref with state
  useEffect(() => {
    activeTransactionRef.current = transactionData;
  }, [transactionData]);

  const sellRate = getSellRate("UPI") || FALLBACK_EXCHANGE_RATE;
  const displayAmount = amount.endsWith(".") ? amount.slice(0, -1) || "0" : amount;
  const inrAmount = useMemo(() => {
    const n = Number.parseFloat(displayAmount || "0");
    return Number.isFinite(n) ? n : 0;
  }, [displayAmount]);
  const qrUsdt = useMemo(() => calculateQrUsdtAmounts(inrAmount, sellRate), [inrAmount, sellRate]);
  const usdtBaseAmount = qrUsdt.baseFormatted;
  const usdtTotalAmount = qrUsdt.totalFormatted;
  const usdtTransferAmount = qrUsdt.transferAmount;
  const displayFontSize = useMemo(() => getDisplayFontSize(displayAmount), [displayAmount]);
  const hasValidAmount = inrAmount > 0;
  const amountLimitValidation = useMemo(
    () => (hasValidAmount ? validateQrPayInrAmount(inrAmount) : { valid: false as const }),
    [inrAmount, hasValidAmount]
  );
  const isWithinAmountLimit = amountLimitValidation.valid;
  const requiredUsdt = qrUsdt.total;
  const availableUsdt = Number.parseFloat(usdtAsset?.balance || "0");
  const hasSufficientBalance = availableUsdt >= requiredUsdt;
  const canProceedToPay = isWithinAmountLimit && hasSufficientBalance;

  useEffect(() => {
    if (smartWalletAddress) setWalletAddress(smartWalletAddress);
  }, [smartWalletAddress]);

  useEffect(() => {
    if (!showPersonalAccountWarning) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowPersonalAccountWarning(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showPersonalAccountWarning]);

  const handleQrTriggerClick = () => {
    setShowPersonalAccountWarning(true);
    if (featureLoading || !featureEnabled) {
      setShowOfflineNotice(true);
      return;
    }
    setShowOfflineNotice(false);
    setScreen("amount");
    setIsOpen(true);
  };

  useEffect(() => {
    let ignore = false;

    async function loadWalletAssets() {
      if (!walletAddress) {
        setUsdtAsset(null);
        setWalletAssetsError("");
        return;
      }

      try {
        setWalletAssetsLoading(true);
        setWalletAssetsError("");
        const assets = await fetchChainAssets(walletAddress, BSC_CHAIN_ID);
        const matchedUsdt = assets.find((asset) =>
          asset.contractAddress?.toLowerCase() === USDT_ADDRESS.toLowerCase() || asset.symbol?.toUpperCase() === "USDT"
        ) ?? null;
        if (!ignore) setUsdtAsset(matchedUsdt);
      } catch (err: any) {
        if (!ignore) {
          setUsdtAsset(null);
          setWalletAssetsError(err?.message || "Failed to load wallet balance");
        }
      } finally {
        if (!ignore) setWalletAssetsLoading(false);
      }
    }

    loadWalletAssets();
    return () => { ignore = true; };
  }, [walletAddress, isOpen]);

  // Feature flag
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        setFeatureLoading(true);
        const res = await fetch("/api/feature-flags/qr-scan-pay", { cache: "no-store" });
        const data = await res.json();
        if (!ignore) setFeatureEnabled(Boolean(data?.enabled));
      } catch {
        if (!ignore) setFeatureEnabled(false);
      } finally {
        if (!ignore) setFeatureLoading(false);
      }
    };
    load();
    return () => { ignore = true; };
  }, []);

  // Scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      triggerRef.current?.focus();
    };
  }, [isOpen]);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => { void stopScan(); };
  }, []);

  useEffect(() => {
    if (screen !== "pending" || !transactionData?.fullId) return;

    void refreshTransactionStatus(false);
    
    // Countdown timer for refresh
    const countdownInterval = window.setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? ORDER_REFRESH_MS / 1000 : prev - 1));
    }, 1000);

    const interval = window.setInterval(() => {
      void refreshTransactionStatus(false);
    }, ORDER_REFRESH_MS);

    return () => {
      window.clearInterval(interval);
      window.clearInterval(countdownInterval);
    };
  }, [screen, transactionData?.fullId]);

  const stopScan = async () => {
    if (scannerRef.current) {
      try {
        console.log("🛑 Stopping QR scanner...");
        await scannerRef.current.stop();
        console.log("✅ Scanner stopped");
      } catch (err) {
        console.warn("⚠️ Error stopping scanner:", err);
      } finally {
        scannerRef.current = null;
        setIsScannerLoading(false);
      }
    }
  };

  const refreshTransactionStatus = async (showLoader = true) => {
    if (!transactionData?.fullId) return;

    try {
      if (showLoader) setIsRefreshingOrder(true);
      setOrderRefreshError("");

      const res = await fetch(`/api/qr-transactions/${transactionData.fullId}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || !data?.success || !data?.transaction) {
        throw new Error(data?.error || "Failed to refresh QR transaction");
      }

      setTransactionData(data.transaction);
      setLastStatusCheck(new Date());

      if (data.transaction.status === "COMPLETED") {
        setScreen("success");
        return;
      }

      if (data.transaction.status === "CANCELLED") {
        setOrderRefreshError("This QR payment was rejected by admin. Please start again.");
      }
    } catch (err: any) {
      setOrderRefreshError(err?.message || "Failed to refresh payment status");
    } finally {
      if (showLoader) setIsRefreshingOrder(false);
    }
  };

  const startScan = async () => {
    setScanError("");
    setIsScannerLoading(true);
    console.log("🎥 Starting QR scanner...");
    
    try {
      // Ensure any previous instance is dead
      await stopScan();

      // Wait for DOM to be ready
      let element = document.getElementById("qr-reader");
      if (!element) {
        // Retry once after a short delay
        await new Promise(resolve => setTimeout(resolve, 300));
        element = document.getElementById("qr-reader");
      }

      if (!element) {
        throw new Error("Scanner display area not ready. Please try again.");
      }

      console.log("✅ QR reader element found, initializing camera...");

      const { Html5Qrcode } = await import("html5-qrcode");
      const qr = new Html5Qrcode("qr-reader", false);
      scannerRef.current = qr;

      console.log("📹 Starting camera stream...");

      await qr.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (() => {
            const size = getQrBoxSize();
            return { width: size, height: size };
          })(),
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (text: string) => {
          console.log("📸 QR detected:", text);
          const upiId = extractUpiId(text);
          if (upiId) {
            console.log("✅ Valid UPI ID extracted:", upiId);
            void stopScan();
            void handleUpiScanned(upiId);
          } else {
            console.warn("⚠️ QR code detected but no valid UPI ID found");
            setScanError("QR detected, but no valid UPI ID was found. Try another angle.");
          }
        },
        (errorMessage) => {
          // Suppress repetitive error logs
          if (errorMessage && !errorMessage.includes("NotFound")) {
            // console.debug("📸 Camera scanning:", errorMessage);
          }
        }
      );

      console.log("✅ Camera stream started successfully");
      setIsScannerLoading(false);
    } catch (err: any) {
      console.error("❌ QR scan error:", err);
      const errorMsg = err?.message || String(err);
      setIsScannerLoading(false);

      if (errorMsg.includes("NotAllowedError") || errorMsg.includes("camera")) {
        setScanError("Camera permission denied. Please check browser permissions.");
      } else if (errorMsg.includes("NotFoundError")) {
        setScanError("No camera found on this device.");
      } else if (errorMsg.includes("NotReadableError")) {
        setScanError("Camera is in use or not accessible. Try closing other apps.");
      } else {
        setScanError(`Camera failed to load. Please click retry.`);
      }
    }
  };

  const handleClose = () => {
    void stopScan();
    setIsOpen(false);
    setScreen("amount");
    setAmount("0");
    setScannedUpiId("");
    setTransactionData(null);
    setError("");
    setScanError("");
    setOrderRefreshError("");
    setIsRefreshingOrder(false);
    setLastStatusCheck(null);
  };

  const handleKeyPress = (key: (typeof keypadKeys)[number]) => {
    if (key === "backspace") {
      setAmount(c => {
        const n = c.slice(0, -1);
        return n === "" || n === "-" ? "0" : n;
      });
      return;
    }
    if (key === ".") { setAmount(c => c.includes(".") ? c : `${c}.`); return; }
    setAmount(c => {
      if (c === "0") return key;
      const [w = "", d = ""] = c.split(".");
      if (d.length >= 2 && c.includes(".")) return c;
      const next = `${c}${key}`;
      const parsed = Number.parseFloat(next);
      if (Number.isFinite(parsed) && parsed > QR_PAY_MAX_INR) return c;
      return next;
    });
  };

  const handleUpiScanned = async (upiId: string) => {
    setScannedUpiId(upiId);
    const currentTransaction = activeTransactionRef.current || transactionData;
    
    if (currentTransaction?.fullId) {
      try {
        console.log(`📤 Saving merchant UPI on QR transaction ${currentTransaction.fullId}: ${upiId}`);
        const res = await fetch(`/api/qr-transactions/${currentTransaction.fullId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scannedUpiId: upiId }),
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to save merchant UPI");
        }

        const data = await res.json();
        console.log("✅ QR transaction updated with merchant UPI", data.transaction);
        
        activeTransactionRef.current = data.transaction;
        setTransactionData(data.transaction);
        
        setScreen("pending");
        void refreshTransactionStatus(false);
      } catch (err: any) {
        console.error("❌ Failed to save merchant UPI:", err);
        setScanError(err?.message || "Failed to save merchant UPI ID");
      }
    } else {
      console.error("❌ Cannot save UPI: No active QR transaction found");
    }
  };

  const sendSponsoredUsdt = async (): Promise<{ userOpHash: `0x${string}`; transactionHash: `0x${string}` }> => {
    if (!smartWalletAddress) throw new Error("Smart wallet not connected");
    if (!eoaAddress) throw new Error("EOA not connected");

    console.log("🏁 sendSponsoredUsdt starting", { smartWalletAddress, usdtTransferAmount });

    return sendSponsoredContractWriteDetailed({
      smartAccountAddress: smartWalletAddress as Address,
      eoaAddress: eoaAddress as Address,
      chainId: BSC_CHAIN_ID,
      address: USDT_ADDRESS as `0x${string}`,
      abi: USDT_ABI,
      functionName: "transfer",
      args: [ADMIN_WALLET as `0x${string}`, parseUnits(usdtTransferAmount, 18)],
      skipInitCode: shouldSkipInitCode,
    }, createSignHashWithRetry(signHash));
  };

  const handleConfirmPay = async () => {
    setError("");
    setIsProcessing(true);
    setScreen("processing");

    try {
      if (!smartWalletAddress) throw new Error("Wallet not connected. Please reconnect your wallet.");
      if (!isSmartAccountReady) throw new Error("Smart account is not ready yet. Please wait or reconnect.");
      const limitCheck = validateQrPayInrAmount(inrAmount);
      if (!limitCheck.valid) {
        throw new Error(limitCheck.error || `Amount must be between ₹${QR_PAY_MIN_INR} and ₹${QR_PAY_MAX_INR.toLocaleString("en-IN")}.`);
      }
      if (!hasSufficientBalance) {
        throw new Error(`Insufficient USDT balance. You need at least ${requiredUsdt.toFixed(2)} USDT (including ${NETWORK_FEE_USDT} fee).`);
      }
      if (qrUsdt.base <= 0) {
        throw new Error("Invalid amount. Please enter a higher value.");
      }

      console.log("🚀 Starting payment flow...", {
        amount: displayAmount,
        usdtBase: usdtBaseAmount,
        usdtTotal: usdtTotalAmount,
      });
      const { userOpHash, transactionHash } = await sendSponsoredUsdt();
      console.log("✅ Payment transaction successful", { userOpHash, transactionHash });

      const payload = {
        chainId: BSC_CHAIN_ID,
        walletAddress: smartWalletAddress,
        linkedEoaAddress: eoaAddress,
        amount: String(Number.parseFloat(displayAmount)),
        usdtAmount: String(qrUsdt.base),
        sellRate,
        userOpHash,
        transactionHash,
      };

      console.log("📝 Creating QR transaction on server...", payload);
      const createTransaction = async () => {
        const res = await fetch("/api/qr-transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Server error: ${res.status}`);
        }
        const data = await res.json();
        if (!data.success || !data.transaction) {
          throw new Error(data.error || "Failed to create QR transaction");
        }
        return data.transaction;
      };

      const transaction = await createTransaction();
      console.log("✅ QR transaction created successfully", transaction);
      activeTransactionRef.current = transaction;
      setTransactionData(transaction);

      setScreen("scan");
      // Give DOM time to render the qr-reader element before starting camera
      setTimeout(() => startScan(), 500);
    } catch (err: any) {
      const displayMessage = err?.message || "Payment failed. Please try again.";
      console.error("❌ Payment workflow failed:", err);
      setError(displayMessage);
      setScreen("amount");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTelegramClick = () => {
    window.open(TELEGRAM_GROUP_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div className="mx-auto flex w-full max-w-sm justify-center px-6 py-6 sm:py-8">
        <button
          ref={triggerRef}
          type="button"
          onClick={handleQrTriggerClick}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls="scan-pay-dialog"
          className="group relative flex aspect-square w-[96px] items-center justify-center rounded-full bg-[#08080c] shadow-[0_0_0_1px_rgba(158,93,255,0.22),0_0_0_4px_rgba(147,51,234,0.05),0_0_18px_rgba(147,51,234,0.16)] transition-transform duration-150 ease-out hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9f67ff] focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-[0.98] sm:w-[108px]"
        >
          <div className="absolute inset-[3px] rounded-full border border-white/6" />
          <div className="absolute inset-[6px] rounded-full border border-[#9a5dff]/45" />
          <div className="flex flex-col items-center gap-1">
            <div className="relative h-[44px] w-[44px] sm:h-[48px] sm:w-[48px]">
              <div className="absolute left-0 top-0 h-3 w-3 rounded-tl-md border-l-[3px] border-t-[3px] border-[#9a5dff] drop-shadow-[0_0_6px_rgba(154,93,255,0.7)]" />
              <div className="absolute right-0 top-0 h-3 w-3 rounded-tr-md border-r-[3px] border-t-[3px] border-[#9a5dff] drop-shadow-[0_0_6px_rgba(154,93,255,0.7)]" />
              <div className="absolute bottom-0 left-0 h-3 w-3 rounded-bl-md border-b-[3px] border-l-[3px] border-[#9a5dff] drop-shadow-[0_0_6px_rgba(154,93,255,0.7)]" />
              <div className="absolute bottom-0 right-0 h-3 w-3 rounded-br-md border-b-[3px] border-r-[3px] border-[#9a5dff] drop-shadow-[0_0_6px_rgba(154,93,255,0.7)]" />
              <div className="absolute inset-[8px] shadow-[0_0_10px_rgba(243,232,255,0.14)]">
                <QrGlyph />
              </div>
            </div>
            <p className="text-center text-[0.6rem] font-semibold tracking-[-0.04em] text-white [text-shadow:0_0_10px_rgba(255,255,255,0.16)] sm:text-[0.7rem]">
              QR Scan &amp; Pay
            </p>
          </div>
        </button>
      </div>

      {showPersonalAccountWarning && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-personal-account-warning-title"
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          onClick={() => setShowPersonalAccountWarning(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl border border-amber-400/35 bg-[#1a1a1f] px-5 py-5 shadow-[0_18px_60px_rgba(0,0,0,0.65)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowPersonalAccountWarning(false)}
              aria-label="Close"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="pr-6 pt-1">
              <p
                id="qr-personal-account-warning-title"
                className="text-center text-[0.78rem] font-semibold leading-snug text-amber-50 sm:text-[0.84rem]"
              >
                {QR_PERSONAL_ACCOUNT_WARNING_EN}
              </p>
              <p className="mt-2 text-center text-[0.72rem] font-medium leading-snug text-amber-100/90 sm:text-[0.78rem]">
                {QR_PERSONAL_ACCOUNT_WARNING_HI}
              </p>
            </div>
          </div>
        </div>
      )}

      {showOfflineNotice && (
        <div className="mx-auto -mt-2 flex w-full max-w-sm justify-center px-6 pb-4">
          <div className="rounded-full border border-red-500/30 bg-red-500/10 px-5 py-2 text-sm font-semibold text-red-300 shadow-[0_10px_24px_rgba(0,0,0,0.25)]">
            Offline
          </div>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 px-0 py-0 sm:flex sm:items-center sm:justify-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="scan-pay-title" id="scan-pay-dialog">
          <div className="relative flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-black text-white sm:h-auto sm:max-h-none sm:min-h-[820px] sm:max-w-[390px] sm:rounded-[2rem] sm:border sm:border-white/10 sm:shadow-[0_18px_60px_rgba(0,0,0,0.65)]">
            <div className="border-y border-white/10 bg-[#111113] px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image src="/srd.jpg" alt="SRD Exchange" width={34} height={34} className="h-[34px] w-[34px] rounded-full object-cover" />
                  <h2 id="scan-pay-title" className="text-[1.08rem] font-medium tracking-[-0.02em] text-white/95">
                    {screen === "success" ? "SRD.Exchange" : "Scan & Pay"}
                  </h2>
                </div>
                {screen === "success" ? (
                  <p className="text-[0.82rem] font-medium text-white/45">QR Pay: {transactionData?.id || "..."}</p>
                ) : (
                  <button ref={closeRef} type="button" onClick={handleClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#17181d] text-white/70 hover:bg-[#1f2026] hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Amount Screen */}
            {screen === "amount" && (
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] pt-3 sm:px-4 sm:pb-16 sm:pt-5">
                <div className="mx-auto flex  max-w-full flex-col items-center gap-1 rounded-md  px-3 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:px-5">
                  <div className="flex flex-row flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
                  <p className="text-[0.72rem] font-semibold text-white/80">Available</p>
                  {walletAssetsLoading ? (
                    <p className="text-[0.78rem] font-medium text-white/60">Loading balance...</p>
                  ) : walletAssetsError ? (
                    <p className="text-[0.78rem] font-medium text-red-300">{walletAssetsError}</p>
                  ) : (
                    <p className="text-[0.7rem] font-medium text-white/55">
                      {formatBalance(usdtAsset?.balance || "0", usdtAsset?.decimals)} USDT
                    </p>
                  )}
                  </div>
                </div>

                <div className="flex min-h-[7.5rem] flex-1 flex-col items-stretch justify-center gap-3 py-3 sm:min-h-[10rem] sm:gap-4 sm:py-6">
                  <div className="flex w-full items-start justify-between gap-2 px-0.5 sm:px-2">
                    <div className="min-w-0 max-w-[58%] text-right"></div>
                  </div>
                   <div className="relative flex w-full min-w-0 items-center justify-center gap-[2px] px-1">
                    <span className="text-xl font-semibold -top-2  left-32 absolute  leading-none tracking-[-0.06em] text-white sm:text-[2rem]">₹</span>
                    <p
                      className="max-w-full truncate text-center font-medium leading-none tracking-[-0.12em] text-white tabular-nums"
                      style={{ fontSize: displayFontSize }}
                    >
                      {displayAmount}
                    </p>
                    <div className="absolute inset-y-0 right-1 flex flex-col items-end justify-between py-0.5">
                      <p className="truncate text-[0.78rem] font-semibold text-[#9d76ff] sm:text-[0.9rem]">
                        + {NETWORK_FEE_USDT.toFixed(2)} USDT fee
                      </p>
                      <p className="truncate text-[0.7rem] font-semibold text-white/90 sm:text-[0.75rem]">
                        = {usdtTotalAmount} USDT
                      </p>
                    </div>
                  </div>
                  
                </div>

                {error && (
                  <div className="mb-4 flex items-center gap-2 rounded-[0.2rem] border border-red-500/20 bg-red-500/10 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                    <AlertCircle className="h-5 w-5 shrink-0 fill-red-500 text-black" />
                    <p className="text-[0.78rem] font-medium leading-5 text-red-200">
                      {error}
                    </p>
                  </div>
                )}

                {hasValidAmount && !isWithinAmountLimit && amountLimitValidation.error && (
                  <div className="mb-3 flex items-center gap-2 rounded-[0.2rem] border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 sm:mb-4 sm:px-4 sm:py-3">
                    <AlertCircle className="h-5 w-5 shrink-0 fill-amber-400 text-black" />
                    <p className="text-[0.72rem] font-medium leading-5 text-amber-100 sm:text-[0.78rem]">
                      {amountLimitValidation.error}
                    </p>
                  </div>
                )}

                <div className="mb-3 flex shrink-0 items-center gap-2 rounded-[0.2rem] border border-white/5 bg-[#171717] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:mb-4 sm:px-4 sm:py-3">
                  <AlertCircle className="h-5 w-5 shrink-0 fill-[#f14336] text-black sm:h-6 sm:w-6" />
                  <p className="text-[0.72rem] leading-5 text-white/80 sm:text-[0.78rem]">
                    Please only Ask Bill/payable Amount, Don&apos;t ask QR!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleConfirmPay}
                  disabled={isProcessing || !canProceedToPay}
                  className="mb-3 h-10 w-full shrink-0 rounded-2xl bg-[linear-gradient(90deg,#8f63ff_0%,#5a35b0_100%)] text-[0.95rem] font-semibold tracking-[-0.02em] text-white shadow-[0_10px_30px_rgba(103,69,190,0.35)] transition-transform hover:brightness-110 disabled:opacity-50 sm:mb-4 sm:text-[1rem]"
                >
                  Proceed to Pay
                </button>
                <div className="grid shrink-0 grid-cols-3 gap-1.5 sm:gap-2">
                  {keypadKeys.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleKeyPress(key)}
                      aria-label={key === "backspace" ? "Delete" : `Enter ${key}`}
                      className="flex h-10 min-h-[36px] items-center justify-center rounded-2xl bg-[#171717] text-xl font-medium text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:bg-[#1d1d1d] sm:h-[44px] sm:text-[2rem]"
                    >
                      {key === "backspace" ? <Delete className="h-6 w-6 sm:h-7 sm:w-7" /> : key}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Processing Screen */}
            {screen === "processing" && (
              <div className="flex flex-1 flex-col items-center justify-center px-4">
                <Loader2 className="h-16 w-16 animate-spin text-[#8f63ff]" />
                <h3 className="mt-6 text-xl font-semibold text-white">Processing...</h3>              </div>
            )}

            {/* Scan Screen */}
            {screen === "scan" && (
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto border-t border-white/6 bg-[radial-gradient(circle_at_center,rgba(94,60,196,0.16)_0%,rgba(17,17,19,0.05)_42%,rgba(0,0,0,0)_72%)] px-4 pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] pt-5 sm:px-5 sm:pb-16 sm:pt-7">
                <h3 className="pb-3 text-center text-[1rem] font-medium tracking-[-0.03em] text-white/95 sm:pb-4 sm:text-[1.15rem]">Scan Merchant QR</h3>
                <div className="relative mx-auto mt-1 flex aspect-square w-full max-w-[min(290px,85vw)] items-center justify-center">
                  <div
                    id="qr-reader"
                    ref={videoRef}
                    className="aspect-square w-full overflow-hidden rounded-[1rem] bg-black [&_video]:!h-full [&_video]:!w-full [&_video]:object-cover"
                  />
                  {isScannerLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[1rem] bg-black/80">
                      <Loader2 className="h-10 w-10 animate-spin text-[#8f63ff]" />
                      <p className="mt-3 text-xs font-medium text-white/60">Starting camera...</p>
                    </div>
                  )}
                </div>
                <div className="mx-auto mt-4 w-full max-w-[300px] space-y-4">
                  {scanError && (
                    <div className="flex flex-col gap-3">
                      <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-center text-sm text-red-300">
                        {scanError}
                      </div>
                      <button
                        type="button"
                        onClick={() => void startScan()}
                        className="flex items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-sm font-semibold text-white hover:bg-white/10"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Retry Camera
                      </button>
                    </div>
                  )}
                </div>
                <div className="mx-auto mt-5 w-full max-w-[min(300px,100%)] space-y-3 text-[0.82rem] font-medium text-white/82 sm:mt-8 sm:space-y-4 sm:text-[0.92rem]">
                  <div className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-[#8f63ff] shadow-[0_0_10px_rgba(143,99,255,0.6)]" /><span>Scan QR from vendor</span></div>
                  <div className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-[#8f63ff] shadow-[0_0_10px_rgba(143,99,255,0.6)]" /><span>Move closer for better reading</span></div>
                  <div className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full bg-[#8f63ff] shadow-[0_0_10px_rgba(143,99,255,0.6)]" /><span>Don&apos;t go back. Amount can&apos;t be changed</span></div>
                </div>
              </div>
            )}

            {screen === "pending" && (
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[radial-gradient(circle_at_50%_20%,rgba(143,99,255,0.18)_0%,rgba(18,18,22,0.3)_32%,rgba(0,0,0,0)_62%)] px-4 pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] pt-6 sm:px-5 sm:pb-8 sm:pt-8">
                <div className="mx-auto mt-5 w-full max-w-[320px] rounded-[1.2rem] border border-white/10 bg-[#121216]/92 p-4 text-sm text-white/72">
                  <p className="font-semibold text-white/92">QR Pay {transactionData?.id || "..."}</p>
                </div>

                <div className="mx-auto mt-6 w-full max-w-[320px] overflow-hidden rounded-[1.5rem]  p-3 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
                  <img
                    src="/animation.svg"
                    alt="Waiting animation"
                    className="h-[min(260px,35dvh)] w-full rounded-[1rem] object-contain"
                  />
                </div>

                {orderRefreshError && (
                  <div className="mx-auto mt-4 w-full max-w-[320px] rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {orderRefreshError}
                  </div>
                )}

                <div className="mx-auto mt-auto flex w-full max-w-[320px] flex-col gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => void refreshTransactionStatus(true)}
                    disabled={isRefreshingOrder}
                    className="flex h-14 w-full items-center justify-center gap-3 rounded-[1.2rem] bg-[linear-gradient(90deg,#7c5bdf_0%,#5e2db3_48%,#38116e_100%)] px-5 text-[0.96rem] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_24px_rgba(67,24,145,0.36)] hover:brightness-110 disabled:opacity-60"
                  >
                    <RefreshCw className={`h-5 w-5 ${isRefreshingOrder ? "animate-spin" : ""}`} />
                    <span>{isRefreshingOrder ? "Refreshing..." : "Refresh status"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="h-14 w-full rounded-[1.2rem] border border-white/10 bg-[#17181d] text-[1rem] font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.2)] hover:bg-[#1f2026]"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Success Screen */}
            {screen === "success" && (
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[radial-gradient(circle_at_50%_22%,rgba(166,255,121,0.11)_0%,rgba(22,22,26,0.22)_24%,rgba(0,0,0,0)_54%)] pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] sm:pb-4">
                <div className="flex flex-1 flex-col">
                  <div className="flex flex-col items-center px-6 pb-6 pt-8">
                    <div className="relative flex h-[126px] w-[126px] items-center justify-center rounded-full border-[4px] border-[#b7ff8e] shadow-[0_0_24px_rgba(183,255,142,0.18)]">
                      <Check className="h-16 w-16 stroke-[4] text-[#d8ffbc]" />
                    </div>
                    <h3 className="pt-6 text-[1.2rem] font-medium tracking-[-0.03em] text-white/95">Payment Completed</h3>
                  </div>
                  <div className="mx-4 rounded-[0.2rem] border-x border-t border-white/7 bg-[#121216]/90 px-4 py-3 text-center">
                    <p className="text-[1.12rem] font-medium tracking-[-0.03em] text-[#b7e88f]">₹ {Number.parseFloat(displayAmount || "0").toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="pt-1 text-[0.9rem] font-medium text-white/70">
                      = {usdtTotalAmount} USDT sent ({usdtBaseAmount} + {NETWORK_FEE_USDT.toFixed(2)} fee)
                    </p>
                    <p className="pt-2 text-xs text-white/50">Merchant: {transactionData?.scannedUpiId || scannedUpiId}</p>
                  </div>
                  <div className="min-h-[100px] flex-1" />
                </div>
                <div className="px-4 pb-8 pt-4">
                  <div className="mb-5 flex items-start gap-2.5 rounded-[0.2rem] bg-[#121216]/92 px-4 py-3 text-white/72">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 fill-[#f14336] text-black" />
                    <p className="text-[0.82rem] font-medium leading-5">
                      Ask merchant to give payment screenshot in group, if needed?
                    </p>
                  </div>
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleTelegramClick}
                      className="flex h-14 w-full items-center justify-center gap-3 rounded-[1.8rem] bg-[linear-gradient(90deg,#7c5bdf_0%,#5e2db3_48%,#38116e_100%)] px-5 text-[0.96rem] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_24px_rgba(67,24,145,0.36)] hover:brightness-110"
                    >
                      <Image src="/telegram.svg" alt="" width={26} height={26} className="h-7 w-7" />
                      <span>Ask Screenshot in Group</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="h-14 w-full rounded-[1.8rem] bg-[linear-gradient(90deg,#7c5bdf_0%,#5e2db3_48%,#38116e_100%)] text-[1rem] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_10px_24px_rgba(67,24,145,0.36)] hover:brightness-110"
                    >
                      Back
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
