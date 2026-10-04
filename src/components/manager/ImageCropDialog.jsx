import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, X } from "lucide-react";

const OUTPUT_WIDTH = 1600;
const OUTPUT_HEIGHT = 900;

export default function ImageCropDialog({ file, onCancel, onCropped }) {
  const previewRef = useRef(null);
  const imageRef = useRef(null);
  const dragRef = useRef(null);
  const [imageUrl, setImageUrl] = useState("");
  const [dimensions, setDimensions] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [cropError, setCropError] = useState("");

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setDimensions(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setCropError("");
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleImageLoad() {
    const preview = previewRef.current?.getBoundingClientRect();
    const image = imageRef.current;
    if (preview && image) {
      setDimensions({
        width: image.naturalWidth,
        height: image.naturalHeight,
        previewWidth: preview.width,
        previewHeight: preview.height,
      });
    }
  }

  function handlePointerDown(event) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
  }

  function handlePointerMove(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const preview = dimensions;
    const baseScale = preview
      ? Math.max(preview.previewWidth / preview.width, preview.previewHeight / preview.height)
      : 1;
    const maxX = preview ? Math.max(0, (preview.width * baseScale * zoom - preview.previewWidth) / 2) : 0;
    const maxY = preview ? Math.max(0, (preview.height * baseScale * zoom - preview.previewHeight) / 2) : 0;
    setOffset({
      x: Math.min(maxX, Math.max(-maxX, drag.offsetX + event.clientX - drag.x)),
      y: Math.min(maxY, Math.max(-maxY, drag.offsetY + event.clientY - drag.y)),
    });
  }

  function handleZoom(event) {
    const nextZoom = Number(event.target.value);
    setZoom(nextZoom);
    setOffset((current) => {
      if (!dimensions) return current;
      const baseScale = Math.max(
        dimensions.previewWidth / dimensions.width,
        dimensions.previewHeight / dimensions.height,
      );
      const maxX = Math.max(0, (dimensions.width * baseScale * nextZoom - dimensions.previewWidth) / 2);
      const maxY = Math.max(0, (dimensions.height * baseScale * nextZoom - dimensions.previewHeight) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, current.x)),
        y: Math.min(maxY, Math.max(-maxY, current.y)),
      };
    });
  }

  function handleCrop() {
    if (!dimensions || !imageRef.current) return;
    setIsSaving(true);
    setCropError("");

    const baseScale = Math.max(
      dimensions.previewWidth / dimensions.width,
      dimensions.previewHeight / dimensions.height,
    );
    const scale = baseScale * zoom;
    const sourceWidth = dimensions.previewWidth / scale;
    const sourceHeight = dimensions.previewHeight / scale;
    const sourceX = Math.min(
      dimensions.width - sourceWidth,
      Math.max(0, (dimensions.width - sourceWidth) / 2 - offset.x / scale),
    );
    const sourceY = Math.min(
      dimensions.height - sourceHeight,
      Math.max(0, (dimensions.height - sourceHeight) / 2 - offset.y / scale),
    );
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    const context = canvas.getContext("2d");
    context.drawImage(
      imageRef.current,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      OUTPUT_WIDTH,
      OUTPUT_HEIGHT,
    );
    canvas.toBlob((blob) => {
      if (!blob) {
        setCropError("Could not crop this image. Please try another file.");
        setIsSaving(false);
        return;
      }
      onCropped(new File([blob], "restaurant-banner.jpg", { type: "image/jpeg" }));
      setIsSaving(false);
    }, "image/jpeg", 0.9);
  }

  if (!file) return null;

  return (
    <div className="image-crop-backdrop" role="presentation">
      <section className="image-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="banner-crop-title">
        <header className="image-crop-header">
          <div>
            <h2 id="banner-crop-title">Crop restaurant banner</h2>
            <p>Drag to position the image. The banner uses a 16:9 crop.</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close image cropper" className="image-crop-close"><X size={19} /></button>
        </header>

        <div
          className="image-crop-preview"
          ref={previewRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={() => { dragRef.current = null; }}
          onPointerCancel={() => { dragRef.current = null; }}
          style={{ cursor: dragRef.current ? "grabbing" : "grab" }}
        >
          {imageUrl ? (
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Restaurant banner crop preview"
              onLoad={handleImageLoad}
              draggable="false"
              style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
            />
          ) : <ImageIcon aria-hidden="true" />}
        </div>

        <label className="image-crop-zoom">
          <span>Zoom</span>
          <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={handleZoom} />
          <span>{zoom.toFixed(1)}×</span>
        </label>
        {cropError && <p className="image-crop-error" role="alert">{cropError}</p>}

        <footer className="image-crop-actions">
          <button type="button" onClick={onCancel} className="image-crop-cancel">Cancel</button>
          <button type="button" onClick={handleCrop} disabled={!dimensions || isSaving} className="image-crop-confirm">
            {isSaving ? "Preparing image…" : "Use this banner"}
          </button>
        </footer>
      </section>
    </div>
  );
}
