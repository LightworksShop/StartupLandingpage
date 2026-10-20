import { Modal } from "./common";
import { request } from "./data";
import { MediaFields } from "./media-library";
import "./styles.css";
import { MediaPreview, ProductPicker } from "./workspace-model";

export default function EditMediaDialog({
  setMediaEditor,
  busy,
  productsLoading,
  productsError,
  data,
  mediaEditor,
  folders,
  run,
}) {
  return (
    <Modal title="Medium bearbeiten" onClose={() => setMediaEditor(null)}>
      <fieldset
        disabled={busy || productsLoading || productsError}
        aria-busy={productsLoading}
        className="mk-body"
      >
        {productsLoading && <p role="status">Lade Produktauswahl …</p>}
        <MediaPreview media={data.media.find((m) => m.id === mediaEditor.id)} />
        <p>
          {mediaEditor.labels.generated
            ? `Generiert · ${mediaEditor.labels.provenance}`
            : "Eigenes Medium"}
        </p>
        <MediaFields
          value={mediaEditor.labels}
          onChange={(labels) => setMediaEditor({ ...mediaEditor, labels })}
          folders={folders}
        />
        <label>
          Name
          <input
            value={mediaEditor.labels.name}
            onChange={(e) =>
              setMediaEditor({
                ...mediaEditor,
                labels: {
                  ...mediaEditor.labels,
                  name: e.target.value,
                },
              })
            }
          />
        </label>
        <label>
          Schlagwörter
          <input
            value={mediaEditor.labels.tags.join(",")}
            onChange={(e) =>
              setMediaEditor({
                ...mediaEditor,
                labels: {
                  ...mediaEditor.labels,
                  tags: e.target.value.split(","),
                },
              })
            }
          />
        </label>
        <ProductPicker
          products={data.products}
          value={mediaEditor.labels.product_ids}
          onChange={(ids) =>
            setMediaEditor({
              ...mediaEditor,
              labels: { ...mediaEditor.labels, product_ids: ids },
            })
          }
        />
        <button
          onClick={() =>
            run(async () => {
              await request("media", {
                ...mediaEditor,
                labels: {
                  ...mediaEditor.labels,
                  tags: mediaEditor.labels.tags
                    .map((s) => s.trim())
                    .filter(Boolean),
                },
              });
              setMediaEditor(null);
            })
          }
        >
          Speichern
        </button>
        <button onClick={() => setMediaEditor(null)}>Abbrechen</button>
      </fieldset>
    </Modal>
  );
}
