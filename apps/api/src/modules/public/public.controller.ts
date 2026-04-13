import { Body, Controller, Post } from "@nestjs/common";

@Controller("public")
export class PublicController {
  @Post("contact")
  async contact(@Body() body: any) {
    console.log("CONTACT FORM:", body);

    // abhi testing ke liye simple response
    return {
      success: true,
      message: "Received",
    };
  }
}