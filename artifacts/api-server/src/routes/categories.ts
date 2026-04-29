import { Router } from "express";
import { db, categoriesTable } from "@workspace/db";
import { CreateCategoryBody, DeleteCategoryParams } from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.use(requireAuth);

router.get("/categories", async (req, res) => {
  const userId = req.userId;
  const categories = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.userId, userId))
    .orderBy(categoriesTable.name);
  res.json(categories);
});

router.post("/categories", async (req, res) => {
  const userId = req.userId;
  const parseResult = CreateCategoryBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const { name, icon, color } = parseResult.data;
  const [category] = await db
    .insert(categoriesTable)
    .values({ userId, name, icon: icon ?? null, color: color ?? null })
    .returning();

  res.status(201).json(category);
});

router.delete("/categories/:id", async (req, res) => {
  const userId = req.userId;
  const parseResult = DeleteCategoryParams.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  await db
    .delete(categoriesTable)
    .where(and(eq(categoriesTable.id, parseResult.data.id), eq(categoriesTable.userId, userId)));
  res.status(204).send();
});

export default router;
