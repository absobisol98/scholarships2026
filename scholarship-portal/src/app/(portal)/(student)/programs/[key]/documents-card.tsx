"use client";

import { useState } from "react";

export function DocumentsCard() {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="card elev-sm" style={{ flex: 2, justifyContent: "flex-start", gap: 2 }}>
      <div className="card-kicker" style={{ fontSize: 15 }}><b>Documents to prepare</b></div>
      <p className="card-body" style={{ margin: 0 }}>Applicants must prepare a digital copy of the required documents</p>
      <button type="button" className="btn btn-ghost" style={{ paddingInline: 0, paddingBlock: 0, alignSelf: "flex-start", marginTop: 2 }} onClick={() => setExpanded((v) => !v)}>
        {expanded ? "Show less" : "View list of documents"}
      </button>

      {expanded && (
        <>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, opacity: 0.85, lineHeight: 1.7, display: "flex", flexDirection: "column", gap: 4 }}>
            <li>2x2 picture</li>
            <li>Latest copy of grades, signed by the Registrar (wet signature)</li>
            <li>
              Documentation of financial need, such as but not limited to the following:
              <ul style={{ margin: "6px 0 0", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 5 }}>
                <li>Certificate of Indigency of parent(s) or guardian(s), issued by the barangay, CSWD/MSWD/DSWD, or another government entity <sup>*</sup></li>
                <li>Most recent Income Tax Return (ITR) of parent(s) or guardian(s) <sup>*</sup></li>
                <li>Tax Exemption Certificate from the BIR <sup>*</sup></li>
                <li>For children of Overseas Filipino Workers (OFWs) and seafarers: recent contract or proof of income <sup>*</sup></li>
                <li>Latest copy of electric or water bill, if available <sup>*</sup></li>
                <li>Senior citizen ID and/or PWD ID and/or Solo parent ID</li>
                <li>Proof of parent(s) or guardian(s) as DSWD 4Ps beneficiary</li>
                <li>Proof of parent(s) or guardian(s) as DOLE TUPAD beneficiary</li>
              </ul>
            </li>
          </ul>
          <p style={{ margin: "var(--space-3) 0 0", fontSize: 11.5, opacity: 0.6, fontStyle: "italic", borderTop: "1px solid var(--color-divider)", paddingTop: "var(--space-2)" }}>
            * Documents must be dated within the last 12 months.
          </p>
        </>
      )}
    </div>
  );
}
