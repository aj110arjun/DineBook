import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { API_BASE } from "../../lib/authApi.js";

export default function AdminDocumentPreviewModal({ managerId, document, onClose }) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    async function loadPreview() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `${API_BASE}/api/admin/managers/requests/${managerId}/documents/${document.id}/preview`,
          { credentials: "include" },
        );
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data?.detail || "Unable to load this document.");
        }
        objectUrl = URL.createObjectURL(await response.blob());
        if (active) setPreviewUrl(objectUrl);
      } catch (reason) {
        if (active) setError(reason.message || "Unable to load this document.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPreview();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [managerId, document.id]);

  const filename = document.file_name || "Application document";
  const isImage = /\.(png|jpe?g)$/i.test(filename);

  return (
    <div className="admin-document-preview-backdrop" role="presentation">
      <section className="admin-document-preview-modal" role="dialog" aria-modal="true" aria-labelledby="document-preview-title">
        <header className="admin-document-preview-header">
          <div className="min-w-0">
            <h2 id="document-preview-title">{document.document_type?.replaceAll("_", " ") || "Document Preview"}</h2>
            <p title={filename}>{filename}</p>
          </div>
          <button type="button" onClick={onClose} className="admin-document-preview-close" aria-label="Close document preview">
            <X size={19} />
          </button>
        </header>

        <div className="admin-document-preview-content">
          {loading ? (
            <p role="status">Loading document preview…</p>
          ) : error ? (
            <p className="admin-document-preview-error" role="alert">{error}</p>
          ) : isImage ? (
            <img src={previewUrl} alt={filename} />
          ) : (
            <iframe src={previewUrl} title={filename} />
          )}
        </div>
      </section>
    </div>
  );
}
