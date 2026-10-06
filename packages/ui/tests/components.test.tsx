import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  ChoiceGroup,
  ConfirmDialog,
  Progress,
  Stepper,
  TextArea,
  TextField,
} from "../src";

describe("design system", () => {
  it("has no automated accessibility violation", async () => {
    const { container } = render(
      <main>
        <h1>Titre</h1>
        <Card aria-label="Carte">
          <p>Texte</p>
          <Button>Continuer</Button>
          <Button variant="secondary">Retour</Button>
        </Card>
        <TextField label="Code" hint="Six chiffres" error="Code incorrect" code />
        <Stepper
          label="Étapes"
          steps={["Un", "Deux", "Trois"]}
          current={1}
          currentLabel="en cours"
        />
        <Alert tone="warning" title="Attention">
          Version d'évaluation
        </Alert>
        <Alert tone="info">Info</Alert>
        <Alert tone="danger">Danger</Alert>
        <Alert tone="success">Succès</Alert>
      </main>,
    );
    // color-contrast needs real layout and CSS: it is audited in the browser E2E, not in jsdom.
    expect(
      await axe(container, { rules: { "color-contrast": { enabled: false } } }),
    ).toHaveNoViolations();
  });

  it("links the field label, hint and error for assistive technology", () => {
    render(<TextField label="Code" hint="Six chiffres" error="Code incorrect" code />);
    const input = screen.getByLabelText("Code");
    expect(input).toHaveAccessibleDescription("Six chiffres Code incorrect");
    expect(input).toBeInvalid();
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("type", "password");
  });

  it("marks the current step", () => {
    render(<Stepper label="Étapes" steps={["Un", "Deux"]} current={0} currentLabel="en cours" />);
    expect(
      screen.getByRole("list", { name: "Étapes" }).querySelector('[aria-current="step"]'),
    ).toHaveTextContent("Un");
  });

  it("button is keyboard operable and never submits a form by accident", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Valider</Button>);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Valider" })).toHaveAttribute("type", "button");
  });
});

describe("ConfirmDialog", () => {
  beforeAll(() => {
    // jsdom has no <dialog> modal support.
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
    };
  });

  it("opens, confirms and cancels", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Tout supprimer ?"
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        danger
        onConfirm={onConfirm}
        onCancel={onCancel}
      >
        <p>Cette action est définitive.</p>
      </ConfirmDialog>,
    );
    expect(screen.getByRole("dialog", { name: "Tout supprimer ?" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("choice group: one native radio per option, selected value reflected, change reported", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ChoiceGroup
        legend="Avez-vous des enfants ?"
        hint="Répondez comme vous le pouvez"
        options={[
          { value: "yes", label: "Oui" },
          { value: "no", label: "Non" },
        ]}
        value="no"
        onChange={onChange}
      />,
    );
    expect(
      screen.getByRole("group", { name: "Avez-vous des enfants ?" }),
    ).toHaveAccessibleDescription("Répondez comme vous le pouvez");
    expect(screen.getByRole("radio", { name: "Non" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "Oui" }));
    expect(onChange).toHaveBeenCalledWith("yes");
  });

  it("text area and checkbox are labelled and operable", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <>
        <TextArea label="Message" hint="Quelques lignes" error="Trop court" />
        <Checkbox label="J'ai lu" onChange={onChange} />
      </>,
    );
    expect(screen.getByLabelText("Message")).toHaveAccessibleDescription(
      "Quelques lignes Trop court",
    );
    await user.click(screen.getByRole("checkbox", { name: "J'ai lu" }));
    expect(onChange).toHaveBeenCalled();
  });

  it("progress is exposed as a named progress bar", async () => {
    const { container } = render(
      <main>
        <h1>t</h1>
        <Progress label="Avancement" value={2} max={5} text="Question 2 sur 5" />
        <ChoiceGroup
          legend="L"
          options={[{ value: "a", label: "A" }]}
          value={null}
          onChange={() => undefined}
        />
      </main>,
    );
    expect(screen.getByRole("progressbar", { name: "Avancement" })).toHaveAttribute("value", "2");
    expect(
      await axe(container, { rules: { "color-contrast": { enabled: false } } }),
    ).toHaveNoViolations();
  });
});
