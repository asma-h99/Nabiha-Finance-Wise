import { Router } from "express";
import { db, expensesTable, categoriesTable } from "@workspace/db";
import {
  ListExpensesQueryParams,
  CreateExpenseBody,
  UpdateExpenseBody,
  GetExpenseParams,
  UpdateExpenseParams,
  DeleteExpenseParams,
} from "@workspace/api-zod";
import { eq, and, sql, desc, type SQL } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.use(requireAuth);

function toDateString(d: Date | string): string {
  if (typeof d === "string") return d;
  return d.toISOString().slice(0, 10);
}

async function ownsCategory(userId: string, categoryId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(and(eq(categoriesTable.id, categoryId), eq(categoriesTable.userId, userId)))
    .limit(1);
  return Boolean(row);
}

router.get("/expenses", async (req, res) => {
  if (!req.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.userId;
  const parseResult = ListExpensesQueryParams.safeParse(req.query);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const { categoryId, priority, month } = parseResult.data;

  const conditions: SQL[] = [eq(expensesTable.userId, userId)];
  if (categoryId) conditions.push(eq(expensesTable.categoryId, categoryId));
  if (priority) conditions.push(eq(expensesTable.priority, priority));
  if (month) conditions.push(sql`${expensesTable.date} LIKE ${month + "%"}`);

  const expenses = await db
    .select({
      id: expensesTable.id,
      title: expensesTable.title,
      amount: expensesTable.amount,
      priority: expensesTable.priority,
      categoryId: expensesTable.categoryId,
      categoryName: categoriesTable.name,
      notes: expensesTable.notes,
      date: expensesTable.date,
      createdAt: expensesTable.createdAt,
    })
    .from(expensesTable)
    .leftJoin(
      categoriesTable,
      and(
        eq(expensesTable.categoryId, categoriesTable.id),
        eq(categoriesTable.userId, userId),
      ),
    )
    .where(and(...conditions))
    .orderBy(desc(expensesTable.date));

  res.json(expenses.map((e) => ({ ...e, amount: Number(e.amount) })));
});

router.post("/expenses", async (req, res) => {
  if (!req.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.userId;
  const parseResult = CreateExpenseBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const { title, amount, priority, categoryId, notes, date } = parseResult.data;

  if (categoryId != null && !(await ownsCategory(userId, categoryId))) {
    res.status(400).json({ error: "Invalid categoryId" });
    return;
  }

  const [expense] = await db
    .insert(expensesTable)
    .values({
      userId,
      title,
      amount: String(amount),
      priority,
      categoryId: categoryId ?? null,
      notes: notes ?? null,
      date: toDateString(date),
    })
    .returning();

  const categoryName = categoryId
    ? (
        await db
          .select({ name: categoriesTable.name })
          .from(categoriesTable)
          .where(and(eq(categoriesTable.id, categoryId), eq(categoriesTable.userId, userId)))
      )[0]?.name ?? null
    : null;

  res.status(201).json({ ...expense, amount: Number(expense.amount), categoryName });
});

router.get("/expenses/:id", async (req, res) => {
  if (!req.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.userId;
  const parseResult = GetExpenseParams.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const [expense] = await db
    .select({
      id: expensesTable.id,
      title: expensesTable.title,
      amount: expensesTable.amount,
      priority: expensesTable.priority,
      categoryId: expensesTable.categoryId,
      categoryName: categoriesTable.name,
      notes: expensesTable.notes,
      date: expensesTable.date,
      createdAt: expensesTable.createdAt,
    })
    .from(expensesTable)
    .leftJoin(
      categoriesTable,
      and(
        eq(expensesTable.categoryId, categoriesTable.id),
        eq(categoriesTable.userId, userId),
      ),
    )
    .where(and(eq(expensesTable.id, parseResult.data.id), eq(expensesTable.userId, userId)));

  if (!expense) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json({ ...expense, amount: Number(expense.amount) });
});

router.put("/expenses/:id", async (req, res) => {
  if (!req.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.userId;
  const paramsResult = UpdateExpenseParams.safeParse(req.params);
  if (!paramsResult.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const bodyResult = UpdateExpenseBody.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const updates: Partial<typeof expensesTable.$inferInsert> = {};
  const body = bodyResult.data;
  if (body.title !== undefined) updates.title = body.title;
  if (body.amount !== undefined) updates.amount = String(body.amount);
  if (body.priority !== undefined) updates.priority = body.priority;
  if (body.categoryId !== undefined) {
    if (body.categoryId != null && !(await ownsCategory(userId, body.categoryId))) {
      res.status(400).json({ error: "Invalid categoryId" });
      return;
    }
    updates.categoryId = body.categoryId ?? null;
  }
  if (body.notes !== undefined) updates.notes = body.notes ?? null;
  if (body.date !== undefined) updates.date = toDateString(body.date);

  const [expense] = await db
    .update(expensesTable)
    .set(updates)
    .where(and(eq(expensesTable.id, paramsResult.data.id), eq(expensesTable.userId, userId)))
    .returning();

  if (!expense) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const categoryName = expense.categoryId
    ? (
        await db
          .select({ name: categoriesTable.name })
          .from(categoriesTable)
          .where(and(eq(categoriesTable.id, expense.categoryId), eq(categoriesTable.userId, userId)))
      )[0]?.name ?? null
    : null;

  res.json({ ...expense, amount: Number(expense.amount), categoryName });
});

router.delete("/expenses/:id", async (req, res) => {
  if (!req.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.userId;
  const parseResult = DeleteExpenseParams.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  await db
    .delete(expensesTable)
    .where(and(eq(expensesTable.id, parseResult.data.id), eq(expensesTable.userId, userId)));
  res.status(204).send();
});

export default router;
