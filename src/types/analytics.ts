export type AnalyticsDateRangePreset = 'this_month' | 'last_month' | 'this_year' | 'custom';

export interface AnalyticsDateRange {
  preset: AnalyticsDateRangePreset;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  label: string;
}

export interface ExecutiveMetrics {
  contractExpected: {
    amount: number;
    count: number;
  };
  netCashCollected: {
    amount: number;
    collectionRate: number; // percentage (0-100)
  };
  pendingDues: {
    amount: number;
    count: number;
  };
  cancellations: {
    count: number;
    refundAmount: number;
  };
  totalExpenses?: {
    amount: number;
    count?: number;
  };
  netOperatingProfit?: {
    amount: number;
    isProfit: boolean;
  };
}

export interface RankingItem {
  name: string;
  count: number;
  value?: number;
  percentage: number;
}

export interface HallAnalyticsData {
  executive: ExecutiveMetrics;
  topEventTypes: RankingItem[];
  topPackages: RankingItem[];
}

