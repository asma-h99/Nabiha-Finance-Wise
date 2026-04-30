import { Router, type IRouter } from "express";
import healthRouter from "./health";
import expensesRouter from "./expenses";
import categoriesRouter from "./categories";
import commitmentsRouter from "./commitments";
import summaryRouter from "./summary";
import profileRouter from "./profile";
import subscriptionsRouter from "./subscriptions";
import notificationsRouter from "./notifications";
import calendarEventsRouter from "./calendar-events";

const router: IRouter = Router();

router.use(healthRouter);
router.use(expensesRouter);
router.use(categoriesRouter);
router.use(commitmentsRouter);
router.use(summaryRouter);
router.use(profileRouter);
router.use(subscriptionsRouter);
router.use(notificationsRouter);
router.use(calendarEventsRouter);

export default router;
