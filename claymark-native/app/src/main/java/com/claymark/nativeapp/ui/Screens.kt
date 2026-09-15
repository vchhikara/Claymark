package com.claymark.nativeapp.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.style.TextOverflow
import com.claymark.nativeapp.Route
import com.claymark.nativeapp.documents.RecentFile
import com.claymark.nativeapp.theme.ClayInsets
import com.claymark.nativeapp.theme.ClaymarkFonts
import com.claymark.nativeapp.theme.Radius
import com.claymark.nativeapp.theme.Space
import com.claymark.nativeapp.theme.TypeScale
import com.claymark.nativeapp.theme.clayPot
import com.claymark.nativeapp.theme.clayRaised
import com.claymark.nativeapp.theme.colors

/**
 * Shared shell for the four drawer destinations: a back arrow + title header
 * (same visual weight as [com.claymark.nativeapp.ClaymarkApp]'s own reader
 * header), a hairline rule, then a scrolling, measure-capped body — so
 * Settings/Help/About/Privacy all read as one family rather than four
 * independently-designed screens.
 */
@Composable
fun SubScreenScaffold(
    title: String,
    onBack: () -> Unit,
    content: @Composable ColumnScope.() -> Unit,
) {
    val c = colors
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(c.surface),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .windowInsetsPadding(WindowInsets.statusBars)
                .padding(horizontal = Space.s5)
                .padding(top = Space.s3, bottom = Space.s4),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Space.s3),
        ) {
            ClayBackButton(onClick = onBack)
            Text(
                text = title,
                style = TextStyle(
                    fontFamily = ClaymarkFonts.Ui,
                    fontSize = TypeScale.button,
                    fontWeight = FontWeight.SemiBold,
                    color = c.textPrimary,
                ),
            )
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(c.borderSubtle),
        )
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = Space.s5)
                .padding(top = Space.s4, bottom = Space.s9),
            content = content,
        )
    }
}

/**
 * One Settings row: title + subtitle on the left (exactly the reference
 * screenshot's structure), an arbitrary trailing control on the right —
 * a [ClaySwitch] for a toggle, or a chevron + current-value text for a row
 * that opens a picker.
 */
@Composable
fun SettingRow(
    title: String,
    subtitle: String,
    onClick: (() -> Unit)? = null,
    trailing: @Composable () -> Unit,
) {
    val c = colors
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .let { base -> if (onClick != null) base.clickable(onClick = onClick) else base }
            .padding(vertical = Space.s4),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = TextStyle(
                    fontFamily = ClaymarkFonts.Ui,
                    fontSize = TypeScale.button,
                    color = c.textPrimary,
                ),
            )
            Text(
                text = subtitle,
                style = TextStyle(
                    fontFamily = ClaymarkFonts.Ui,
                    fontSize = TypeScale.small,
                    color = c.textMuted,
                ),
            )
        }
        Box(modifier = Modifier.padding(start = Space.s3)) { trailing() }
    }
}

/**
 * The drawer's own content — re-skinned against our tokens rather than any
 * M3 default. [ModalNavigationDrawer]/[ModalDrawerSheet] (wired at the
 * `MainActivity` level) supply only the gesture/animation/a11y plumbing;
 * every color and shape here is ours.
 */
@Composable
fun ClaymarkDrawerContent(
    currentRoute: Route,
    onNavigate: (Route) -> Unit,
    recentFiles: List<RecentFile> = emptyList(),
    onOpenRecent: (String) -> Unit = {},
) {
    val c = colors
    val context = LocalContext.current
    val versionName = remember {
        context.packageManager.getPackageInfo(context.packageName, 0).versionName
    }

    Column(
        modifier = Modifier
            .fillMaxHeight()
            .widthIn(max = 240.dp)
            .background(c.surface)
            .windowInsetsPadding(WindowInsets.statusBars)
            .padding(Space.s5),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Space.s2)) {
            // The real brand mark (brand/logo/icon-c.svg's tile + cream "C"
            // cutout) — not the adaptive icon's monochrome silhouette layer,
            // which is a flat single-color outline meant for themed launcher
            // icons, not for use as an in-app logo.
            Image(
                painter = androidx.compose.ui.res.painterResource(com.claymark.nativeapp.R.drawable.ic_logo_mark),
                contentDescription = null,
                modifier = Modifier.size(26.dp),
            )
            ClaymarkWordmark(size = 26.sp, text = "Claymark")
        }
        Box(modifier = Modifier.height(Space.s7))

        // §2.3: same underlying store the future widget/shortcuts (§1.1/1.2)
        // would read from — surfaced here first since the drawer already
        // exists and this is the cheapest place to make it useful.
        if (recentFiles.isNotEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clayPot(
                        base = c.surface,
                        colors = c,
                        radius = Radius.md,
                        insets = ClayInsets(horizontal = 0.75.dp, vertical = 0.75.dp),
                    )
                    .padding(Space.s3),
            ) {
                Text(
                    text = "Recent",
                    style = TextStyle(
                        fontFamily = ClaymarkFonts.Ui,
                        fontSize = TypeScale.button,
                        color = c.textSecondary,
                    ),
                    modifier = Modifier.padding(start = Space.s1, bottom = Space.s2),
                )
                recentFiles.forEach { file ->
                    Text(
                        text = file.name.removeSuffix(".md"),
                        style = TextStyle(
                            fontFamily = ClaymarkFonts.Ui,
                            fontSize = TypeScale.small,
                            color = c.textMuted,
                        ),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(Radius.md))
                            .clickable { onOpenRecent(file.uri) }
                            .padding(horizontal = Space.s3, vertical = Space.s2),
                    )
                }
            }
        }

        // Anchors the drawer's leftover vertical space instead of leaving it
        // dead — the one piece of real, non-navigational information this
        // screen has to offer.
        Box(modifier = Modifier.weight(1f))

        // Settings, Help, About, and Privacy — icon-only so the drawer stays
        // narrow, one horizontal row right above the version line rather
        // than four full-width labeled rows eating vertical space.
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            DrawerIconButton(
                route = Route.SETTINGS,
                currentRoute = currentRoute,
                onNavigate = onNavigate,
                contentDescription = "Settings",
                icon = { tint -> Icon(Icons.Filled.Settings, contentDescription = null, tint = tint) },
            )
            DrawerIconButton(
                route = Route.HELP,
                currentRoute = currentRoute,
                onNavigate = onNavigate,
                contentDescription = "Help",
                icon = { tint -> HelpGlyph(tint) },
            )
            DrawerIconButton(
                route = Route.ABOUT,
                currentRoute = currentRoute,
                onNavigate = onNavigate,
                contentDescription = "About",
                icon = { tint -> Icon(Icons.Filled.Info, contentDescription = null, tint = tint) },
            )
            DrawerIconButton(
                route = Route.PRIVACY,
                currentRoute = currentRoute,
                onNavigate = onNavigate,
                contentDescription = "Privacy",
                icon = { tint -> Icon(Icons.Filled.Lock, contentDescription = null, tint = tint) },
            )
        }
        Text(
            text = "Version $versionName",
            style = TextStyle(
                fontFamily = ClaymarkFonts.Mono,
                fontSize = 11.sp,
                color = c.textMuted,
            ),
            modifier = Modifier.padding(top = Space.s3, start = Space.s1),
        )
    }
}

/**
 * Icon-only drawer destination — same claymorphism treatment as
 * [ClayIconButton], just reused here so Settings/Help/About/Privacy sit in
 * one compact horizontal row instead of four full-width labeled rows eating
 * the drawer's vertical space.
 */
@Composable
private fun DrawerIconButton(
    route: Route,
    currentRoute: Route,
    onNavigate: (Route) -> Unit,
    contentDescription: String,
    icon: @Composable (Color) -> Unit,
) {
    val c = colors
    val active = route == currentRoute
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()

    Box(
        modifier = Modifier
            .size(44.dp)
            .semantics { this.contentDescription = contentDescription }
            .clayRaised(
                base = if (active) c.accentBrand.copy(alpha = 0.16f) else c.surfaceRaised,
                colors = c,
                radius = Radius.md,
                pressed = pressed,
            )
            .clip(RoundedCornerShape(Radius.md))
            .clickable(
                interactionSource = interaction,
                indication = null,
                onClick = { onNavigate(route) },
            ),
        contentAlignment = Alignment.Center,
    ) {
        icon(if (active) c.accentBrand else c.textSecondary)
    }
}

/**
 * `Help` has no core-set M3 icon (`HelpOutline` only exists in the much
 * larger `material-icons-extended` artifact) — a hand-drawn circle-and-"?"
 * glyph follows the same precedent as [SunGlyph]/[MoonGlyph] in
 * `Components.kt`: a small custom glyph instead of a new dependency.
 */
@Composable
private fun HelpGlyph(tint: Color) {
    Box(
        modifier = Modifier
            .size(20.dp)
            .border(BorderStroke(1.6.dp, tint), CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = "?",
            style = TextStyle(
                fontFamily = ClaymarkFonts.Ui,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                color = tint,
            ),
        )
    }
}
