import { Hono } from "hono";
import puppeteer from "puppeteer";

const app = new Hono();

// create a group calednar
app.get("");

export default app;
