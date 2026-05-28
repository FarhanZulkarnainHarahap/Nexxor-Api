import "dotenv/config";
import cors from "cors";
import express from "express";
import authRouter from "./routers/auth.router";
import cartRouter from "./routers/cart.router";
import categoryRouter from "./routers/category.router";
import couponRouter from "./routers/coupon.router";
import notificationRouter from "./routers/notification.router";
import orderRouter from "./routers/order.router";
import paymentRouter from "./routers/payment.router";
import productRouter from "./routers/product.router";
import addressRouter from "./routers/address.router";
import shippingRouter from "./routers/shipping.router";
import userRouter from "./routers/user.router";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";

const app = express();
const allowedOrigins = (process.env.FRONTEND_URL ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CALLBACK-TOKEN"],
    optionsSuccessStatus: 204,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get(["/", "/api"], (_req, res) => {
  return res.status(200).json({
    success: true,
    message: "Nexxora API is running",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/products", productRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/coupons", couponRouter);
app.use("/api/cart", cartRouter);
app.use("/api/orders", orderRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/addresses", addressRouter);
app.use("/api/shipping", shippingRouter);
app.use("/api/users", userRouter);
app.use("/api/notifications", notificationRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
