Archived, not deleted. This was §1.7's print path — it rendered the raw Markdown
*source* through `StaticLayout` in monospace, not the actual rendered document
(tables, headings, code-block styling). The UI removed the Print button because
that output looked broken next to the rest of the app; the `.kt.txt` file here
is kept for a future real implementation that prints/PDFs the rendered
Markdown instead of the source text.

To restore: rename `PrintSupport.kt.txt` back to `PrintSupport.kt`, move it to
`app/src/main/java/com/claymark/nativeapp/documents/`, and re-wire a Print
button in `ClaymarkApp.kt`'s `Header` (see git history for the removed call
site).
