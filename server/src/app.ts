import express from "express";
import cors from "cors";
import routes from "./routes";
import { errorHandler, notFound } from "./middleware/error";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    name: "Mini ERP + CRM API",
    status: "online",
    health: "/health",
    frontend: "https://client-lake-nu-36.vercel.app"
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "ERP CRM API is running" });
});

app.use(routes);

// 404 + centralized error handling (must be last)
app.use(notFound);
app.use(errorHandler);

export default app;
