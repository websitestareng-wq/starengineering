import { BadRequestException, Injectable } from "@nestjs/common";

type TurnstileVerifyResponse = {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
  action?: string;
  cdata?: string;
};

@Injectable()
export class CaptchaService {
  async verifyTurnstileToken(token: string, remoteip?: string) {
    const secret = process.env.TURNSTILE_SECRET_KEY;

    if (!secret) {
      throw new BadRequestException("TURNSTILE_SECRET_KEY is missing.");
    }

    if (!token?.trim()) {
      throw new BadRequestException("Captcha token is missing.");
    }

    const body = new URLSearchParams();
    body.append("secret", secret);
    body.append("response", token.trim());

    if (remoteip) {
      body.append("remoteip", remoteip);
    }

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      },
    );

    const data = (await response.json()) as TurnstileVerifyResponse;

    if (!data.success) {
      throw new BadRequestException(
        data["error-codes"]?.join(", ") || "Captcha validation failed.",
      );
    }

    return data;
  }
}