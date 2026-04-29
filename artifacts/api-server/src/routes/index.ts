import { Router, type IRouter } from "express";
import healthRouter from "./health";
import expensesRouter from "./expenses";
import categoriesRouter from "./categories";
import commitmentsRouter from "./commitments";
import summaryRouter from "./summary";

const router: IRouter = Router();

router.use(healthRouter);
router.use(expensesRouter);
router.use(categoriesRouter);
router.use(commitmentsRouter);
router.use(summaryRouter);

export default router;
