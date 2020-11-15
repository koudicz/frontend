import "@material/mwc-fab";
import "@material/mwc-icon-button";
import { mdiPlus, mdiHelpCircle, mdiDelete } from "@mdi/js";
import "@polymer/paper-tooltip/paper-tooltip";
import {
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import { DataTableColumnContainer } from "../../../components/data-table/ha-data-table";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../components/entity/ha-entity-toggle";
import "../../../components/ha-svg-icon";
import "../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { configSections } from "../ha-panel-config";
import { documentationUrl } from "../../../util/documentation-url";
import {
  BlueprintMetaData,
  Blueprints,
  deleteBlueprint,
} from "../../../data/blueprint";
import { showAddBlueprintDialog } from "./show-dialog-import-blueprint";
import { showAutomationEditor } from "../../../data/automation";
import { fireEvent } from "../../../common/dom/fire_event";

interface BlueprintMetaDataPath extends BlueprintMetaData {
  path: string;
}

const createNewFunctions = {
  automation: (
    context: HaBlueprintOverview,
    blueprintMeta: BlueprintMetaDataPath
  ) => {
    showAutomationEditor(context, {
      alias: blueprintMeta.name,
      use_blueprint: { path: blueprintMeta.path },
    });
  },
};

@customElement("ha-blueprint-overview")
class HaBlueprintOverview extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Boolean }) public narrow!: boolean;

  @property() public route!: Route;

  @property() public blueprints!: Blueprints;

  private _blueprints = memoizeOne((blueprints: Blueprints) => {
    let result: any[] = [];
    result = result.concat(
      Object.entries(blueprints).map(([path, blueprint]) => ({
        ...blueprint.metadata,
        path,
      }))
    );
    return result;
  });

  private _columns = memoizeOne(
    (_language): DataTableColumnContainer => {
      const columns: DataTableColumnContainer = {
        name: {
          title: this.hass.localize(
            "ui.panel.config.blueprint.picker.headers.name"
          ),
          sortable: true,
          filterable: true,
          direction: "asc",
          grows: true,
        },
      };
      columns.domain = {
        title: "Domain",
        sortable: true,
        filterable: true,
        direction: "asc",
        width: "20%",
      };
      columns.path = {
        title: "Path",
        sortable: true,
        filterable: true,
        direction: "asc",
        width: "20%",
      };
      columns.create = {
        title: "",
        type: "icon-button",
        template: (_, blueprint) => html`<mwc-icon-button
          .blueprint=${blueprint}
          @click=${(ev) => this._createNew(ev)}
          ><ha-svg-icon .path=${mdiPlus}></ha-svg-icon
        ></mwc-icon-button>`,
      };
      columns.delete = {
        title: "",
        type: "icon-button",
        template: (_, blueprint) => html`<mwc-icon-button
          .blueprint=${blueprint}
          @click=${(ev) => this._delete(ev)}
          ><ha-svg-icon .path=${mdiDelete}></ha-svg-icon
        ></mwc-icon-button>`,
      };
      return columns;
    }
  );

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.automation}
        .columns=${this._columns(this.hass.language)}
        .data=${this._blueprints(this.blueprints)}
        id="entity_id"
        .noDataText=${this.hass.localize(
          "ui.panel.config.blueprint.picker.no_blueprints"
        )}
        hasFab
      >
        <mwc-icon-button slot="toolbar-icon" @click=${this._showHelp}>
          <ha-svg-icon .path=${mdiHelpCircle}></ha-svg-icon>
        </mwc-icon-button>
        <mwc-fab
          slot="fab"
          title=${this.hass.localize(
            "ui.panel.config.blueprint.picker.add_blueprint"
          )}
          @click=${this._addBlueprint}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </mwc-fab>
      </hass-tabs-subpage-data-table>
    `;
  }

  private _showHelp() {
    showAlertDialog(this, {
      title: this.hass.localize("ui.panel.config.blueprint.caption"),
      text: html`
        ${this.hass.localize("ui.panel.config.blueprint.picker.introduction")}
        <p>
          <a
            href="${documentationUrl(this.hass, "/docs/blueprint/editor/")}"
            target="_blank"
            rel="noreferrer"
          >
            ${this.hass.localize("ui.panel.config.blueprint.picker.learn_more")}
          </a>
        </p>
      `,
    });
  }

  private _addBlueprint() {
    showAddBlueprintDialog(this, { importedCallback: () => this._reload() });
  }

  private _reload() {
    fireEvent(this, "reload-blueprints");
  }

  private _createNew(ev) {
    const blueprint = ev.currentTarget.blueprint as BlueprintMetaDataPath;
    createNewFunctions[blueprint.domain](this, blueprint);
  }

  private async _delete(ev) {
    const blueprint = ev.currentTarget.blueprint;
    if (
      !(await showConfirmationDialog(this, {
        title: "Remove this Blueprint?",
        text: "Are you sure you want to delete this Blueprint?",
      }))
    ) {
      return;
    }
    await deleteBlueprint(this.hass, blueprint.domain, blueprint.path);
    fireEvent(this, "reload-blueprints");
  }

  static get styles(): CSSResult {
    return haStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-blueprint-overview": HaBlueprintOverview;
  }
}
