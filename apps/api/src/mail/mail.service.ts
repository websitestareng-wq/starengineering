import { Injectable } from "@nestjs/common";
import { Resend } from "resend";
import { buildWelcomeCredentialsEmail } from "./templates/welcome-credentials-email";
import { buildPasswordUpdatedEmail } from "./templates/password-updated-email";

type SendWelcomeCredentialsEmailInput = {
  to: string;
  name: string;
  email: string;
  phone?: string;
  password: string;
  loginUrl?: string;
};

type SendPasswordUpdatedEmailInput = {
  to: string;
  name: string;
  email: string;
  password: string;
  loginUrl?: string;
};

type SendReminderEmailInput = {
  to: string;
  title: string;
  notes?: string;
};

@Injectable()
export class MailService {
  private readonly resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendWelcomeCredentialsEmail(
    input: SendWelcomeCredentialsEmailInput,
  ): Promise<void> {
    const html = buildWelcomeCredentialsEmail({
      userName: input.name,
      loginEmail: input.email,
      loginPassword: input.password,
      loginUrl: input.loginUrl || "https://stareng.co.in/login",
      role: "USER",
      phone: input.phone || "",
    });

    await this.resend.emails.send({
      from: "STAR ENGINEERING <noreply@mail.stareng.co.in>",
      to: input.to,
      subject: "Your Login Credentials",
      html,
    });
  }

  async sendPasswordUpdatedEmail(
    input: SendPasswordUpdatedEmailInput,
  ): Promise<void> {
    const html = buildPasswordUpdatedEmail({
      userName: input.name,
      loginEmail: input.email,
      loginPassword: input.password,
      loginUrl: input.loginUrl || "https://stareng.co.in/login",
    });

    await this.resend.emails.send({
      from: "STAR ENGINEERING <noreply@mail.stareng.co.in>",
      to: input.to,
      subject: "STAR ENGINEERING Password Updated",
      html,
    });
  }

  async sendReminderEmail(
    input: SendReminderEmailInput,
  ): Promise<void> {
    console.log("[MailService] sendReminderEmail called with:", input);

    const safeTitle = input.title?.trim() || "Reminder";
    const safeNotes = input.notes?.trim();

   const text = safeNotes || safeTitle;

const htmlBody = (safeNotes || safeTitle)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/\n/g, "<br />");

const html = `
  <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6; font-size: 15px;">
    ${htmlBody}
  </div>
`;

    const response = await this.resend.emails.send({
      from: "STAR ENGINEERING <noreply@mail.stareng.co.in>",
      to: input.to,
      subject: safeTitle,
      text,
      html,
    });

    console.log("[MailService] resend response:", response);

    if ((response as any)?.error) {
      throw new Error(
        `[MailService] Resend error: ${JSON.stringify((response as any).error)}`,
      );
    }
  }
}