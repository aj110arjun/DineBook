import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizes = [10, 20, 50],
  label = "records",
  className = "",
  showPageNumbers = false,
  pageNumberLimit = 5,
}) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const safePageSize = Math.max(1, Number(pageSize) || 1);
  const pageCount = Math.max(1, Math.ceil(safeTotal / safePageSize));
  const currentPage = Math.min(pageCount, Math.max(1, Number(page) || 1));
  const start = safeTotal ? (currentPage - 1) * safePageSize + 1 : 0;
  const end = Math.min(currentPage * safePageSize, safeTotal);
  const limit = Math.max(1, Math.floor(Number(pageNumberLimit) || 5));
  const windowStart = Math.max(1, Math.min(currentPage - Math.floor(limit / 2), pageCount - limit + 1));
  const pages = Array.from({ length: Math.min(pageCount, limit) }, (_, index) => windowStart + index);

  return (
    <nav className={`admin-pagination shared-pagination ${className}`.trim()} aria-label={`${label} pagination`}>
      <span className="admin-pagination-summary">
        Showing{" "}
        <strong>
          {start}–{end}
        </strong>{" "}
        of <strong>{safeTotal}</strong> {label}
      </span>
      <div className="admin-pagination-controls">
        {onPageSizeChange && (
          <label>
            Rows{" "}
            <select
              className="admin-page-size"
              value={safePageSize}
              onChange={(event) => {
                onPageSizeChange(Number(event.target.value));
                onPageChange(1);
              }}
            >
              {pageSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          aria-label="Previous page"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        >
          <ChevronLeft size={16} /> Previous
        </button>
        {showPageNumbers && <div className="pagination-page-numbers" aria-label="Choose page">
          {pages.map((number) => <button
            key={number}
            type="button"
            aria-label={`Page ${number}`}
            aria-current={number === currentPage ? "page" : undefined}
            className={number === currentPage ? "selected" : ""}
            onClick={() => onPageChange(number)}
          >{number}</button>)}
        </div>}
        <span className="admin-pagination-page">Page {currentPage} of {pageCount}</span>
        <button
          type="button"
          aria-label="Next page"
          disabled={currentPage >= pageCount}
          onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}
