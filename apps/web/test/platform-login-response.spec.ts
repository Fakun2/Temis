import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readPlatformLoginResponse } from "../lib/auth/platform-login-response";

describe("platform login response", () => {
  it("preserves a valid authentication response", async () => {
    const response = new Response(
      JSON.stringify({ status: "fido_required", transactionId: "id" }),
      { status: 200 }
    );
    assert.equal((await readPlatformLoginResponse(response)).status, "fido_required");
  });
  it("explains an empty or non-JSON response without leaking server HTML", async () => {
    for (const body of ["", "<html>internal error</html>", "null"]) {
      await assert.rejects(
        readPlatformLoginResponse(new Response(body, { status: 502 })),
        /respuesta inválida \(HTTP 502\)/
      );
    }
  });
  it("preserves an API error message", async () => {
    const response = new Response(JSON.stringify({ message: "Credenciales inválidas" }), {
      status: 401
    });
    assert.equal((await readPlatformLoginResponse(response)).message, "Credenciales inválidas");
  });
});
