import type { QueryClient } from "@tanstack/react-query";
import {
  getListCommitmentsQueryKey,
  getListExpensesQueryKey,
  getGetBalanceSummaryQueryKey,
  getGetAccumulatedSavingsQueryKey,
  getGetMonthlyTrendQueryKey,
} from "@workspace/api-client-react";

const SUMMARY_KEYS_AFFECTED_BY_COMMITMENTS = [
  ["/api/summary/dashboard"] as const,
  getGetBalanceSummaryQueryKey(),
  getGetAccumulatedSavingsQueryKey(),
];

const SUMMARY_KEYS_AFFECTED_BY_EXPENSES = [
  ["/api/summary/dashboard"] as const,
  getGetBalanceSummaryQueryKey(),
  getGetAccumulatedSavingsQueryKey(),
  getGetMonthlyTrendQueryKey(),
  ["/api/summary/priority-breakdown"] as const,
  ["/api/summary/category-breakdown"] as const,
];

export function invalidateCommitmentsEverywhere(qc: QueryClient): void {
  qc.invalidateQueries({ queryKey: getListCommitmentsQueryKey() });
  for (const key of SUMMARY_KEYS_AFFECTED_BY_COMMITMENTS) {
    qc.invalidateQueries({ queryKey: key });
  }
}

export function invalidateExpensesEverywhere(qc: QueryClient): void {
  qc.invalidateQueries({ queryKey: getListExpensesQueryKey() });
  for (const key of SUMMARY_KEYS_AFFECTED_BY_EXPENSES) {
    qc.invalidateQueries({ queryKey: key });
  }
}
