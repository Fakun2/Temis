import { Injectable } from "@nestjs/common";
import { GoogleCalendarTokenCipher } from "@bogaap/integration-contracts";

@Injectable()
export class GoogleCalendarTokenService {
  private cipher() {
    return new GoogleCalendarTokenCipher(
      process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY?.trim() ?? ""
    );
  }

  encrypt(value: string) {
    return this.cipher().encrypt(value);
  }

  decrypt(value: string) {
    return this.cipher().decrypt(value);
  }
}
