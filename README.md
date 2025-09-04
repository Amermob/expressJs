import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import twilio from "twilio";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Twilio client setup
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// In-memory OTP store (demo only, use Redis or DB in production)
const otpStore = {}; // { "+9665XXXX": "1234" }

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to the API. Try POST /send-otp.");
});

// Serve static files (optional)
app.use(express.static(path.resolve("public")));

// POST /send-otp → send OTP to phone
app.post("/send-otp", async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "Phone number is required" });

  const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP
  otpStore[phone] = otp;

  try {
    await client.messages.create({
      body: `Your OTP is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    console.log(`OTP ${otp} sent to ${phone}`);
    res.json({ success: true });
  } catch (err) {
    console.error("Twilio error:", err);
    res.status(500).json({ success: false, error: "Failed to send OTP" });
  }
});

// POST /verify-otp → verify OTP entered by user
app.post("/verify-otp", (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ success: false, error: "Missing phone or code" });

  if (otpStore[phone] === code) {
    delete otpStore[phone]; // OTP used, remove it
    return res.json({ success: true });
  } else {
    return res.json({ success: false, error: "Invalid OTP" });
  }
});

// 404 middleware
app.use((req, res) => {
  res.status(404).send("Sorry, can't find that route. 404.");
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
