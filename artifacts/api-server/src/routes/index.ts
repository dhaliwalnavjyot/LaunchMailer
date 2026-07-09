import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import dashboardRouter from "./dashboard.js";
import customersRouter from "./customers.js";
import campaignsRouter from "./campaigns.js";
import uploadRouter from "./upload.js";
import generateRouter from "./generate.js";
import sendRouter from "./send.js";
import settingsRouter from "./settings.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dashboardRouter);
router.use(customersRouter);
router.use(campaignsRouter);
router.use(uploadRouter);
router.use(generateRouter);
router.use(sendRouter);
router.use(settingsRouter);

export default router;
