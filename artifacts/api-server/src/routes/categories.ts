import { Router } from "express";
import { db, categoriesTable } from "@workspace/db";
import { CreateCategoryBody, DeleteCategoryParams } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/categories", async (_req, res) => {
  const categories = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
  res.json(categories);
});

router.post("/categories", async (req, res) => {
  const parseResult = CreateCategoryBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const { name, icon, color } = parseResult.data;
  const [category] = await db
    .insert(categoriesTable)
    .values({ name, icon: icon ?? null, color: color ?? null })
    .returning();

  res.status(201).json(category);
});

router.delete("/categories/:id", async (req, res) => {
  const parseResult = DeleteCategoryParams.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  await db.delete(categoriesTable).where(eq(categoriesTable.id, parseResult.data.id));
  res.status(204).send();
});

export default router;
