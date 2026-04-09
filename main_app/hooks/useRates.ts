'use client'

import { useState, useEffect, useCallback } from 'react';

interface Rate {
  buyRate: number;
  sellRate: number;
  currency: 'UPI' | 'CDM';
  updatedAt?: string;
}

export const useRates = () => {
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRates = useCallback(async () => {
    try {
      console.log('Fetching latest rates...');
      const response = await fetch('/api/rates', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const data = await response.json();
      
      if (data.rates) {
        console.log('Rates fetched:', data.rates);
        setRates(data.rates);
      }
    } catch (error) {
      console.error('Error fetching rates:', error);
      // Fallback rates
      setRates([
        { buyRate: 84.5, sellRate: 84.0, currency: 'UPI' },
        { buyRate: 84.3, sellRate: 83.8, currency: 'CDM' }
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
    
    // Set up polling for rate updates every 30 seconds
    const interval = setInterval(fetchRates, 30000);
    
    // Listen for manual rate update events
    const handleRateUpdate = () => {
      fetchRates();
    };
    
    window.addEventListener('ratesUpdated', handleRateUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('ratesUpdated', handleRateUpdate);
    };
  }, [fetchRates]);

  const getBuyRate = (currency: 'UPI' | 'CDM') => {
    const rate = rates.find(r => r.currency === currency);
    return rate?.buyRate || 85.6;
  };

  const getSellRate = (currency: 'UPI' | 'CDM') => {
    const rate = rates.find(r => r.currency === currency);
    return rate?.sellRate || 85.6;
  };

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchRates();
  }, [fetchRates]);

  return {
    rates,
    loading,
    getBuyRate,
    getSellRate,
    refetch
  };
};