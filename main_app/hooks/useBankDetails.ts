import { useState, useEffect } from 'react';
import { useWalletManager } from '@/hooks/useWalletManager';

interface BankDetails {
  id: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  accountHolderName: string;
  createdAt: string;
  updatedAt: string;
}

export const useBankDetails = () => {
  const { eoaAddress: address } = useWalletManager();
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch bank details
  const fetchBankDetails = async () => {
    if (!address) {
      setBankDetails(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 Fetching bank details for wallet:', address);
      
      const response = await fetch(`/api/user/bank-details?walletAddress=${address}`);
      const data = await response.json();

      console.log('📨 Bank details response:', { 
        success: data.success, 
        hasBankDetails: !!data.bankDetails,
        status: response.status 
      });

      if (response.ok && data.success && data.bankDetails) {
        setBankDetails(data.bankDetails);
        console.log('✅ Bank details loaded successfully');
      } else if (response.status === 404) {
        setBankDetails(null);
        console.log('ℹ️ No bank details found for user (404 - expected for new users)');
      } else {
        setBankDetails(null);
        console.log('ℹ️ No bank details found for user');
      }
    } catch (err) {
      console.error('💥 Error fetching bank details:', err);
      setError('Failed to fetch bank details');
      setBankDetails(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Save bank details
  const saveBankDetails = async (details: Omit<BankDetails, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!address) {
      console.error('❌ No wallet address available');
      setError('Wallet not connected');
      return false;
    }

    try {
      console.log('💾 Saving bank details for wallet:', address);
      console.log('💾 Bank details to save:', {
        accountNumber: details.accountNumber.substring(0, 4) + '****',
        ifscCode: details.ifscCode,
        branchName: details.branchName,
        accountHolderName: details.accountHolderName
      });
      
      const response = await fetch('/api/user/bank-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: address, // Don't modify the case - let the API handle it
          ...details
        })
      });

      const data = await response.json();
      
      console.log('📨 Save bank details response:', { 
        success: data.success, 
        message: data.message,
        status: response.status,
        error: data.error 
      });

      if (response.ok && data.success) {
        setBankDetails(data.bankDetails);
        setError(null);
        console.log('✅ Bank details saved successfully');
        return true;
      } else {
        const errorMessage = data.error || 'Failed to save bank details';
        setError(errorMessage);
        console.error('❌ Failed to save bank details:', errorMessage);
        return false;
      }
    } catch (err) {
      console.error('💥 Error saving bank details:', err);
      setError('Failed to save bank details');
      return false;
    }
  };

  // Fetch on component mount or address change
  useEffect(() => {
    if (address) {
      fetchBankDetails();
    } else {
      setBankDetails(null);
      setError(null);
    }
  }, [address]);

  return {
    bankDetails,
    isLoading,
    error,
    saveBankDetails,
    refetch: fetchBankDetails
  };
};