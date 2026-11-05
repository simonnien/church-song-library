# Song index bridge verification — 2026-11-05

The deployed Apps Script bridge retains the existing /exec URL (version 3).

- Obtain the file ETag from Drive v2 metadata before downloading the XLSX. The v3 media response did not include an ETag.
- Upload via Drive v2 PUT with If-Match. Real same-content upload returned 200; replaying its now-stale ETag returned 412.
- Remove XML value nodes using Element.removeContent(child); removeChildren/removeChild are not Apps Script XmlService methods.
- Authenticated production bridge request returned HTTP 200 and {"ok":true}.
- Downloaded XLSX compared against the public website index: 1,226 songs, zero number/title differences.
- ZIP comparison: only xl/worksheets/sheet1.xml changed; every other entry remained identical.
- Retried pending number 1126, then acknowledged its exact queue token. Pending count: zero.

Website saves, renumbering and swaps flush the durable queue. No hourly timer is used. Failed delivery remains queued until a subsequent website mutation retries it. The current workbook layout supports numbers 1–1300; larger numbers fail safely until the grid is expanded. This is website-to-workbook number/title synchronization, not two-way lyric synchronization.

Reference: https://developers.google.com/apps-script/reference/xml-service/element
Reference: https://developers.google.com/workspace/drive/api/reference/rest/v2/files
