// @vitest-environment node
import { WebCryptoProvider } from "../../../adapters/webcrypto-provider";
import { MemoryKeyStore } from "../../../adapters/memory-key-store";
import { FakeClock, MemoryStorage, RecordingLogger } from "../../../test/doubles";
import { FREE_ATTEMPTS } from "../domain/lockout-policy";
import { ProfileService } from "./profile-service";

// Real WebCrypto + real Argon2id, with cheap parameters so the suite stays fast.
const FAST = { algorithm: "argon2id", memoryKiB: 64, iterations: 1, parallelism: 1 } as const;

function setup() {
  const storage = new MemoryStorage();
  const keys = new MemoryKeyStore();
  const clock = new FakeClock();
  const logger = new RecordingLogger();
  const service = new ProfileService({
    storage,
    crypto: new WebCryptoProvider(),
    keys,
    clock,
    logger,
    kdf: FAST,
  });
  return { storage, keys, clock, logger, service };
}
const CODE = "482915";

describe("ProfileService", () => {
  it("creates a profile, unlocked, and refuses a second one", async () => {
    const { service, keys } = setup();
    expect(await service.exists()).toBe(false);
    expect(await service.create({ firstName: " Léa ", code: CODE })).toEqual({
      status: "created",
      profile: { schemaVersion: 1, firstName: "Léa" },
    });
    expect(await service.exists()).toBe(true);
    expect(keys.isEmpty()).toBe(false);
    expect((await service.create({ firstName: "Autre", code: "135792" })).status).toBe("exists");
  });

  it("rejects an invalid name or code without writing anything", async () => {
    const { service, storage } = setup();
    expect((await service.create({ firstName: "  ", code: CODE })).status).toBe("invalid");
    expect((await service.create({ firstName: "Léa", code: "123456" })).status).toBe("invalid");
    expect(storage.data.size).toBe(0);
  });

  it("never persists the code, the key or the first name in clear", async () => {
    const { service, storage } = setup();
    await service.create({ firstName: "Léa Dupont", code: CODE });
    const stored = [...storage.data.values()]
      .map((v) => new TextDecoder("latin1").decode(v))
      .join("|");
    expect(stored).not.toContain(CODE);
    expect(stored).not.toContain("Léa");
    expect(stored).not.toContain("Dupont");
    expect(stored).toContain("ciphertext");
  });

  it("locks, then unlocks only with the right code", async () => {
    const { service, keys } = setup();
    await service.create({ firstName: "Léa", code: CODE });
    service.lock();
    expect(keys.isEmpty()).toBe(true);
    expect(service.isUnlocked()).toBe(false);
    expect(await service.unlock("135792")).toEqual({
      status: "wrong-code",
      attemptsLeft: FREE_ATTEMPTS - 1,
    });
    expect(keys.isEmpty()).toBe(true);
    const ok = await service.unlock(CODE);
    expect(ok).toEqual({ status: "unlocked", profile: { schemaVersion: 1, firstName: "Léa" } });
    expect(keys.isEmpty()).toBe(false);
  });

  it("imposes a wait after the free attempts, even for the right code, then releases it", async () => {
    const { service, clock } = setup();
    await service.create({ firstName: "Léa", code: CODE });
    service.lock();
    for (let i = 0; i < FREE_ATTEMPTS - 1; i++) await service.unlock("000001");
    const last = await service.unlock("000001");
    expect(last).toEqual({ status: "locked-out", retryAfterMs: 30_000 });
    expect(await service.unlock(CODE)).toEqual({ status: "locked-out", retryAfterMs: 30_000 });
    clock.advance(30_001);
    expect((await service.unlock(CODE)).status).toBe("unlocked");
  });

  it("a successful unlock resets the failure counter", async () => {
    const { service } = setup();
    await service.create({ firstName: "Léa", code: CODE });
    await service.unlock("000001");
    await service.unlock("000001");
    await service.unlock(CODE);
    expect(await service.unlock("000001")).toEqual({
      status: "wrong-code",
      attemptsLeft: FREE_ATTEMPTS - 1,
    });
  });

  it("counts a failure before deriving, so abandoning an attempt is not free", async () => {
    const storage = new MemoryStorage();
    const real = new WebCryptoProvider();
    let release: () => void = () => undefined;
    let blocked = false;
    const crypto = Object.create(real) as WebCryptoProvider;
    crypto.deriveKey = async (...args) => {
      if (blocked) await new Promise<void>((resolve) => (release = resolve));
      return real.deriveKey(...args);
    };
    const service = new ProfileService({
      storage,
      crypto,
      keys: new MemoryKeyStore(),
      clock: new FakeClock(),
      logger: new RecordingLogger(),
      kdf: FAST,
    });
    await service.create({ firstName: "Léa", code: CODE });
    service.lock();

    blocked = true;
    const pending = service.unlock(CODE);
    await vi.waitFor(() => {
      const record = JSON.parse(new TextDecoder().decode(storage.data.get("profile/main"))) as {
        failedAttempts: number;
      };
      expect(record.failedAttempts).toBe(1); // recorded while the derivation is still running
    });
    release();
    expect((await pending).status).toBe("unlocked");
    const record = JSON.parse(new TextDecoder().decode(storage.data.get("profile/main"))) as {
      failedAttempts: number;
    };
    expect(record.failedAttempts).toBe(0);
  });

  it("reports no profile and deletes everything for real", async () => {
    const { service, storage, keys } = setup();
    expect(await service.unlock(CODE)).toEqual({ status: "no-profile" });
    await service.create({ firstName: "Léa", code: CODE });
    await service.deleteEverything();
    expect(storage.data.size).toBe(0);
    expect(keys.isEmpty()).toBe(true);
    expect(await service.exists()).toBe(false);
  });

  it("logs events without any content", async () => {
    const { service, logger } = setup();
    await service.create({ firstName: "Léa Dupont", code: CODE });
    service.lock();
    await service.unlock("000001");
    await service.unlock(CODE);
    const log = logger.lines.join("\n");
    expect(log).not.toContain("Léa");
    expect(log).not.toContain(CODE);
    expect(log).toContain("unlock.failed");
  });
});
