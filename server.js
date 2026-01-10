import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

/* ---------- MIDDLEWARE ---------- */
app.use(cors());
app.use(express.json());

/* ---------- HEALTH CHECK (IMPORTANT FOR RENDER) ---------- */
app.get("/", (req, res) => {
  res.send("✅ FutureSkills Guru Razorpay Backend is running");
});

/* ---------- RAZORPAY SETUP ---------- */
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* ---------- CREATE ORDER ---------- */
app.post("/create-order", async (req, res) => {
  try {
    const { amount, type } = req.body;

    // ✅ Strict validation
    if (![149, 499].includes(amount)) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const order = await razorpay.orders.create({
      amount: amount * 100, // rupees → paise
      currency: "INR",
      receipt: `order_${Date.now()}`,
    });

    res.json(order);
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ error: "Order creation failed" });
  }
});

/* ---------- VERIFY PAYMENT ---------- */
app.post("/verify-payment", (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const body =
      razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false });
    }
  } catch (err) {
    console.error("Verify payment error:", err);
    res.status(500).json({ success: false });
  }
});

/* ---------- PORT FIX (MOST IMPORTANT LINE) ---------- */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Razorpay backend running on port ${PORT}`);
});
