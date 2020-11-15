import "@material/mwc-button";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-input/paper-input";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import "../../../components/ha-circular-progress";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  query,
  TemplateResult,
} from "lit-element";
import "../../../components/ha-dialog";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { fireEvent } from "../../../common/dom/fire_event";
import {
  BlueprintImportResult,
  importBlueprint,
  saveBlueprint,
} from "../../../data/blueprint";

@customElement("ha-dialog-import-blueprint")
class DialogImportBlueprint extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _params?;

  @internalProperty() private _importing = false;

  @internalProperty() private _saving = false;

  @internalProperty() private _error?: string;

  @internalProperty() private _result?: BlueprintImportResult;

  @query("#input") private _input?: PaperInputElement;

  public showDialog(params): void {
    this._params = params;
    this._error = undefined;
  }

  public closeDialog(): void {
    this._error = undefined;
    this._result = undefined;
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    return html`
      <ha-dialog open @closed=${this.closeDialog} heading="Add new blueprint">
        <div>
          ${this._error ? html` <div class="error">${this._error}</div> ` : ""}
          ${this._result
            ? html`Import <b>${this._result.blueprint.metadata.name}</b> (${this
                  ._result.blueprint.metadata.domain})
                <paper-input
                  id="input"
                  .value=${this._result.suggested_filename}
                  label="Filename"
                ></paper-input>
                <pre>${this._result.raw_data}</pre>`
            : html`<paper-input
                id="input"
                label="Url of the blueprint"
                dialogInitialFocus
              ></paper-input>`}
        </div>
        ${!this._result
          ? html`<mwc-button
              slot="primaryAction"
              @click=${this._import}
              .disabled=${this._importing}
            >
              ${this._importing
                ? html`<ha-circular-progress
                    active
                    size="small"
                    title="Importing blueprint..."
                  ></ha-circular-progress>`
                : ""}
              Import blueprint
            </mwc-button>`
          : html`<mwc-button
                slot="secondaryAction"
                @click=${this.closeDialog}
                .disabled=${this._saving}
              >
                Cancel
              </mwc-button>
              <mwc-button
                slot="primaryAction"
                @click=${this._save}
                .disabled=${this._saving}
              >
                ${this._saving
                  ? html`<ha-circular-progress
                      active
                      size="small"
                      title="Saving blueprint..."
                    ></ha-circular-progress>`
                  : ""}
                Save blueprint
              </mwc-button>`}
      </ha-dialog>
    `;
  }

  private async _import() {
    this._importing = true;
    try {
      const url = this._input?.value;
      if (!url) {
        return;
      }
      this._result = await importBlueprint(this.hass, url);
    } catch (e) {
      this._error = e.message;
    } finally {
      this._importing = false;
    }
  }

  private async _save() {
    this._saving = true;
    try {
      const filename = this._input?.value;
      if (!filename) {
        return;
      }
      await saveBlueprint(
        this.hass,
        this._result!.blueprint.metadata.domain,
        filename,
        this._result!.raw_data,
        this._result!.url
      );
      this._params.importedCallback();
      this.closeDialog();
    } catch (e) {
      this._error = e.message;
    } finally {
      this._saving = false;
    }
  }

  static get styles(): CSSResult[] {
    return [haStyleDialog, css``];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-import-blueprint": DialogImportBlueprint;
  }
}
