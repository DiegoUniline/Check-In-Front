import { createContext } from 'react';

export type ShiftContextValue = {
  openShift: any | null;
  loading: boolean;
  shiftRequired: boolean;
  hasOpenShift: boolean;
  viewOnlyMode: boolean;
  continueWithoutShift: () => void;
  exitViewOnlyMode: () => void;
  refreshShift: () => Promise<any | null>;
};

export const ShiftContext = createContext<ShiftContextValue | undefined>(undefined);
