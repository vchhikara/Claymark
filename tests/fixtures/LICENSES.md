# Test fixture licenses

Every fixture in this directory is enumerated here with its license and source (R-LEGAL-03).

| Asset | Count | Source | License |
|---|---|---|---|
| `commonmark/spec.json` | 652 examples | https://spec.commonmark.org/0.31.2/spec.json (CommonMark 0.31.2 spec suite) | CC-BY-SA 4.0 (spec text and examples); used as test data only |
| `xss/*.md` | see table below | Authored for claymark, derived from publicly documented XSS vector families (OWASP Cheat Sheet Series — XSS Filter Evasion; PortSwigger Web Security Academy XSS cheat sheet) | Vectors are public attack knowledge; files carry no third-party license encumbrance |

The CommonMark suite is imported verbatim and unmodified. The XSS corpus is a curated subset: each file contains one vector, wrapped in Markdown context where the vector family requires it.
