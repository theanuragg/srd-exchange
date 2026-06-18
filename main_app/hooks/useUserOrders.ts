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
  const { eoaAddress: address } = useWalletManager();

  const fetchOrders = async () => {
    if (!isSignedIn || !address) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/user/orders?walletAddress=${address}`);
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Error fetching user orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [address, isSignedIn]);

  return {
    orders,
    isLoading,
    refetch: fetchOrders
  };
};