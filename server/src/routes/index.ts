import { Router } from "express";
import auth from "./auth";
import customers from "./customers";
import products from "./products";
import challans from "./challans";

const router = Router();

router.use("/auth", auth);
router.use("/customers", customers);
router.use("/products", products);
router.use("/challans", challans);

export default router;
