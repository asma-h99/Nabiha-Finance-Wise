import { Router } from "express";
import {
  db,
  expensesTable,
  categoriesTable,
  commitmentsTable,
  subscriptionsTable,
  userProfilesTable,
} from "@workspace/db";
import {
  GetDashboardSummaryQueryParams,
  GetPriorityBreakdownQueryParams,
  GetCategoryBreakdownQueryParams,
} from "@workspace/api-zod";
import { eq, sql, count, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.use(requireAuth);

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getLastMonth() {
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthlyEquivalent(amount: number, frequency: string): number {
  if (frequency === "yearly") return amount / 12;
  if (frequency === "quarterly") return amount / 3;
  if (frequency === "weekly") return amount * 4.333;
  return amount;
}

router.get("/summary/dashboard", async (req, res) => {
  const userId = req.userId;
  const parseResult = GetDashboardSummaryQueryParams.safeParse(req.query);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const month = parseResult.data.month ?? getCurrentMonth();
  const lastMonth = getLastMonth();

  const [thisMonthData] = await db
    .select({
      total: sql<string>`COALESCE(SUM(CAST(${expensesTable.amount} AS DECIMAL)), 0)`,
      expensesCount: count(),
    })
    .from(expensesTable)
    .where(and(eq(expensesTable.userId, userId), sql`${expensesTable.date} LIKE ${month + "%"}`));

  const [lastMonthData] = await db
    .select({
      total: sql<string>`COALESCE(SUM(CAST(${expensesTable.amount} AS DECIMAL)), 0)`,
    })
    .from(expensesTable)
    .where(and(eq(expensesTable.userId, userId), sql`${expensesTable.date} LIKE ${lastMonth + "%"}`));

  const priorityData = await db
    .select({
      priority: expensesTable.priority,
      total: sql<string>`COALESCE(SUM(CAST(${expensesTable.amount} AS DECIMAL)), 0)`,
    })
    .from(expensesTable)
    .where(and(eq(expensesTable.userId, userId), sql`${expensesTable.date} LIKE ${month + "%"}`))
    .groupBy(expensesTable.priority);

  const essentialTotal = priorityData.find((p) => p.priority === "essential");
  const importantTotal = priorityData.find((p) => p.priority === "important");
  const luxuryTotal = priorityData.find((p) => p.priority === "luxury");

  const allCommitments = await db
    .select()
    .from(commitmentsTable)
    .where(eq(commitmentsTable.userId, userId));
  const commitmentsTotal = allCommitments.reduce(
    (sum, c) => sum + Number(c.amount),
    0,
  );
  const unpaidCommitmentsCount = allCommitments.filter((c) => !c.isPaid).length;

  const allSubs = await db
    .select()
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.userId, userId), eq(subscriptionsTable.status, "active")));
  const subscriptionsTotal = allSubs.reduce(
    (sum, s) => sum + monthlyEquivalent(Number(s.amount), s.frequency),
    0,
  );
  const activeSubscriptionsCount = allSubs.length;

  const topCategoryData = await db
    .select({
      name: categoriesTable.name,
      total: sql<string>`COALESCE(SUM(CAST(${expensesTable.amount} AS DECIMAL)), 0)`,
    })
    .from(expensesTable)
    .leftJoin(categoriesTable, eq(expensesTable.categoryId, categoriesTable.id))
    .where(and(eq(expensesTable.userId, userId), sql`${expensesTable.date} LIKE ${month + "%"}`))
    .groupBy(categoriesTable.name)
    .orderBy(sql`SUM(CAST(${expensesTable.amount} AS DECIMAL)) DESC`)
    .limit(1);

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));

  const monthlySalary = profile ? Number(profile.monthlySalary) : 0;
  const currency = profile ? profile.currency : "JOD";
  const totalThisMonth = Number(thisMonthData?.total ?? 0);
  const remainingBalance = monthlySalary - totalThisMonth - commitmentsTotal - subscriptionsTotal;

  res.json({
    totalThisMonth,
    totalLastMonth: Number(lastMonthData?.total ?? 0),
    essentialTotal: Number(essentialTotal?.total ?? 0),
    importantTotal: Number(importantTotal?.total ?? 0),
    luxuryTotal: Number(luxuryTotal?.total ?? 0),
    commitmentsTotal: Math.round(commitmentsTotal * 100) / 100,
    unpaidCommitmentsCount,
    subscriptionsTotal: Math.round(subscriptionsTotal * 100) / 100,
    activeSubscriptionsCount,
    expensesCount: thisMonthData?.expensesCount ?? 0,
    topCategory: topCategoryData[0]?.name ?? null,
    monthlySalary,
    currency,
    remainingBalance: Math.round(remainingBalance * 100) / 100,
  });
});

router.get("/summary/priority-breakdown", async (req, res) => {
  const userId = req.userId;
  const parseResult = GetPriorityBreakdownQueryParams.safeParse(req.query);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const month = parseResult.data.month ?? getCurrentMonth();

  const data = await db
    .select({
      priority: expensesTable.priority,
      total: sql<string>`COALESCE(SUM(CAST(${expensesTable.amount} AS DECIMAL)), 0)`,
      count: count(),
    })
    .from(expensesTable)
    .where(and(eq(expensesTable.userId, userId), sql`${expensesTable.date} LIKE ${month + "%"}`))
    .groupBy(expensesTable.priority);

  const grandTotal = data.reduce((sum, d) => sum + Number(d.total), 0);

  const result = data.map((d) => ({
    priority: d.priority,
    total: Number(d.total),
    count: d.count,
    percentage: grandTotal > 0 ? Math.round((Number(d.total) / grandTotal) * 100) : 0,
  }));

  res.json(result);
});

router.get("/summary/category-breakdown", async (req, res) => {
  const userId = req.userId;
  const parseResult = GetCategoryBreakdownQueryParams.safeParse(req.query);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const month = parseResult.data.month ?? getCurrentMonth();

  const data = await db
    .select({
      categoryId: categoriesTable.id,
      categoryName: sql<string>`COALESCE(${categoriesTable.name}, 'غير محدد')`,
      total: sql<string>`COALESCE(SUM(CAST(${expensesTable.amount} AS DECIMAL)), 0)`,
      count: count(),
    })
    .from(expensesTable)
    .leftJoin(categoriesTable, eq(expensesTable.categoryId, categoriesTable.id))
    .where(and(eq(expensesTable.userId, userId), sql`${expensesTable.date} LIKE ${month + "%"}`))
    .groupBy(categoriesTable.id, categoriesTable.name)
    .orderBy(sql`SUM(CAST(${expensesTable.amount} AS DECIMAL)) DESC`);

  const grandTotal = data.reduce((sum, d) => sum + Number(d.total), 0);

  const result = data.map((d) => ({
    categoryId: d.categoryId,
    categoryName: d.categoryName,
    total: Number(d.total),
    count: d.count,
    percentage: grandTotal > 0 ? Math.round((Number(d.total) / grandTotal) * 100) : 0,
  }));

  res.json(result);
});

router.get("/summary/monthly-trend", async (req, res) => {
  const userId = req.userId;
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const results = await Promise.all(
    months.map(async (month) => {
      const data = await db
        .select({
          priority: expensesTable.priority,
          total: sql<string>`COALESCE(SUM(CAST(${expensesTable.amount} AS DECIMAL)), 0)`,
        })
        .from(expensesTable)
        .where(and(eq(expensesTable.userId, userId), sql`${expensesTable.date} LIKE ${month + "%"}`))
        .groupBy(expensesTable.priority);

      return {
        month,
        total: data.reduce((sum, d) => sum + Number(d.total), 0),
        essential: Number(data.find((d) => d.priority === "essential")?.total ?? 0),
        important: Number(data.find((d) => d.priority === "important")?.total ?? 0),
        luxury: Number(data.find((d) => d.priority === "luxury")?.total ?? 0),
      };
    }),
  );

  res.json(results);
});

router.get("/summary/subscriptions-breakdown", async (req, res) => {
  const userId = req.userId;
  const subs = await db
    .select()
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.userId, userId), eq(subscriptionsTable.status, "active")));

  let monthlyTotal = 0;
  let yearlyTotal = 0;
  const byCategoryMap = new Map<string, { total: number; count: number }>();

  for (const s of subs) {
    const amt = Number(s.amount);
    const monthly = monthlyEquivalent(amt, s.frequency);
    monthlyTotal += monthly;
    yearlyTotal += monthly * 12;
    const existing = byCategoryMap.get(s.category) ?? { total: 0, count: 0 };
    existing.total += monthly;
    existing.count += 1;
    byCategoryMap.set(s.category, existing);
  }

  const byCategory = Array.from(byCategoryMap.entries()).map(([category, v]) => ({
    category: category as "streaming" | "music" | "productivity" | "fitness" | "other",
    total: Math.round(v.total * 100) / 100,
    count: v.count,
  }));

  res.json({
    monthlyTotal: Math.round(monthlyTotal * 100) / 100,
    yearlyTotal: Math.round(yearlyTotal * 100) / 100,
    byCategory,
  });
});

export default router;
