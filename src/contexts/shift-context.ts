import { createContext } from 'react';

export type ShiftContextValue = {
  openShift: any | null;
  loading: boolean;
  shiftRequired: boolean;
  hasOpenShift: boolean;
  refreshShift: () => Promise<any | null>;
};

export const ShiftContext = createContext<ShiftContextValue | undefined>(undefined);
