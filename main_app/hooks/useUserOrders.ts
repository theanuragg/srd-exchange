import { useState, useEffect } from 'react';
import { useIsSignedIn } from '@coinbase/cdp-hooks';
import { useWalletManager } from '@/hooks/useWalletManager';

interface Order {
  id: string;
  fullId: string;
  time: string;
  amount: number;
  type: string;
  orderType: string;
  price: number;
  currency: string;
  status: string;
  user: {
    id: string;
    walletAddress: string;
    upiId: string | null;
    bankDetails: any;
  };
  createdAt: string;
}

export const useUserOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isSignedIn } = useIsSignedIn();
  const { address, eoaAddress } = useWalletManager();

  useEffect(() => {
    let cancelled = false;

    const fetchOrders = async () => {
      if (!isSignedIn || (!address && !eoaAddress)) {
        setOrders([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const primaryAddress = address || eoaAddress;
        const response = await fetch(`/api/user/orders?walletAddress=${primaryAddress}&eoaAddress=${eoaAddress || ''}`);
        const data = await response.json();
        
        if (!cancelled && data.success) {
          setOrders(data.orders);
        }
      } catch (error) {
        if (!cancelled) console.error('Error fetching user orders:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchOrders();
    return () => { cancelled = true; };
  }, [address, eoaAddress, isSignedIn]);

  const refetch = () => {
    setIsLoading(true);
    const primaryAddress = address || eoaAddress;
    if (!isSignedIn || !primaryAddress) {
      setOrders([]);
      setIsLoading(false);
      return Promise.resolve();
    }
    return fetch(`/api/user/orders?walletAddress=${primaryAddress}&eoaAddress=${eoaAddress || ''}`)
      .then(res => res.json())
      .then(data => { if (data.success) setOrders(data.orders); })
      .finally(() => setIsLoading(false));
  };

  return {
    orders,
    isLoading,
    refetch
  };
};