import { Controller, Post, Body, BadRequestException } from "@nestjs/common";
import { R2Service } from "./r2.service";

@Controller("media")
export class R2Controller {
  constructor(private readonly r2Service: R2Service) {}

  @Post("/image/upload-url")
  async getUploadUrl(@Body("contentType") contentType: string) {
    const allowedTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ]);

    if (!contentType || !allowedTypes.has(contentType)) {
      throw new BadRequestException(
        "Invalid or unsupported image content type",
      );
    }

    return this.r2Service.getPresignedUploadUrl(contentType);
  }
}
