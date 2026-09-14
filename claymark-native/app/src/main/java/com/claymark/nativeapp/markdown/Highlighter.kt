package com.claymark.nativeapp.markdown

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle

/**
 * Syntax highlighting for the R-LANG registry.
 *
 * The shipped product uses Shiki with the full TextMate grammars for
 * `github-light` / `github-dark-dimmed`. There is no Shiki on the JVM and no
 * TextMate grammar engine worth shipping in an offline APK, so this is a
 * hand-written lexical highlighter: comments, strings, numbers, keywords,
 * types, and call sites, per language.
 *
 * That is a real fidelity gap and is deliberately scoped rather than hidden —
 * see the port report. What it does preserve exactly:
 *  - the same 34-language registry, and the same behaviour outside it
 *    (unregistered languages render as plain preformatted text, which the
 *    README calls out as expected, not a failure);
 *  - the same two palettes, so a highlighted block sits in the same color
 *    space as the rest of the theme.
 */
object Highlighter {

    /**
     * R-LANG: the fixed registry of 34 grammars. Adding a language is a
     * product decision, not a rendering convenience — this list is copied
     * verbatim from `src/pipeline/plugins/shiki-config.ts`.
     */
    val SUPPORTED_LANGUAGES: Set<String> = setOf(
        "bash", "c", "cpp", "csharp", "css", "diff", "dockerfile", "go",
        "graphql", "html", "ini", "java", "javascript", "json", "jsx",
        "kotlin", "lua", "makefile", "markdown", "nginx", "php", "python",
        "r", "ruby", "rust", "scala", "scss", "sql", "swift", "toml", "tsx",
        "typescript", "xml", "yaml",
    )

    data class Palette(
        val plain: Color,
        val comment: Color,
        val keyword: Color,
        val string: Color,
        val number: Color,
        val function: Color,
        val type: Color,
    )

    val GithubLight = Palette(
        plain = Color(0xFF24292F),
        comment = Color(0xFF6E7781),
        keyword = Color(0xFFCF222E),
        string = Color(0xFF0A3069),
        number = Color(0xFF0550AE),
        function = Color(0xFF8250DF),
        type = Color(0xFF953800),
    )

    val GithubDarkDimmed = Palette(
        plain = Color(0xFFADBAC7),
        comment = Color(0xFF768390),
        keyword = Color(0xFFF47067),
        string = Color(0xFF96D0FF),
        number = Color(0xFF6CB6FF),
        function = Color(0xFFDCBDFB),
        type = Color(0xFFF69D50),
    )

    private data class Grammar(
        val keywords: Set<String>,
        val types: Set<String> = emptySet(),
        val lineComment: List<String> = listOf("//"),
        val blockComment: Pair<String, String>? = "/*" to "*/",
        val stringDelims: Set<Char> = setOf('"', '\'', '`'),
        val supportsCalls: Boolean = true,
    )

    private val C_LIKE = setOf(
        "if", "else", "for", "while", "do", "switch", "case", "default", "break",
        "continue", "return", "goto", "sizeof", "typedef", "struct", "union",
        "enum", "static", "const", "extern", "inline", "volatile", "register",
    )

    private val JS_KEYWORDS = setOf(
        "as", "async", "await", "break", "case", "catch", "class", "const",
        "continue", "debugger", "default", "delete", "do", "else", "export",
        "extends", "finally", "for", "from", "function", "get", "if", "import",
        "in", "instanceof", "let", "new", "of", "return", "set", "static",
        "super", "switch", "this", "throw", "try", "typeof", "var", "void",
        "while", "with", "yield", "true", "false", "null", "undefined",
    )

    private val TS_KEYWORDS = JS_KEYWORDS + setOf(
        "abstract", "any", "as", "asserts", "declare", "enum", "implements",
        "infer", "interface", "is", "keyof", "namespace", "never", "override",
        "private", "protected", "public", "readonly", "satisfies", "type",
        "unknown",
    )

    private val PY_KEYWORDS = setOf(
        "and", "as", "assert", "async", "await", "break", "class", "continue",
        "def", "del", "elif", "else", "except", "False", "finally", "for",
        "from", "global", "if", "import", "in", "is", "lambda", "None",
        "nonlocal", "not", "or", "pass", "raise", "return", "True", "try",
        "while", "with", "yield", "match", "case",
    )

    private val SHELL_KEYWORDS = setOf(
        "if", "then", "else", "elif", "fi", "for", "while", "until", "do",
        "done", "case", "esac", "function", "in", "select", "time", "return",
        "export", "local", "readonly", "declare", "source", "echo", "cd", "set",
    )

    private val GRAMMARS: Map<String, Grammar> = mapOf(
        "bash" to Grammar(SHELL_KEYWORDS, lineComment = listOf("#"), blockComment = null, stringDelims = setOf('"', '\'')),
        "c" to Grammar(C_LIKE, setOf("int", "char", "float", "double", "long", "short", "unsigned", "signed", "void", "bool", "size_t")),
        "cpp" to Grammar(
            C_LIKE + setOf("class", "namespace", "template", "typename", "public", "private", "protected", "virtual", "override", "new", "delete", "try", "catch", "throw", "using", "constexpr", "nullptr", "auto", "this", "operator", "friend", "explicit"),
            setOf("int", "char", "float", "double", "long", "short", "unsigned", "signed", "void", "bool", "string", "vector", "map", "set", "size_t"),
        ),
        "csharp" to Grammar(
            setOf("abstract", "as", "base", "bool", "break", "case", "catch", "checked", "class", "const", "continue", "default", "delegate", "do", "else", "enum", "event", "explicit", "extern", "false", "finally", "fixed", "for", "foreach", "goto", "if", "implicit", "in", "interface", "internal", "is", "lock", "namespace", "new", "null", "operator", "out", "override", "params", "private", "protected", "public", "readonly", "ref", "return", "sealed", "sizeof", "stackalloc", "static", "struct", "switch", "this", "throw", "true", "try", "typeof", "unchecked", "unsafe", "using", "var", "virtual", "void", "volatile", "while", "async", "await", "record"),
            setOf("int", "string", "bool", "double", "float", "decimal", "object", "byte", "char", "long", "short", "uint", "ulong"),
        ),
        "css" to Grammar(emptySet(), lineComment = emptyList(), stringDelims = setOf('"', '\''), supportsCalls = false),
        "diff" to Grammar(emptySet(), lineComment = emptyList(), blockComment = null, stringDelims = emptySet(), supportsCalls = false),
        "dockerfile" to Grammar(
            setOf("FROM", "RUN", "CMD", "LABEL", "MAINTAINER", "EXPOSE", "ENV", "ADD", "COPY", "ENTRYPOINT", "VOLUME", "USER", "WORKDIR", "ARG", "ONBUILD", "STOPSIGNAL", "HEALTHCHECK", "SHELL", "AS"),
            lineComment = listOf("#"), blockComment = null, supportsCalls = false,
        ),
        "go" to Grammar(
            setOf("break", "case", "chan", "const", "continue", "default", "defer", "else", "fallthrough", "for", "func", "go", "goto", "if", "import", "interface", "map", "package", "range", "return", "select", "struct", "switch", "type", "var", "nil", "true", "false"),
            setOf("string", "int", "int8", "int16", "int32", "int64", "uint", "uint8", "uint32", "uint64", "byte", "rune", "float32", "float64", "bool", "error", "any"),
        ),
        "graphql" to Grammar(
            setOf("query", "mutation", "subscription", "fragment", "on", "type", "input", "enum", "interface", "union", "scalar", "schema", "extend", "implements", "directive", "true", "false", "null"),
            lineComment = listOf("#"), blockComment = null, stringDelims = setOf('"'),
        ),
        "html" to Grammar(emptySet(), lineComment = emptyList(), blockComment = "<!--" to "-->", stringDelims = setOf('"', '\''), supportsCalls = false),
        "ini" to Grammar(emptySet(), lineComment = listOf(";", "#"), blockComment = null, stringDelims = setOf('"'), supportsCalls = false),
        "java" to Grammar(
            setOf("abstract", "assert", "break", "case", "catch", "class", "const", "continue", "default", "do", "else", "enum", "extends", "final", "finally", "for", "goto", "if", "implements", "import", "instanceof", "interface", "native", "new", "package", "private", "protected", "public", "return", "static", "strictfp", "super", "switch", "synchronized", "this", "throw", "throws", "transient", "try", "var", "volatile", "while", "true", "false", "null", "record", "sealed", "yield"),
            setOf("int", "long", "short", "byte", "char", "float", "double", "boolean", "void", "String", "Object", "List", "Map", "Set"),
        ),
        "javascript" to Grammar(JS_KEYWORDS),
        "json" to Grammar(setOf("true", "false", "null"), lineComment = emptyList(), blockComment = null, stringDelims = setOf('"'), supportsCalls = false),
        "jsx" to Grammar(JS_KEYWORDS),
        "kotlin" to Grammar(
            setOf("as", "break", "class", "continue", "do", "else", "false", "for", "fun", "if", "in", "interface", "is", "null", "object", "package", "return", "super", "this", "throw", "true", "try", "typealias", "typeof", "val", "var", "when", "while", "by", "catch", "constructor", "delegate", "dynamic", "field", "file", "finally", "get", "import", "init", "param", "property", "receiver", "set", "setparam", "value", "where", "abstract", "actual", "annotation", "companion", "const", "crossinline", "data", "enum", "expect", "external", "final", "infix", "inline", "inner", "internal", "lateinit", "noinline", "open", "operator", "out", "override", "private", "protected", "public", "reified", "sealed", "suspend", "tailrec", "vararg"),
            setOf("Int", "Long", "Short", "Byte", "Char", "Float", "Double", "Boolean", "String", "Unit", "Any", "Nothing", "List", "Map", "Set", "Array"),
        ),
        "lua" to Grammar(
            setOf("and", "break", "do", "else", "elseif", "end", "false", "for", "function", "goto", "if", "in", "local", "nil", "not", "or", "repeat", "return", "then", "true", "until", "while"),
            lineComment = listOf("--"), blockComment = "--[[" to "]]", stringDelims = setOf('"', '\''),
        ),
        "makefile" to Grammar(setOf("ifeq", "ifneq", "ifdef", "ifndef", "else", "endif", "include", "define", "endef", "export", "unexport", "override", "vpath"), lineComment = listOf("#"), blockComment = null, supportsCalls = false),
        "markdown" to Grammar(emptySet(), lineComment = emptyList(), blockComment = null, stringDelims = emptySet(), supportsCalls = false),
        "nginx" to Grammar(
            setOf("server", "location", "upstream", "http", "events", "listen", "server_name", "root", "index", "proxy_pass", "include", "return", "rewrite", "if", "set", "access_log", "error_log"),
            lineComment = listOf("#"), blockComment = null, stringDelims = setOf('"', '\''), supportsCalls = false,
        ),
        "php" to Grammar(
            setOf("abstract", "and", "array", "as", "break", "callable", "case", "catch", "class", "clone", "const", "continue", "declare", "default", "do", "echo", "else", "elseif", "empty", "enddeclare", "endfor", "endforeach", "endif", "endswitch", "endwhile", "enum", "extends", "final", "finally", "fn", "for", "foreach", "function", "global", "goto", "if", "implements", "include", "instanceof", "insteadof", "interface", "isset", "list", "match", "namespace", "new", "or", "print", "private", "protected", "public", "readonly", "require", "return", "static", "switch", "throw", "trait", "try", "unset", "use", "var", "while", "xor", "yield", "true", "false", "null"),
            lineComment = listOf("//", "#"),
        ),
        "python" to Grammar(PY_KEYWORDS, setOf("int", "str", "float", "bool", "bytes", "list", "dict", "set", "tuple", "object", "self"), lineComment = listOf("#"), blockComment = null, stringDelims = setOf('"', '\'')),
        "r" to Grammar(setOf("if", "else", "repeat", "while", "function", "for", "in", "next", "break", "TRUE", "FALSE", "NULL", "Inf", "NaN", "NA"), lineComment = listOf("#"), blockComment = null, stringDelims = setOf('"', '\'')),
        "ruby" to Grammar(
            setOf("BEGIN", "END", "alias", "and", "begin", "break", "case", "class", "def", "defined?", "do", "else", "elsif", "end", "ensure", "false", "for", "if", "in", "module", "next", "nil", "not", "or", "redo", "rescue", "retry", "return", "self", "super", "then", "true", "undef", "unless", "until", "when", "while", "yield", "require", "attr_accessor", "attr_reader", "attr_writer"),
            lineComment = listOf("#"), blockComment = "=begin" to "=end", stringDelims = setOf('"', '\''),
        ),
        "rust" to Grammar(
            setOf("as", "async", "await", "break", "const", "continue", "crate", "dyn", "else", "enum", "extern", "false", "fn", "for", "if", "impl", "in", "let", "loop", "match", "mod", "move", "mut", "pub", "ref", "return", "self", "Self", "static", "struct", "super", "trait", "true", "type", "unsafe", "use", "where", "while"),
            setOf("i8", "i16", "i32", "i64", "i128", "isize", "u8", "u16", "u32", "u64", "u128", "usize", "f32", "f64", "bool", "char", "str", "String", "Vec", "Option", "Result", "Box"),
        ),
        "scala" to Grammar(
            setOf("abstract", "case", "catch", "class", "def", "do", "else", "extends", "false", "final", "finally", "for", "forSome", "if", "implicit", "import", "lazy", "match", "new", "null", "object", "override", "package", "private", "protected", "return", "sealed", "super", "this", "throw", "trait", "try", "true", "type", "val", "var", "while", "with", "yield", "given", "using", "enum"),
            setOf("Int", "Long", "Double", "Float", "Boolean", "String", "Unit", "Any", "AnyRef", "Nothing", "List", "Map", "Set", "Option"),
        ),
        "scss" to Grammar(setOf("@mixin", "@include", "@extend", "@use", "@forward", "@if", "@else", "@each", "@for", "@while", "@function", "@return", "@import", "@media"), lineComment = listOf("//"), stringDelims = setOf('"', '\''), supportsCalls = false),
        "sql" to Grammar(
            setOf("SELECT", "FROM", "WHERE", "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE", "CREATE", "TABLE", "ALTER", "DROP", "INDEX", "VIEW", "JOIN", "INNER", "LEFT", "RIGHT", "FULL", "OUTER", "ON", "GROUP", "BY", "ORDER", "HAVING", "LIMIT", "OFFSET", "UNION", "ALL", "DISTINCT", "AS", "AND", "OR", "NOT", "NULL", "IS", "IN", "BETWEEN", "LIKE", "EXISTS", "CASE", "WHEN", "THEN", "ELSE", "END", "PRIMARY", "KEY", "FOREIGN", "REFERENCES", "DEFAULT", "CONSTRAINT", "WITH", "RETURNING"),
            lineComment = listOf("--"), stringDelims = setOf('\'', '"'), supportsCalls = false,
        ),
        "swift" to Grammar(
            setOf("associatedtype", "class", "deinit", "enum", "extension", "fileprivate", "func", "import", "init", "inout", "internal", "let", "open", "operator", "private", "protocol", "public", "rethrows", "static", "struct", "subscript", "typealias", "var", "break", "case", "continue", "default", "defer", "do", "else", "fallthrough", "for", "guard", "if", "in", "repeat", "return", "switch", "where", "while", "as", "catch", "false", "is", "nil", "super", "self", "Self", "throw", "throws", "true", "try", "async", "await", "actor", "some", "any"),
            setOf("Int", "Double", "Float", "Bool", "String", "Character", "Array", "Dictionary", "Set", "Optional", "Void"),
        ),
        "toml" to Grammar(setOf("true", "false"), lineComment = listOf("#"), blockComment = null, stringDelims = setOf('"', '\''), supportsCalls = false),
        "tsx" to Grammar(TS_KEYWORDS),
        "typescript" to Grammar(TS_KEYWORDS),
        "xml" to Grammar(emptySet(), lineComment = emptyList(), blockComment = "<!--" to "-->", stringDelims = setOf('"', '\''), supportsCalls = false),
        "yaml" to Grammar(setOf("true", "false", "null", "yes", "no", "on", "off"), lineComment = listOf("#"), blockComment = null, stringDelims = setOf('"', '\''), supportsCalls = false),
    )

    fun isSupported(language: String?): Boolean =
        language != null && language.lowercase() in SUPPORTED_LANGUAGES

    /**
     * Returns the code as an AnnotatedString. An unregistered or absent
     * language returns plain text in the palette's default color — never a
     * "plaintext grammar" fallback that still wraps output in themed spans.
     */
    fun highlight(code: String, language: String?, palette: Palette): AnnotatedString {
        val lang = language?.lowercase()
        if (lang == null || lang !in SUPPORTED_LANGUAGES) {
            return AnnotatedString(code, SpanStyle(color = palette.plain))
        }
        if (lang == "diff") return highlightDiff(code, palette)
        val grammar = GRAMMARS[lang] ?: return AnnotatedString(code, SpanStyle(color = palette.plain))
        return tokenize(code, grammar, palette)
    }

    /** Diff has no lexical grammar — it is line-oriented, so treat it that way. */
    private fun highlightDiff(code: String, palette: Palette): AnnotatedString = buildAnnotatedString {
        code.split("\n").forEachIndexed { index, line ->
            if (index > 0) append("\n")
            val color = when {
                line.startsWith("+++") || line.startsWith("---") -> palette.comment
                line.startsWith("+") -> palette.string
                line.startsWith("-") -> palette.keyword
                line.startsWith("@@") -> palette.function
                else -> palette.plain
            }
            withStyle(SpanStyle(color = color)) { append(line) }
        }
    }

    private fun tokenize(code: String, grammar: Grammar, palette: Palette): AnnotatedString =
        buildAnnotatedString {
            var i = 0
            val n = code.length

            fun emit(text: String, color: Color) {
                withStyle(SpanStyle(color = color)) { append(text) }
            }

            while (i < n) {
                val ch = code[i]

                // Block comment
                val block = grammar.blockComment
                if (block != null && code.startsWith(block.first, i)) {
                    val end = code.indexOf(block.second, i + block.first.length)
                    val stop = if (end < 0) n else end + block.second.length
                    emit(code.substring(i, stop), palette.comment)
                    i = stop
                    continue
                }

                // Line comment
                val lineStart = grammar.lineComment.firstOrNull { code.startsWith(it, i) }
                if (lineStart != null) {
                    val end = code.indexOf('\n', i).let { if (it < 0) n else it }
                    emit(code.substring(i, end), palette.comment)
                    i = end
                    continue
                }

                // String literal, with backslash escapes honoured
                if (ch in grammar.stringDelims) {
                    var j = i + 1
                    while (j < n) {
                        if (code[j] == '\\') {
                            j += 2
                            continue
                        }
                        if (code[j] == ch) {
                            j++
                            break
                        }
                        if (code[j] == '\n' && ch != '`') {
                            break
                        }
                        j++
                    }
                    val stop = j.coerceAtMost(n)
                    emit(code.substring(i, stop), palette.string)
                    i = stop
                    continue
                }

                // Number
                if (ch.isDigit()) {
                    var j = i
                    while (j < n && (code[j].isLetterOrDigit() || code[j] == '.' || code[j] == '_')) j++
                    emit(code.substring(i, j), palette.number)
                    i = j
                    continue
                }

                // Identifier / keyword / type / call
                if (ch.isLetter() || ch == '_' || ch == '@' || ch == '$') {
                    var j = i
                    if (code[j] == '@' || code[j] == '$') j++
                    while (j < n && (code[j].isLetterOrDigit() || code[j] == '_')) j++
                    val word = code.substring(i, j)
                    val color = when {
                        word in grammar.keywords -> palette.keyword
                        word in grammar.types -> palette.type
                        grammar.supportsCalls && nextNonSpace(code, j) == '(' -> palette.function
                        word.firstOrNull()?.isUpperCase() == true -> palette.type
                        else -> palette.plain
                    }
                    emit(word, color)
                    i = j
                    continue
                }

                emit(ch.toString(), palette.plain)
                i++
            }
        }

    private fun nextNonSpace(code: String, from: Int): Char? {
        var i = from
        while (i < code.length && (code[i] == ' ' || code[i] == '\t')) i++
        return code.getOrNull(i)
    }

    /**
     * Fence meta line-highlight ranges: ```js {2,4-6}. rehype-pretty-code
     * parses these from the fence's meta string and emits
     * `data-highlighted-line`; the same parse happens here so the renderer
     * can tint the matching lines.
     */
    fun parseHighlightedLines(meta: String?): Set<Int> {
        if (meta.isNullOrBlank()) return emptySet()
        val match = Regex("\\{([\\d,\\-\\s]+)\\}").find(meta) ?: return emptySet()
        val result = mutableSetOf<Int>()
        match.groupValues[1].split(',').forEach { part ->
            val piece = part.trim()
            if (piece.isEmpty()) return@forEach
            if (piece.contains('-')) {
                val bounds = piece.split('-')
                val start = bounds.getOrNull(0)?.trim()?.toIntOrNull()
                val end = bounds.getOrNull(1)?.trim()?.toIntOrNull()
                if (start != null && end != null && end >= start) {
                    for (line in start..end) result.add(line)
                }
            } else {
                piece.toIntOrNull()?.let { result.add(it) }
            }
        }
        return result
    }
}
