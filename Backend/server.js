import express from "express";
import cors from "cors";
import { OAuth2Client } from "google-auth-library";

const app = express();
app.use(cors());
app.use(express.json());

const client = new OAuth2Client(
  "34276681645-qljcgh9b3fgub935akbstuduj3f43p5v.apps.googleusercontent.com"
);

app.post("/auth/google", async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience:
        "34276681645-qljcgh9b3fgub935akbstuduj3f43p5v.apps.googleusercontent.com",
    });

    const payload = ticket.getPayload();
    const email = payload.email;

    // ตรวจอีเมลให้ถูกต้อง
    if (email.endsWith("@silpakorn.edu")) {
      res.json({ success: true, email });
    } else {
      res.status(403).json({
        success: false,
        error: "อนุญาตเฉพาะอีเมล @silpakorn.edu เท่านั้น",
      });
    }
  } catch (error) {
    res.status(400).json({ success: false, error: "Token ไม่ถูกต้อง" });
  }
});


app.listen(3000, () =>console.log("✅ Backend running on http://localhost:3000")
);
