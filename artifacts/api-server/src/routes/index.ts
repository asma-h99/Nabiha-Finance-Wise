import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import expensesRouter from "./expenses";
import categoriesRouter from "./categories";
import commitmentsRouter from "./commitments";
import subscriptionsRouter from "./subscriptions";
import eventsRouter from "./events";
import notificationsRouter from "./notifications";
import simulatorRouter from "./simulator";
import summaryRouter from "./summary";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(expensesRouter);
router.use(categoriesRouter);
router.use(commitmentsRouter);
router.use(subscriptionsRouter);
router.use(eventsRouter);
router.use(notificationsRouter);
router.use(simulatorRouter);
router.use(summaryRouter);

export default router;
