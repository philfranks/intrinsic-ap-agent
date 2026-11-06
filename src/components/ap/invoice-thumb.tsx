import type { Scenario } from "@/lib/ap/types";

/**
 * A miniature of the paper invoice, drawn at full size and scaled down so the type and
 * rules stay crisp. Paper is always white, whatever the theme. `reading` sweeps a scan line.
 */
export function InvoiceThumb({ doc, reading = false, width = 132 }: { doc: Scenario["doc"]; reading?: boolean; width?: number }) {
  const scale = width / 420;
  return (
    <div className="inv-thumb" style={{ width, height: 544 * scale }} data-reading={reading ? "true" : undefined}>
      <div className="inv-paper" style={{ transform: `scale(${scale})` }}>
        <div className="inv-top">
          <div className="inv-title">{doc.title}</div>
          <div className="inv-brand" data-brand={doc.brand}>
            {doc.brand === "NCTL" ? (
              <>
                <b>NCTL</b>
                <span>North Coast Testing</span>
              </>
            ) : (
              doc.brand
            )}
          </div>
        </div>
        <dl className="inv-meta">
          <dt>Invoice number</dt>
          <dd>{doc.number}</dd>
          <dt>Date of issue</dt>
          <dd>{doc.issued}</dd>
          <dt>Date due</dt>
          <dd>{doc.due}</dd>
        </dl>
        <div className="inv-parties">
          <div>
            {doc.from.map((l, i) => (
              <div key={l} className={i === 0 ? "inv-strong" : undefined}>
                {l}
              </div>
            ))}
          </div>
          <div>
            <div className="inv-strong">Bill to</div>
            {doc.billTo.map((l) => (
              <div key={l}>{l}</div>
            ))}
          </div>
        </div>
        <div className="inv-due">
          {doc.total} USD due {doc.due}
        </div>
        <table className="inv-lines">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {doc.lines.map((l) => (
              <tr key={l.d}>
                <td>{l.d}</td>
                <td>{l.q}</td>
                <td>{l.a}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="inv-total">
          <span>Amount due</span>
          <span>{doc.total} USD</span>
        </div>
        <div className="inv-foot" />
      </div>
      <div className="inv-scan" aria-hidden="true" />
    </div>
  );
}
