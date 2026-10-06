import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { axe } from "vitest-axe";
import { MemoryKeyStore } from "../../../adapters/memory-key-store";
import { WebCryptoProvider } from "../../../adapters/webcrypto-provider";
import { App } from "../../../app/App";
import { SessionProvider } from "../../../app/session";
import { initI18n } from "../../../i18n";
import { fr } from "../../../i18n/fr";
import { FakeClock, MemoryStorage, RecordingLogger, willServices } from "../../../test/doubles";
import { ProfileService } from "../../profile/data/profile-service";

const CODE = "482915";
const FAST = { algorithm: "argon2id", memoryKiB: 64, iterations: 1, parallelism: 1 } as const;
const noContrast = { rules: { "color-contrast": { enabled: false } } };
const readBlob = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsBinaryString(blob);
  });
type User = ReturnType<typeof userEvent.setup>;

beforeAll(async () => {
  await initI18n();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

/** Real WebCrypto (fast Argon2id), in-memory storage: the same code path as the browser. */
function setup() {
  const storage = new MemoryStorage();
  const keys = new MemoryKeyStore();
  const crypto = new WebCryptoProvider();
  const clock = new FakeClock();
  const profiles = new ProfileService({
    storage,
    crypto,
    keys,
    clock,
    logger: new RecordingLogger(),
    kdf: FAST,
  });
  const view = render(
    <MemoryRouter initialEntries={["/"]}>
      <SessionProvider profiles={profiles} storage={storage}>
        <App update={null} will={willServices({ storage, crypto, keys, clock })} />
      </SessionProvider>
    </MemoryRouter>,
  );
  return { storage, keys, ...view };
}

async function createProfile(user: User) {
  await user.click(await screen.findByRole("button", { name: fr.welcome.start }));
  await user.type(screen.getByLabelText(fr.create.name.label), "Léa");
  await user.click(screen.getByRole("button", { name: fr.create.name.next }));
  await user.type(screen.getByLabelText(fr.create.code.label), CODE);
  await user.click(screen.getByRole("button", { name: fr.create.code.next }));
  await user.type(screen.getByLabelText(fr.create.confirm.label), CODE);
  await user.click(screen.getByRole("button", { name: fr.create.confirm.submit }));
  await screen.findByRole("heading", { name: "Bonjour Léa" });
}

const w = fr.will;
const title = () => screen.getByRole("heading", { level: 1 }).textContent ?? "";
const nextButton = () =>
  screen.getByRole("button", {
    name: new RegExp(`^(${w.wizard.next}|${w.wizard.skip}|${w.wizard.finish})$`),
  });

async function openLegs(user: User) {
  await user.click(screen.getByRole("link", { name: fr.home.legsOpen }));
  await screen.findByRole("heading", { level: 1, name: w.hub.title });
}

async function answer(user: User, label: string) {
  await user.click(screen.getByRole("radio", { name: label }));
  await user.click(nextButton());
}

/** Walks the whole draft flow with "no" everywhere: a person with nothing that needs a professional. */
async function fillDraft(user: User, opts: { children?: boolean } = {}) {
  await user.click(
    within(screen.getByRole("region", { name: w.hub.cards.draft.title })).getByRole("link"),
  );
  await user.type(screen.getByLabelText(w.q.testatorFullName.label), "Personne Fictive");
  await user.click(nextButton());
  await answer(user, w.q.maritalStatus.options.single);
  await answer(user, w.options.answer[opts.children ? "yes" : "no"]); // children
  if (opts.children) {
    await answer(user, w.options.answer.no); // minor children
    await answer(user, w.options.answer.no); // blended family
  }
  for (let i = 0; i < 5; i++) await answer(user, w.options.answer.no); // insurance, real estate, business, abroad, residence
  await answer(user, w.options.answer.no); // nationality
  await answer(user, w.q.legalProtection.options.none);
  await user.click(
    screen.getByRole("button", {
      name: w.q.beneficiary.more.yes.replace("quelqu'un", "quelqu'un"),
    }),
  );
  await user.type(screen.getByLabelText(w.q.beneficiary.name.label), "Alex Exemple");
  await user.click(nextButton());
  await answer(user, w.q.beneficiary.kind.options["natural-person"]);
  await answer(user, w.options.answer.no); // minor
  await user.click(screen.getByRole("button", { name: w.q.beneficiary.more.no }));
  await user.click(screen.getByRole("button", { name: w.q.provision.more.yes }));
  await user.type(screen.getByLabelText(w.q.provision.subject.label), "Mon vélo");
  await user.click(nextButton());
  await answer(user, w.q.provision.clause.options.none);
  await user.click(screen.getByRole("button", { name: w.q.provision.more.no }));
  await user.click(screen.getByRole("checkbox"));
  await user.click(nextButton());
}

describe("the will journey", () => {
  it("shows a permanent warning with no way to hide it on every screen of the journey", async () => {
    const user = userEvent.setup();
    setup();
    await createProfile(user);
    await openLegs(user);
    const hasDisclaimer = () => {
      const region = screen.getByTestId("will-disclaimer");
      expect(region).toHaveTextContent(w.disclaimer.notLegalAdvice);
      expect(region).toHaveTextContent(w.disclaimer.handwrittenFormRequired);
      expect(region).toHaveTextContent(w.disclaimer.consultNotary);
      expect(within(region).queryByRole("button")).toBeNull();
    };
    hasDisclaimer();
    for (const link of [w.hub.review, w.hub.export, w.hub.history]) {
      await user.click(screen.getAllByRole("link", { name: link })[0]!);
      await waitFor(() => expect(title()).not.toBe(w.hub.title));
      hasDisclaimer();
      await user.click(screen.getByRole("link", { name: w.nav.back }));
    }
    await user.click(screen.getAllByRole("link", { name: new RegExp(w.hub.start) })[0]!);
    hasDisclaimer();
  });

  it("asks one question per screen", async () => {
    const user = userEvent.setup();
    setup();
    await createProfile(user);
    await openLegs(user);
    await user.click(
      within(screen.getByRole("region", { name: w.hub.cards.draft.title })).getByRole("link"),
    );
    for (let i = 0; i < 4; i++) {
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      const inputs =
        screen.queryAllByRole("textbox").length + screen.queryAllByRole("group").length;
      expect(inputs).toBe(1);
      await user.click(nextButton());
    }
  });

  it("saves automatically, and the answers are still there after locking and unlocking", async () => {
    const user = userEvent.setup();
    setup();
    await createProfile(user);
    await openLegs(user);
    await user.click(
      within(screen.getByRole("region", { name: w.hub.cards.draft.title })).getByRole("link"),
    );
    await user.type(screen.getByLabelText(w.q.testatorFullName.label), "Personne Fictive");
    expect(await screen.findByText(/Enregistré à/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: fr.home.lock }));
    await user.type(await screen.findByLabelText(fr.unlock.label), CODE);
    await user.click(screen.getByRole("button", { name: fr.unlock.submit }));
    // Unlocking brings the user back exactly where they were, with their answer.
    expect(await screen.findByLabelText(w.q.testatorFullName.label)).toHaveValue(
      "Personne Fictive",
    );
    await user.click(screen.getByRole("button", { name: w.save.exit }));
    expect(screen.getByRole("link", { name: new RegExp(w.hub.resume) })).toBeInTheDocument();
  });

  it("a person with nothing special reaches 'complet selon notre checklist', never 'valide'", async () => {
    const user = userEvent.setup();
    setup();
    await createProfile(user);
    await openLegs(user);
    await fillDraft(user);
    await screen.findByRole("heading", { level: 1, name: w.review.title });
    expect(screen.getByText(w.review.allComplete)).toBeInTheDocument();
    expect(screen.getAllByText(w.status.complete).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/\bvalid/i);
    // The notary is presented as the final step, as good practice.
    expect(screen.getByText(w.review.notary.title)).toBeInTheDocument();
    expect(screen.getByText(w.review.notary.recommended)).toBeInTheDocument();
  });

  it("a situation that needs a professional blocks the review step and sends to a notary", async () => {
    const user = userEvent.setup();
    setup();
    await createProfile(user);
    await openLegs(user);
    await fillDraft(user, { children: true });
    await screen.findByRole("heading", { level: 1, name: w.review.title });
    expect(screen.getAllByText(w.status["professional-required"]).length).toBeGreaterThan(0);
    expect(screen.getByText(w.finding.blocking["reserved-heirs_children"])).toBeInTheDocument();
    expect(screen.getByText(w.review.blockedExport)).toBeInTheDocument();
    expect(screen.getByText(w.review.notary.required)).toBeInTheDocument();
    expect(screen.queryByText(w.review.allComplete)).toBeNull();
    // ...and the text to copy by hand is not offered.
    await user.click(screen.getByRole("link", { name: w.review.toExport }));
    await screen.findByRole("heading", { level: 1, name: w.export.title });
    expect(screen.queryByRole("button", { name: w.export.draft.download })).toBeNull();
    expect(screen.getByText(w.export.blocked)).toBeInTheDocument();
  });

  it("produces two distinct PDFs and keeps each export in the history", async () => {
    const user = userEvent.setup();
    const blobs: Blob[] = [];
    const names: string[] = [];
    URL.createObjectURL = (b: Blob | MediaSource) => {
      blobs.push(b as Blob);
      return `blob:test-${blobs.length}`;
    };
    URL.revokeObjectURL = () => undefined;
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) names.push(this.download);
    };
    try {
      setup();
      await createProfile(user);
      await openLegs(user);
      await fillDraft(user);
      // wishes: funeral wishes + "no body wishes", then nothing else
      await user.click(screen.getByRole("link", { name: w.nav.back }));
      await user.click(
        within(screen.getByRole("region", { name: w.hub.cards.wishes.title })).getByRole("link"),
      );
      await user.type(screen.getByLabelText(w.q.funeral.label), "Une cérémonie simple.");
      await user.click(nextButton());
      await answer(user, w.options.answer.no);
      await user.click(screen.getByRole("button", { name: w.q.message.more.no }));
      await user.click(screen.getByRole("button", { name: w.q.paper.more.no }));
      await screen.findByRole("heading", { level: 1, name: w.review.title });

      await user.click(screen.getByRole("link", { name: w.review.toExport }));
      expect(await screen.findByText(w.export.plaintextWarning)).toBeInTheDocument();
      await user.click(await screen.findByRole("button", { name: w.export.draft.download }));
      await user.click(screen.getByRole("button", { name: w.export.wishes.download }));
      await waitFor(() => expect(blobs).toHaveLength(2));

      expect(names).toEqual(["brouillon-testament-a-recopier.pdf", "document-de-volontes.pdf"]);
      const [a, b] = await Promise.all(blobs.map(readBlob));
      expect(a).toMatch(/^%PDF-/);
      expect(b).toMatch(/^%PDF-/);
      expect(a).toContain("Personne Fictive");
      expect(a).not.toContain("simple");
      expect(b).toContain("simple");
      expect(b).not.toContain("Personne Fictive");

      await user.click(screen.getByRole("link", { name: w.nav.back }));
      await user.click(screen.getByRole("link", { name: w.hub.history }));
      await screen.findByRole("heading", { level: 1, name: w.history.title });
      expect(screen.getAllByText(/^Version \d+ — /).length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText(w.history.integrity)).toBeInTheDocument();
    } finally {
      HTMLAnchorElement.prototype.click = click;
    }
  });

  it("has no automated accessibility violation on its screens", async () => {
    const user = userEvent.setup();
    const { container } = setup();
    await createProfile(user);
    await openLegs(user);
    expect(await axe(container, noContrast)).toHaveNoViolations();
    await user.click(
      within(screen.getByRole("region", { name: w.hub.cards.draft.title })).getByRole("link"),
    );
    expect(await axe(container, noContrast)).toHaveNoViolations();
    await user.click(nextButton());
    expect(await axe(container, noContrast)).toHaveNoViolations(); // a choice screen
    await user.click(screen.getByRole("link", { name: w.nav.back }));
    await user.click(screen.getByRole("link", { name: w.hub.review }));
    await screen.findByRole("heading", { level: 1, name: w.review.title });
    expect(await axe(container, noContrast)).toHaveNoViolations();
  });
});
