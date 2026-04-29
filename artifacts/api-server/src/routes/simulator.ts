import {
  db,
  commitmentsTable,
  subscriptionsTable,
  userProfilesTable,
} from "@workspace/db";
import { Router } from "express";
import { SimulateBorrowingCapacityBody } from "@workspace/api-zod";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.use(requireAuth);

function subToMonthly(amount: number, freq: string): number {
  if (freq === "yearly") return amount / 12;
  if (freq === "quarterly") return amount / 3;
  if (freq === "weekly") return amount * 4.333;
  return amount;
}

router.post("/simulator/borrowing-capacity", async (req, res) => {
  if (!req.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.userId;
  const parseResult = SimulateBorrowingCapacityBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const { loanAmount, annualInterestRate, termMonths, monthlySalary } =
    parseResult.data;

  const monthlyRate = annualInterestRate / 100 / 12;
  let monthlyPayment: number;
  if (monthlyRate === 0) {
    monthlyPayment = loanAmount / termMonths;
  } else {
    const factor = Math.pow(1 + monthlyRate, termMonths);
    monthlyPayment = (loanAmount * monthlyRate * factor) / (factor - 1);
  }

  const totalRepayment = monthlyPayment * termMonths;
  const totalInterest = totalRepayment - loanAmount;

  let salary = monthlySalary ?? 0;
  if (!salary) {
    const [profile] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.userId, userId));
    salary = profile ? Number(profile.monthlySalary) : 0;
  }

  const activeSubs = await db
    .select()
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.userId, userId),
        eq(subscriptionsTable.status, "active"),
      ),
    );
  const subscriptionsMonthly = activeSubs.reduce(
    (s, x) => s + subToMonthly(Number(x.amount), x.frequency),
    0,
  );

  const allCommitments = await db
    .select()
    .from(commitmentsTable)
    .where(eq(commitmentsTable.userId, userId));
  const commitmentsTotal = allCommitments.reduce(
    (s, c) => s + Number(c.amount),
    0,
  );

  // Available income = salary minus already-active subscriptions
  const availableIncome = Math.max(salary - subscriptionsMonthly, 0);

  const debtToIncomeRatio =
    salary > 0 ? (monthlyPayment / salary) * 100 : 0;

  // Affordability is the share of AVAILABLE income (post-subscriptions)
  // consumed by the new loan payment.
  const currentDebtToIncomeRatio =
    availableIncome > 0
      ? (monthlyPayment / availableIncome) * 100
      : monthlyPayment > 0
        ? 100
        : 0;

  let affordability: "safe" | "caution" | "risky";
  if (currentDebtToIncomeRatio < 30) affordability = "safe";
  else if (currentDebtToIncomeRatio <= 45) affordability = "caution";
  else affordability = "risky";

  // Build projected balance schedule
  const projectedBalance: { month: number; remainingBalance: number }[] = [];
  let balance = loanAmount;
  // Cap chart points at 36 max for performance
  const stepSize = termMonths > 36 ? Math.ceil(termMonths / 36) : 1;
  for (let m = 0; m <= termMonths; m++) {
    const interest = balance * monthlyRate;
    const principal = monthlyPayment - interest;
    if (m === 0) {
      projectedBalance.push({ month: 0, remainingBalance: round2(balance) });
    } else {
      balance = Math.max(0, balance - principal);
      if (m % stepSize === 0 || m === termMonths) {
        projectedBalance.push({ month: m, remainingBalance: round2(balance) });
      }
    }
  }

  res.json({
    monthlyPayment: round2(monthlyPayment),
    totalInterest: round2(totalInterest),
    totalRepayment: round2(totalRepayment),
    debtToIncomeRatio: round2(debtToIncomeRatio),
    commitmentsTotal: round2(commitmentsTotal),
    currentDebtToIncomeRatio: round2(currentDebtToIncomeRatio),
    affordability,
    projectedBalance,
  });
});

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export default router;
