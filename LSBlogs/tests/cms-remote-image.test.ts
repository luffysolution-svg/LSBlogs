import assert from "node:assert/strict";
import test from "node:test";
import { isBlockedRemoteAddress } from "../lib/cms/remote-image";

test("blocks private and metadata-service image source addresses", () => {
  for (const address of ["127.0.0.1", "10.0.0.5", "172.16.1.2", "192.168.1.8", "169.254.169.254", "::1", "fd00::1"]) {
    assert.equal(isBlockedRemoteAddress(address), true, address);
  }
});

test("allows public image source addresses", () => {
  assert.equal(isBlockedRemoteAddress("1.1.1.1"), false);
  assert.equal(isBlockedRemoteAddress("2606:4700:4700::1111"), false);
});
