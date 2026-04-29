import { Router, type IRouter } from "express";
import healthRouter from "./health";
import expensesRouter from "./expenses";
import categoriesRouter from "./categories";
import commitmentsRouter from "./commitments";
import summaryRouter from "./summary";
import profileRouter from "./profile";
import subscriptionsRouter from "./subscriptions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(expensesRouter);
router.use(categoriesRouter);
router.use(commitmentsRouter);
router.use(summaryRouter);
router.use(profileRouter);
router.use(subscriptionsRouter);

export default router;
