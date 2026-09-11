import { defineConfig } from "orval";

export default defineConfig({
  temis: {
    input: {
      target: "../../apps/api/openapi.json"
    },
    output: {
      mode: "single",
      target: "src/generated/temis-api.ts",
      client: "fetch",
      prettier: true,
      clean: false,
      override: {
        mutator: {
          path: "./src/fetch-client.ts",
          name: "temisFetch"
        }
      }
    }
  }
});
