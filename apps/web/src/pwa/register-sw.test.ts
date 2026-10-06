import { registerServiceWorker, type UpdateHandle } from "./register-sw";

type Listener = () => void;

function fakeServiceWorkerContainer(hasController: boolean) {
  const listeners: Record<string, Listener[]> = {};
  const waiting = { postMessage: vi.fn() };
  const registration = {
    waiting: null as typeof waiting | null,
    installing: null,
    addEventListener: vi.fn(),
  };
  const container = {
    controller: hasController ? {} : null,
    register: vi.fn(async () => registration),
    addEventListener: (type: string, fn: Listener) => (listeners[type] ??= []).push(fn),
  };
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: container });
  return {
    container,
    registration,
    waiting,
    fire: (type: string) => listeners[type]?.forEach((fn) => fn()),
  };
}

describe("registerServiceWorker", () => {
  const reload = vi.fn();
  beforeEach(() => {
    vi.stubEnv("PROD", true);
    vi.stubGlobal("location", { ...window.location, reload });
    reload.mockClear();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  async function boot(
    sw: ReturnType<typeof fakeServiceWorkerContainer>,
    onUpdate: (h: UpdateHandle) => void,
  ) {
    registerServiceWorker(onUpdate);
    window.dispatchEvent(new Event("load"));
    await vi.waitFor(() => expect(sw.container.register).toHaveBeenCalled());
    await Promise.resolve();
  }

  it("registers under the deployment scope", async () => {
    const sw = fakeServiceWorkerContainer(false);
    await boot(sw, vi.fn());
    expect(sw.container.register).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    });
  });

  it("never reloads the page on the first install (controllerchange from clients.claim)", async () => {
    const sw = fakeServiceWorkerContainer(false);
    await boot(sw, vi.fn());
    sw.fire("controllerchange");
    expect(reload).not.toHaveBeenCalled();
  });

  it("offers a waiting update instead of applying it silently, and reloads only once accepted", async () => {
    const sw = fakeServiceWorkerContainer(true);
    sw.registration.waiting = sw.waiting;
    const onUpdate = vi.fn();
    await boot(sw, onUpdate);
    expect(onUpdate).toHaveBeenCalledOnce();
    expect(sw.waiting.postMessage).not.toHaveBeenCalled();
    sw.fire("controllerchange");
    expect(reload).not.toHaveBeenCalled();

    (onUpdate.mock.calls[0]?.[0] as UpdateHandle).apply();
    expect(sw.waiting.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
    sw.fire("controllerchange");
    expect(reload).toHaveBeenCalledOnce();
  });
});
