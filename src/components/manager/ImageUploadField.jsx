import { useRef, useState } from "react";
import { CloudUpload, Image as ImageIcon, X } from "lucide-react";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export default function ImageUploadField({
  id,
  file,
  accept = "image/jpeg,image/png",
  hint = "JPEG or PNG · up to 10 MB",
  prompt = "Upload an image",
  onSelect,
  onRemove,
  error = "",
  disabled = false,
  compact = false,
}) {
  const inputRef = useRef(null);
  const [localFile, setLocalFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState("");
  const selectedFile = file || localFile;

  function selectFile(nextFile) {
    if (!nextFile || disabled) return;
    setLocalError("");
    if (!nextFile.type.startsWith("image/")) {
      setLocalError("Choose an image file.");
      return;
    }
    const allowedTypes = accept.split(",").map((type) => type.trim()).filter((type) => type.startsWith("image/"));
    if (allowedTypes.length && !allowedTypes.includes(nextFile.type)) {
      setLocalError("This image format is not supported here.");
      return;
    }
    if (nextFile.size > MAX_IMAGE_SIZE) {
      setLocalError("Image must be 10 MB or smaller.");
      return;
    }
    setLocalFile(nextFile);
    onSelect?.(nextFile);
  }

  function clearFile() {
    setLocalFile(null);
    setLocalError("");
    if (inputRef.current) inputRef.current.value = "";
    onRemove?.();
  }

  return (
    <div className="dinebook-image-upload-wrap">
      <div
        className={`dinebook-image-upload ${compact ? "is-compact" : ""} ${dragging ? "is-dragging" : ""} ${disabled ? "is-disabled" : ""}`}
        onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          selectFile(event.dataTransfer.files?.[0]);
        }}
      >
        <CloudUpload className="dinebook-image-upload-icon" size={34} strokeWidth={1.8} aria-hidden="true" />
        {selectedFile ? (
          <>
            <span className="dinebook-image-upload-prompt">{selectedFile.name}</span>
            <span className="dinebook-image-upload-hint">{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</span>
          </>
        ) : (
          <>
            <span className="dinebook-image-upload-prompt">{prompt}</span>
            <span className="dinebook-image-upload-hint">{hint}</span>
          </>
        )}
        <div className="dinebook-image-upload-actions">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept={accept}
            disabled={disabled}
            className="sr-only"
            onChange={(event) => {
              selectFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <button type="button" className="dinebook-image-browse" disabled={disabled} onClick={() => inputRef.current?.click()}>
            <ImageIcon size={14} /> Browse files
          </button>
          {selectedFile && onRemove && (
            <button type="button" className="dinebook-image-remove" disabled={disabled} onClick={clearFile} aria-label="Remove selected image">
              <X size={15} />
            </button>
          )}
        </div>
        <span className="dinebook-image-upload-drop-hint">or drop an image here</span>
      </div>
      {(error || localError) && <p className="dinebook-image-upload-error" role="alert">{error || localError}</p>}
    </div>
  );
}
