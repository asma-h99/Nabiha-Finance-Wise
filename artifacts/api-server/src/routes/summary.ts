import { Router } from "express";
import {
  db,
  expensesTable,
  categoriesTable,
  commitmentsTable,
  subscriptionsTable,
  userProfileTable,
} from "@workspace/db";
import {
  GetDashboardSummaryQueryParams,
  GetPriorityBreakdownQueryParams,
  GetCategoryBreakdownQueryParams,
} from "@workspace/api-zod";
import { eq, sql, sum, count, and } from "drizzle-orm";

const router = Router();

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getLastMonth() {
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

router.get("/summary/dashboard", async (req, res) => {
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
    .where(sql`${expensesTable.date} LIKE ${month + "%"}`);

  const [lastMonthData] = await db
    .select({
      total: sql<string>`COALESCE(SUM(CAST(${expensesTable.amount} AS DECIMAL)), 0)`,
    })
    .from(expensesTable)
    .where(sql`${expensesTable.date} LIKE ${lastMonth + "%"}`);

  const priorityData = await db
    .select({
      priority: expensesTable.priority,
      total: sql<string>`COALESCE(SUM(CAST(${expensesTable.amount} AS DECIMAL)), 0)`,
    })
    .from(expensesTable)
    .where(sql`${expensesTable.date} LIKE ${month + "%"}`)
    .groupBy(expensesTable.priority);

  const essentialTotal = priorityData.find((p) => p.priority === "essential");
  const importantTotal = priorityData.find((p) => p.priority === "important");
  const luxuryTotal = priorityData.find((p) => p.priority === "luxury");

  const allCommitments = await db.select().from(commitmentsTable);
  const commitmentsTotal = allCommitments.reduce((sum, c) => sum + Number(c.amount), 0);
  const unpaidCommitmentsCount = allCommitments.filter((c) => !c.isPaid).length;

  const topCategoryData = await db
    .select({
      name: categoriesTable.name,
      total: sql<string>`COALESCE(SUM(CAST(${expensesTable.amount} AS DECIMAL)), 0)`,
    })
    .from(expensesTable)
    .leftJoin(categoriesTable, eq(expensesTable.categoryId, categoriesTable.id))
    .where(sql`${expensesTable.date} LIKE ${month + "%"}`)
    .groupBy(categoriesTable.name)
    .orderBy(sql`SUM(CAST(${expensesTable.amount} AS DECIMAL)) DESC`)
    .limit(1);

  res.json({
    totalThisMonth: Number(thisMonthData?.total ?? 0),
    totalLastMonth: Number(lastMonthData?.total ?? 0),
    essentialTotal: Number(essentialTotal?.total ?? 0),
    importantTotal: Number(importantTotal?.total ?? 0),
    luxuryTotal: Number(luxuryTotal?.total ?? 0),
    commitmentsTotal,
    unpaidCommitmentsCount,
    expensesCount: thisMonthData?.expensesCount ?? 0,
    topCategory: topCategoryData[0]?.name ?? null,
  });
});

router.get("/summary/priority-breakdown", async (req, res) => {
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
    .where(sql`${expensesTable.date} LIKE ${month + "%"}`)
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
    .where(sql`${expensesTable.date} LIKE ${month + "%"}`)
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

router.get("/summary/balance", async (_req, res) => {
  const month = getCurrentMonth();

  const [profile] = await db.select().from(userProfileTable);
  const monthlySalary = Number(profile?.monthlySalary ?? 0);
  const currency = profile?.currency ?? "JOD";

  const subs = await db.select().from(subscriptionsTable);
  const subscriptionsMonthly = subs.reduce((acc, s) => {
    const amt = Number(s.amount);
    return acc + (s.billingCycle === "yearly" ? amt / 12 : amt);
  }, 0);

  const commitments = await db.select().from(commitmentsTable);
  const commitmentsTotal = commitments.reduce((acc, c) => acc + Number(c.amount), 0);
  const unpaidCommitmentsTotal = commitments
    .filter((c) => !c.isPaid)
    .reduce((acc, c) => acc + Number(c.amount), 0);

  const [spent] = await db
    .select({
      total: sql<string>`COALESCE(SUM(CAST(${expensesTable.amount} AS DECIMAL)), 0)`,
    })
    .from(expensesTable)
    .where(sql`${expensesTable.date} LIKE ${month + "%"}`);
  const spentThisMonth = Number(spent?.total ?? 0);

  const projectedRemaining =
    monthlySalary - subscriptionsMonthly - unpaidCommitmentsTotal - spentThisMonth;

  res.json({
    currency,
    monthlySalary,
    subscriptionsMonthly: Math.round(subscriptionsMonthly * 1000) / 1000,
    commitmentsTotal,
    unpaidCommitmentsTotal,
    spentThisMonth,
    projectedRemaining: Math.round(projectedRemaining * 1000) / 1000,
    subscriptionsCount: subs.length,
  });
});

router.get("/summary/monthly-trend", async (_req, res) => {
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
        .where(sql`${expensesTable.date} LIKE ${month + "%"}`)
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

export default router;
