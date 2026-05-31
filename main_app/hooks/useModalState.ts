import { useState, useEffect, useCallback } from 'react';

interface ModalState {
  orderId: string;
  modalType: 'BUY_UPI' | 'BUY_CDM' | 'SELL_UPI' | 'SELL_CDM';
  currentStep: number;
  formData: any;
  adminPaymentDetails: any;
  lastUpdated: number;
}

export const useModalState = () => {
  const [modalStates, setModalStates] = useState<Record<string, ModalState>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedStates = localStorage.getItem('orderModalStates');
      if (savedStates) {
        try {
          const parsed = JSON.parse(savedStates);
          const now = Date.now();
          const validStates = Object.entries(parsed).reduce((acc, [key, state]: [string, any]) => {
            if (now - state.lastUpdated < 24 * 60 * 60 * 1000) {
              acc[key] = state;
            }
            return acc;
          }, {} as Record<string, ModalState>);
          setModalStates(validStates);
        } catch (error) {
          console.error('Error loading modal states:', error);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('orderModalStates', JSON.stringify(modalStates));
    }
  }, [modalStates]);

  const saveModalState = useCallback((orderId: string, modalType: ModalState['modalType'], currentStep: number, formData: any = {}, adminPaymentDetails: any = null) => {
    if (!orderId) return;
    setModalStates(prev => ({
      ...prev,
      [orderId]: {
        orderId,
        modalType,
        currentStep,
        formData,
        adminPaymentDetails,
        lastUpdated: Date.now()
      }
    }));
  }, []);

  const getModalState = useCallback((orderId: string): ModalState | null => {
    if (!orderId) return null;
    return modalStates[orderId] || null;
  }, [modalStates]);

  const clearModalState = useCallback((orderId: string) => {
    setModalStates(prev => {
      const newState = { ...prev };
      delete newState[orderId];
      return newState;
    });
  }, []);

  const clearAllModalStates = useCallback(() => {
    setModalStates({});
    if (typeof window !== 'undefined') {
      localStorage.removeItem('orderModalStates');
    }
  }, []);

  return {
    saveModalState,
    getModalState,
    clearModalState,
    clearAllModalStates
  };
};