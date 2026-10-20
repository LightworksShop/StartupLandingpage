import { Modal } from "./common";
import { request } from "./data";
import { MediaFields } from "./media-library";
import "./styles.css";
import { ProductPicker } from "./workspace-model";

export default function UploadMediaDialog({
  setUploading,
  busy,
  productsLoading,
  productsError,
  setFile,
  setUpload,
  upload,
  folders,
  data,
  file,
  run,
}) {
  return (
    <Modal title="Medium hochladen" onClose={() => setUploading(false)}>
      <fieldset
        disabled={busy || productsLoading || productsError}
        aria-busy={productsLoading}
        className="mk-body"
      >
        {productsLoading && <p role="status">Lade Produktauswahl …</p>}
        <h2>Foto, Video oder Hintergrund hochladen</h2>
        <p>
          JPEG, PNG, WebP oder MP4, maximal 15 MiB. Produktzuordnung ist
          freiwillig.
        </p>
        <label>
          Datei
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setUpload({
                ...upload,
                name: upload.name || e.target.files?.[0]?.name || "",
                category: e.target.files?.[0]?.type.startsWith("video/")
                  ? "video"
                  : upload.category === "video"
                    ? "image"
                    : upload.category,
              });
            }}
          />
        </label>
        <label>
          Name
          <input
            value={upload.name}
            onChange={(e) => setUpload({ ...upload, name: e.target.value })}
          />
        </label>
        <label>
          Schlagwörter (Komma getrennt)
          <input
            value={upload.tags.join(",")}
            onChange={(e) =>
              setUpload({
                ...upload,
                tags: e.target.value.split(","),
              })
            }
          />
        </label>
        <label className="mk-inline">
          <input
            type="checkbox"
            checked={upload.generated}
            onChange={(e) =>
              setUpload({ ...upload, generated: e.target.checked })
            }
          />
          Generiertes Medium
        </label>
        {upload.generated && (
          <label>
            Herkunft / verwendetes Modell
            <input
              value={upload.provenance}
              onChange={(e) =>
                setUpload({ ...upload, provenance: e.target.value })
              }
            />
          </label>
        )}
        <MediaFields value={upload} onChange={setUpload} folders={folders} />
        <ProductPicker
          products={data.products}
          value={upload.product_ids}
          onChange={(ids) => setUpload({ ...upload, product_ids: ids })}
        />
        <button
          disabled={!file}
          onClick={() =>
            run(async () => {
              if (file.size > 15 * 1024 * 1024)
                throw new Error("Datei ist größer als 15 MiB.");
              const content = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onerror = reject;
                reader.onload = () =>
                  resolve(String(reader.result).split(",")[1]);
                reader.readAsDataURL(file);
              });
              await request("media", {
                labels: {
                  ...upload,
                  tags: upload.tags.map((s) => s.trim()).filter(Boolean),
                },
                mime_type: file.type,
                content,
              });
              setUploading(false);
              setFile(null);
            }, "Medium hochgeladen.")
          }
        >
          Hochladen
        </button>
      </fieldset>
    </Modal>
  );
}
