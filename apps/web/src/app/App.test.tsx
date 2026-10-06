import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { axe } from "vitest-axe";
import { MemoryKeyStore } from "../adapters/memory-key-store";
import { ProfileService } from "../features/profile/data/profile-service";
import { initI18n } from "../i18n";
import { fr } from "../i18n/fr";
import {
  FakeClock,
  FakeCrypto,
  MemoryStorage,
  RecordingLogger,
  willServices,
} from "../test/doubles";
import { App } from "./App";
import { SessionProvider } from "./session";

const CODE = "482915";
const noContrast = { rules: { "color-contrast": { enabled: false } } };

beforeAll(async () => {
  await initI18n();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

function setup(path = "/") {
  const storage = new MemoryStorage();
  const clock = new FakeClock();
  const keys = new MemoryKeyStore();
  const crypto = new FakeCrypto();
  const profiles = new ProfileService({
    storage,
    crypto,
    keys,
    clock,
    logger: new RecordingLogger(),
  });
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider profiles={profiles} storage={storage}>
        <App update={null} will={willServices({ storage, crypto, keys, clock })} />
      </SessionProvider>
    </MemoryRouter>,
  );
  return { storage, profiles, clock, ...view };
}

async function createProfile(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: fr.welcome.start }));
  await user.type(screen.getByLabelText(fr.create.name.label), "Léa");
  await user.click(screen.getByRole("button", { name: fr.create.name.next }));
  await user.type(screen.getByLabelText(fr.create.code.label), CODE);
  await user.click(screen.getByRole("button", { name: fr.create.code.next }));
  await user.type(screen.getByLabelText(fr.create.confirm.label), CODE);
  await user.click(screen.getByRole("button", { name: fr.create.confirm.submit }));
  await screen.findByRole("heading", { name: "Bonjour Léa" });
}

describe("evaluation banner", () => {
  it("is shown on every state of the application and cannot be dismissed", async () => {
    const user = userEvent.setup();
    setup();
    const banner = await screen.findByRole("region", { name: fr.banner.title });
    expect(banner).toHaveTextContent(fr.banner.body);
    expect(within(banner).queryByRole("button")).toBeNull();
    await createProfile(user);
    expect(screen.getByRole("region", { name: fr.banner.title })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: fr.home.lock }));
    expect(screen.getByRole("region", { name: fr.banner.title })).toBeInTheDocument();
  });
});

describe("first launch", () => {
  it("explains Veille in plain language, with no account and no notary claim", async () => {
    setup();
    expect(
      await screen.findByRole("heading", { level: 1, name: fr.welcome.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(fr.welcome.local)).toBeInTheDocument();
    expect(screen.getByText(fr.welcome.notLawyer)).toBeInTheDocument();
  });

  it("has no accessibility violation on the welcome screen", async () => {
    const { container } = setup();
    await screen.findByRole("heading", { level: 1 });
    expect(await axe(container, noContrast)).toHaveNoViolations();
  });

  it("creates a profile: name, code, confirmation, then opens the space", async () => {
    const user = userEvent.setup();
    const { storage } = setup();
    await createProfile(user);
    expect(screen.getByText(fr.home.ready)).toBeInTheDocument();
    expect(storage.data.has("profile/main")).toBe(true);
  });

  it("refuses an empty name, a weak code and mismatching confirmation, each with a clear message", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(await screen.findByRole("button", { name: fr.welcome.start }));
    await user.click(screen.getByRole("button", { name: fr.create.name.next }));
    expect(screen.getByRole("alert")).toHaveTextContent(fr.create.name.required);

    await user.type(screen.getByLabelText(fr.create.name.label), "Léa");
    await user.click(screen.getByRole("button", { name: fr.create.name.next }));
    await user.type(screen.getByLabelText(fr.create.code.label), "123456");
    await user.click(screen.getByRole("button", { name: fr.create.code.next }));
    expect(screen.getByRole("alert")).toHaveTextContent(fr.create.code.sequence);

    await user.clear(screen.getByLabelText(fr.create.code.label));
    await user.type(screen.getByLabelText(fr.create.code.label), CODE);
    await user.click(screen.getByRole("button", { name: fr.create.code.next }));
    await user.type(screen.getByLabelText(fr.create.confirm.label), "482916");
    await user.click(screen.getByRole("button", { name: fr.create.confirm.submit }));
    expect(screen.getByRole("alert")).toHaveTextContent(fr.create.confirm.mismatch);
  });

  it("warns that a forgotten code cannot be recovered", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(await screen.findByRole("button", { name: fr.welcome.start }));
    await user.type(screen.getByLabelText(fr.create.name.label), "Léa");
    await user.click(screen.getByRole("button", { name: fr.create.name.next }));
    expect(screen.getByText(fr.create.code.warning)).toBeInTheDocument();
  });
});

describe("lock and unlock", () => {
  it("locks on demand, rejects a wrong code, unlocks with the right one", async () => {
    const user = userEvent.setup();
    setup();
    await createProfile(user);
    await user.click(screen.getByRole("button", { name: fr.home.lock }));
    expect(screen.getByRole("heading", { name: fr.unlock.title })).toBeInTheDocument();

    await user.type(screen.getByLabelText(fr.unlock.label), "000001");
    await user.click(screen.getByRole("button", { name: fr.unlock.submit }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Il vous reste 4 essais");

    await user.type(screen.getByLabelText(fr.unlock.label), CODE);
    await user.click(screen.getByRole("button", { name: fr.unlock.submit }));
    expect(await screen.findByRole("heading", { name: "Bonjour Léa" })).toBeInTheDocument();
  });

  it("starts locked when a profile already exists, and does not leak the name", async () => {
    const user = userEvent.setup();
    const first = setup();
    await createProfile(user);
    first.unmount();
    const storage = first.storage;
    const keys = new MemoryKeyStore();
    const crypto = new FakeCrypto();
    const profiles = new ProfileService({
      storage,
      crypto,
      keys,
      clock: first.clock,
      logger: new RecordingLogger(),
    });
    render(
      <MemoryRouter>
        <SessionProvider profiles={profiles} storage={storage}>
          <App update={null} will={willServices({ storage, crypto, keys, clock: first.clock })} />
        </SessionProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { name: fr.unlock.title })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("Léa");
  });

  it("limits attempts: after five failures the field is disabled and a wait is announced", async () => {
    const user = userEvent.setup();
    setup();
    await createProfile(user);
    await user.click(screen.getByRole("button", { name: fr.home.lock }));
    for (let i = 0; i < 5; i++) {
      await user.type(screen.getByLabelText(fr.unlock.label), "000001");
      await user.click(screen.getByRole("button", { name: fr.unlock.submit }));
      await waitFor(() => expect(screen.getByLabelText(fr.unlock.label)).toHaveValue(""));
    }
    expect(await screen.findByRole("status")).toHaveTextContent("patientez 30 secondes");
    expect(screen.getByLabelText(fr.unlock.label)).toBeDisabled();
    expect(screen.getByRole("button", { name: fr.unlock.submit })).toBeDisabled();
  });

  it("locks itself when the tab becomes hidden", async () => {
    const user = userEvent.setup();
    setup();
    await createProfile(user);
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(await screen.findByRole("heading", { name: fr.unlock.title })).toBeInTheDocument();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
  });

  it("locks itself after inactivity", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      setup();
      await createProfile(user);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5 * 60_000 + 1000);
      });
      expect(await screen.findByRole("heading", { name: fr.unlock.title })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("Where is my data?", () => {
  it("is reachable before any profile exists and explains the situation in plain words", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(await screen.findByRole("link", { name: fr.welcome.whereData }));
    expect(
      await screen.findByRole("heading", { level: 1, name: fr.data.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(fr.data.onDevice.body)).toBeInTheDocument();
    expect(screen.getByText(fr.data.notDone.items[2]!)).toBeInTheDocument();
    expect(screen.getByText(fr.data.evaluation.body)).toBeInTheDocument();
  });

  it("shows the persistence state and lets the user ask for protection (R26)", async () => {
    const user = userEvent.setup();
    const { storage } = setup("/donnees");
    const state = await screen.findByTestId("persistence-state");
    await waitFor(() => expect(state).toHaveAttribute("data-state", "best-effort"));
    expect(state).toHaveTextContent(fr.data.persistence["best-effort"]);
    await user.click(screen.getByRole("button", { name: fr.data.persistence.request }));
    expect(storage.persistRequests).toBe(1);
    await waitFor(() =>
      expect(screen.getByTestId("persistence-state")).toHaveAttribute("data-state", "persisted"),
    );
    expect(screen.getByRole("status")).toHaveTextContent(fr.data.persistence.granted);
    expect(screen.queryByRole("button", { name: fr.data.persistence.request })).toBeNull();
  });

  it("states when the browser cannot say", async () => {
    const storage = new MemoryStorage();
    storage.persistenceState = "unsupported";
    const keys = new MemoryKeyStore();
    const crypto = new FakeCrypto();
    const clock = new FakeClock();
    const profiles = new ProfileService({
      storage,
      crypto,
      keys,
      clock,
      logger: new RecordingLogger(),
    });
    render(
      <MemoryRouter initialEntries={["/donnees"]}>
        <SessionProvider profiles={profiles} storage={storage}>
          <App update={null} will={willServices({ storage, crypto, keys, clock })} />
        </SessionProvider>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("persistence-state")).toHaveAttribute("data-state", "unsupported"),
    );
    expect(screen.getByTestId("persistence-state")).toHaveTextContent(
      fr.data.persistence.unsupported,
    );
  });

  it("requires a confirmation before deleting everything, then really deletes", async () => {
    const user = userEvent.setup();
    const { storage } = setup();
    await createProfile(user);
    await user.click(screen.getByRole("link", { name: fr.home.whereData }));
    await user.click(await screen.findByRole("button", { name: fr.data.delete.button }));
    const dialog = screen.getByRole("dialog", { name: fr.data.delete.title });
    await user.click(within(dialog).getByRole("button", { name: fr.data.delete.cancel }));
    expect(storage.data.size).toBe(1);

    await user.click(screen.getByRole("button", { name: fr.data.delete.button }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: fr.data.delete.confirm }),
    );
    await waitFor(() => expect(storage.data.size).toBe(0));
    expect(await screen.findByText(fr.data.delete.done)).toBeInTheDocument();
  });

  it("has no accessibility violation", async () => {
    const { container } = setup("/donnees");
    await screen.findByRole("heading", { level: 1, name: fr.data.title });
    expect(await axe(container, noContrast)).toHaveNoViolations();
  });
});
