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
import { eq, and, sql, desc } from "drizzle-orm";

const router = Router();

router.get("/expenses", async (req, res) => {
  const parseResult = ListExpensesQueryParams.safeParse(req.query);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const { categoryId, priority, month } = parseResult.data;

  const conditions: ReturnType<typeof eq>[] = [];
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
    .leftJoin(categoriesTable, eq(expensesTable.categoryId, categoriesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(expensesTable.date));

  res.json(expenses.map((e) => ({ ...e, amount: Number(e.amount) })));
});

router.post("/expenses", async (req, res) => {
  const parseResult = CreateExpenseBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const { title, amount, priority, categoryId, notes, date } = parseResult.data;
  const dateStr = date instanceof Date ? date.toISOString().slice(0, 10) : String(date);

  const [expense] = await db
    .insert(expensesTable)
    .values({ title, amount: String(amount), priority, categoryId: categoryId ?? null, notes: notes ?? null, date: dateStr })
    .returning();

  const categoryName = categoryId
    ? (await db.select({ name: categoriesTable.name }).from(categoriesTable).where(eq(categoriesTable.id, categoryId)))[0]?.name ?? null
    : null;

  res.status(201).json({ ...expense, amount: Number(expense.amount), categoryName });
});

router.get("/expenses/:id", async (req, res) => {
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
    .leftJoin(categoriesTable, eq(expensesTable.categoryId, categoriesTable.id))
    .where(eq(expensesTable.id, parseResult.data.id));

  if (!expense) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json({ ...expense, amount: Number(expense.amount) });
});

router.put("/expenses/:id", async (req, res) => {
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
  if (body.categoryId !== undefined) updates.categoryId = body.categoryId ?? null;
  if (body.notes !== undefined) updates.notes = body.notes ?? null;
  if (body.date !== undefined) {
    updates.date = body.date instanceof Date ? body.date.toISOString().slice(0, 10) : String(body.date);
  }

  const [expense] = await db
    .update(expensesTable)
    .set(updates)
    .where(eq(expensesTable.id, paramsResult.data.id))
    .returning();

  if (!expense) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const categoryName = expense.categoryId
    ? (await db.select({ name: categoriesTable.name }).from(categoriesTable).where(eq(categoriesTable.id, expense.categoryId)))[0]?.name ?? null
    : null;

  res.json({ ...expense, amount: Number(expense.amount), categoryName });
});

router.delete("/expenses/:id", async (req, res) => {
  const parseResult = DeleteExpenseParams.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  await db.delete(expensesTable).where(eq(expensesTable.id, parseResult.data.id));
  res.status(204).send();
});

export default router;
