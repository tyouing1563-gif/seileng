import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Contact Form (Email Sending)
  app.post("/api/contact", async (req, res) => {
    const { name, email, phone, subject, message } = req.body;

    // Check for required SMTP environment variables
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ADMIN_EMAIL } = process.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !ADMIN_EMAIL) {
      console.error("SMTP configuration is missing in environment variables.");
      return res.status(500).json({ 
        error: "Server configuration error. Please check SMTP settings.",
        details: "Missing SMTP_HOST, SMTP_USER, SMTP_PASS, or ADMIN_EMAIL"
      });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT || "465"),
        secure: parseInt(SMTP_PORT || "465") === 465, // true for 465, false for other ports
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });

      const mailOptions = {
        from: `"${name}" <${SMTP_USER}>`, // Sender address (must be SMTP_USER for many providers)
        replyTo: email,
        to: ADMIN_EMAIL,
        subject: `[세일엔지니어링 문의] ${subject}`,
        text: `
          새로운 고객 문의가 접수되었습니다.

          성함: ${name}
          이메일: ${email}
          연락처: ${phone}
          제목: ${subject}

          내용:
          ${message}
        `,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px;">새로운 고객 문의 접수</h2>
            <p style="margin-top: 20px;"><strong>성함:</strong> ${name}</p>
            <p><strong>이메일:</strong> <a href="mailto:${email}">${email}</a></p>
            <p><strong>연락처:</strong> ${phone}</p>
            <p><strong>제목:</strong> ${subject}</p>
            <div style="margin-top: 20px; padding: 15px; bg-color: #f9fafb; border-radius: 5px; border-left: 4px solid #1e3a8a;">
              <strong>내용:</strong><br/>
              <p style="white-space: pre-wrap;">${message}</p>
            </div>
            <p style="margin-top: 30px; font-size: 12px; color: #6b7280; border-top: 1px solid #eee; padding-top: 10px;">
              본 메일은 세일엔지니어링 웹사이트 고객지원 양식을 통해 발송되었습니다.
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: "Email sent successfully" });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: "Failed to send email", details: (error as Error).message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
