import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clientCursorSchema,
  clientStatusSchema,
  clientTypeSchema,
  createClientSchema,
  listClientsQuerySchema,
  updateClientSchema,
  type ClientCursor
} from "../src/clients/clients.schemas";

const clientId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("client create schemas", () => {
  describe("human", () => {
    it("accepts and normalizes a valid human client", () => {
      const parsed = createClientSchema.parse({
        type: "human",
        firstName: "  Ana  ",
        lastName: "  Perez ",
        age: 38,
        dni: "30111222",
        cuil: "27301112221",
        salaryReceiptRef: "  recibo-2026-08 ",
        email: "  ANA@EJEMPLO.COM ",
        phone: "  +54 381 555-0000 ",
        address: "  San Martin 100 ",
        notes: "  Cliente preferencial ",
        cbu: "2850590940090418135201"
      });

      assert.equal(parsed.type, "human");
      assert.equal(parsed.status, "active");
      assert.equal(parsed.firstName, "Ana");
      assert.equal(parsed.lastName, "Perez");
      assert.equal(parsed.email, "ana@ejemplo.com");
      assert.equal(parsed.address, "San Martin 100");
    });

    it("rejects a missing firstName", () => {
      assert.equal(
        createClientSchema.safeParse({ type: "human", lastName: "Perez" }).success,
        false
      );
    });

    it("rejects a missing lastName", () => {
      assert.equal(
        createClientSchema.safeParse({ type: "human", firstName: "Ana" }).success,
        false
      );
    });

    it("rejects invalid DNI values", () => {
      assert.equal(
        createClientSchema.safeParse({
          type: "human",
          firstName: "Ana",
          lastName: "Perez",
          dni: "123456"
        }).success,
        false
      );
    });

    it("rejects invalid CUIL values", () => {
      assert.equal(
        createClientSchema.safeParse({
          type: "human",
          firstName: "Ana",
          lastName: "Perez",
          cuil: "2730111222"
        }).success,
        false
      );
    });

    it("rejects invalid CBU values", () => {
      assert.equal(
        createClientSchema.safeParse({
          type: "human",
          firstName: "Ana",
          lastName: "Perez",
          cbu: "123456789"
        }).success,
        false
      );
    });

    it("rejects ages outside the supported range", () => {
      for (const age of [-1, 121, 20.5]) {
        assert.equal(
          createClientSchema.safeParse({
            type: "human",
            firstName: "Ana",
            lastName: "Perez",
            age
          }).success,
          false
        );
      }
    });

    it("rejects legal entity fields", () => {
      assert.equal(
        createClientSchema.safeParse({
          type: "human",
          firstName: "Ana",
          lastName: "Perez",
          businessName: "Empresa SA"
        }).success,
        false
      );
      assert.equal(
        createClientSchema.safeParse({
          type: "human",
          firstName: "Ana",
          lastName: "Perez",
          cuit: "30711222334"
        }).success,
        false
      );
      assert.equal(
        createClientSchema.safeParse({
          type: "human",
          firstName: "Ana",
          lastName: "Perez",
          statute: "estatuto.pdf"
        }).success,
        false
      );
    });
  });

  describe("legal entity", () => {
    it("accepts and normalizes a valid legal entity", () => {
      const parsed = createClientSchema.parse({
        type: "legal_entity",
        businessName: "  Empresa Ejemplo SA ",
        cuit: "30711222334",
        statute: "  estatuto-2026.pdf ",
        email: "  CONTACTO@EMPRESA.COM ",
        phone: "  +54 11 5555-0000 ",
        address: "  Corrientes 500 ",
        notes: "  Sociedad comercial ",
        cbu: "2850590940090418135201"
      });

      assert.equal(parsed.type, "legal_entity");
      assert.equal(parsed.status, "active");
      assert.equal(parsed.businessName, "Empresa Ejemplo SA");
      assert.equal(parsed.email, "contacto@empresa.com");
      assert.equal(parsed.statute, "estatuto-2026.pdf");
    });

    it("rejects a missing businessName", () => {
      assert.equal(createClientSchema.safeParse({ type: "legal_entity" }).success, false);
    });

    it("rejects invalid CUIT values", () => {
      assert.equal(
        createClientSchema.safeParse({
          type: "legal_entity",
          businessName: "Empresa SA",
          cuit: "3071122233"
        }).success,
        false
      );
    });

    it("rejects human fields", () => {
      for (const field of ["firstName", "lastName", "age", "dni", "cuil", "salaryReceiptRef"]) {
        const value = field === "age" ? 30 : "Dato no permitido";
        assert.equal(
          createClientSchema.safeParse({
            type: "legal_entity",
            businessName: "Empresa SA",
            [field]: value
          }).success,
          false
        );
      }
    });
  });

  it("rejects invalid email addresses for either type", () => {
    assert.equal(
      createClientSchema.safeParse({
        type: "human",
        firstName: "Ana",
        lastName: "Perez",
        email: "correo-invalido"
      }).success,
      false
    );
    assert.equal(
      createClientSchema.safeParse({
        type: "legal_entity",
        businessName: "Empresa SA",
        email: "correo-invalido"
      }).success,
      false
    );
  });

  it("rejects tenantId and unknown public input fields", () => {
    assert.equal(
      createClientSchema.safeParse({
        type: "human",
        firstName: "Ana",
        lastName: "Perez",
        tenantId: clientId
      }).success,
      false
    );
  });

  it("rejects invalid client enums", () => {
    assert.equal(clientTypeSchema.safeParse("company").success, false);
    assert.equal(clientStatusSchema.safeParse("deleted").success, false);
    assert.equal(
      createClientSchema.safeParse({
        type: "human",
        firstName: "Ana",
        lastName: "Perez",
        status: "archived"
      }).success,
      false
    );
  });
});

describe("client update schema", () => {
  it("rejects an empty update", () => {
    assert.equal(updateClientSchema.safeParse({}).success, false);
  });

  it("accepts and normalizes a partial update", () => {
    const parsed = updateClientSchema.parse({ email: "  NUEVO@EJEMPLO.COM ", notes: null });

    assert.equal(parsed.email, "nuevo@ejemplo.com");
    assert.equal(parsed.notes, null);
  });

  it("supports explicit changes to human with required identity fields", () => {
    assert.equal(
      updateClientSchema.safeParse({
        type: "human",
        firstName: "Ana",
        lastName: "Perez",
        dni: "30111222"
      }).success,
      true
    );
    assert.equal(updateClientSchema.safeParse({ type: "human", firstName: "Ana" }).success, false);
  });

  it("supports explicit changes to legal entity with a businessName", () => {
    assert.equal(
      updateClientSchema.safeParse({
        type: "legal_entity",
        businessName: "Empresa SA",
        cuit: "30711222334"
      }).success,
      true
    );
    assert.equal(updateClientSchema.safeParse({ type: "legal_entity" }).success, false);
  });

  it("rejects mixed type-specific fields", () => {
    assert.equal(
      updateClientSchema.safeParse({ firstName: "Ana", businessName: "Empresa SA" }).success,
      false
    );
  });

  it("rejects tenantId and archived as a generic update", () => {
    assert.equal(updateClientSchema.safeParse({ tenantId: clientId }).success, false);
    assert.equal(updateClientSchema.safeParse({ status: "archived" }).success, false);
  });
});

describe("client list query and cursor schemas", () => {
  it("accepts valid filters and applies pagination defaults", () => {
    const parsed = listClientsQuerySchema.parse({
      search: "  Ana Perez ",
      type: "human",
      status: "active"
    });

    assert.equal(parsed.search, "Ana Perez");
    assert.equal(parsed.type, "human");
    assert.equal(parsed.status, "active");
    assert.equal(parsed.limit, 20);
    assert.equal(parsed.sort, "name");
    assert.equal(parsed.order, "asc");
  });

  it("rejects invalid filters and enums", () => {
    assert.equal(listClientsQuerySchema.safeParse({ type: "company" }).success, false);
    assert.equal(listClientsQuerySchema.safeParse({ status: "deleted" }).success, false);
    assert.equal(listClientsQuerySchema.safeParse({ sort: "dni" }).success, false);
    assert.equal(listClientsQuerySchema.safeParse({ order: "up" }).success, false);
    assert.equal(listClientsQuerySchema.safeParse({ tenantId: clientId }).success, false);
  });

  it("accepts pagination limits from 1 through 100", () => {
    assert.equal(listClientsQuerySchema.parse({ limit: "1" }).limit, 1);
    assert.equal(listClientsQuerySchema.parse({ limit: "100" }).limit, 100);
  });

  it("rejects pagination limits outside 1 through 100", () => {
    assert.equal(listClientsQuerySchema.safeParse({ limit: 0 }).success, false);
    assert.equal(listClientsQuerySchema.safeParse({ limit: 101 }).success, false);
    assert.equal(listClientsQuerySchema.safeParse({ limit: 1.5 }).success, false);
  });

  it("accepts a valid compound cursor bound to the query context", () => {
    const cursor: ClientCursor = {
      id: clientId,
      order: "desc",
      search: "Ana",
      sort: "createdAt",
      status: "active",
      type: "human",
      value: "2026-08-27T12:00:00.000Z",
      version: 1
    };
    const token = encodeCursor(cursor);

    assert.equal(clientCursorSchema.safeParse(cursor).success, true);
    assert.equal(
      listClientsQuerySchema.safeParse({
        cursor: token,
        order: "desc",
        search: "Ana",
        sort: "createdAt",
        status: "active",
        type: "human"
      }).success,
      true
    );
  });

  it("rejects malformed cursors", () => {
    assert.equal(listClientsQuerySchema.safeParse({ cursor: "not-a-cursor" }).success, false);
  });

  it("rejects cursors from a different search, filter, sort or order", () => {
    const token = encodeCursor({
      id: clientId,
      order: "asc",
      search: null,
      sort: "name",
      status: "active",
      type: "human",
      value: "Ana Perez",
      version: 1
    });

    assert.equal(
      listClientsQuerySchema.safeParse({
        cursor: token,
        order: "desc",
        sort: "name",
        status: "active",
        type: "human"
      }).success,
      false
    );
    assert.equal(
      listClientsQuerySchema.safeParse({
        cursor: token,
        order: "asc",
        search: "Ana",
        sort: "name",
        status: "active",
        type: "human"
      }).success,
      false
    );
    assert.equal(
      listClientsQuerySchema.safeParse({
        cursor: token,
        order: "asc",
        sort: "name",
        status: "inactive",
        type: "human"
      }).success,
      false
    );
  });
});

function encodeCursor(cursor: ClientCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}
