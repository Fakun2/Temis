import "reflect-metadata";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PERMISSIONS_KEY } from "../src/auth/permissions.decorator";
import { AccountController } from "../src/account/account.controller";
import { NotificationsController } from "../src/notifications/notifications.controller";

function permissionsFor(target: object, method: string) {
  return Reflect.getMetadata(PERMISSIONS_KEY, target[method as keyof typeof target]) as string[];
}

describe("account and notifications RBAC metadata", () => {
  it("declares explicit permissions for every account operation", () => {
    assert.deepEqual(permissionsFor(AccountController.prototype, "getAccount"), ["account:read"]);
    assert.deepEqual(permissionsFor(AccountController.prototype, "getAiUsage"), ["account:ai_usage_read"]);
    assert.deepEqual(permissionsFor(AccountController.prototype, "getAvatar"), ["account:read"]);
    assert.deepEqual(permissionsFor(AccountController.prototype, "uploadAvatar"), ["account:self_manage"]);
    assert.deepEqual(permissionsFor(AccountController.prototype, "updateProfile"), ["account:self_manage"]);
    assert.deepEqual(permissionsFor(AccountController.prototype, "updateStudio"), ["account:studio_manage"]);
    assert.deepEqual(permissionsFor(AccountController.prototype, "updateNotifications"), ["account:self_manage"]);
    assert.deepEqual(permissionsFor(AccountController.prototype, "updateMembership"), ["account:membership_manage"]);
    assert.deepEqual(permissionsFor(AccountController.prototype, "validatePasswordChange"), ["account:self_manage"]);
    assert.deepEqual(permissionsFor(AccountController.prototype, "updatePassword"), ["account:self_manage"]);
  });

  it("declares read and update permissions for personal notifications", () => {
    assert.deepEqual(permissionsFor(NotificationsController.prototype, "list"), ["notifications:read"]);
    assert.deepEqual(permissionsFor(NotificationsController.prototype, "stream"), ["notifications:read"]);
    assert.deepEqual(permissionsFor(NotificationsController.prototype, "markRead"), ["notifications:update"]);
  });
});
