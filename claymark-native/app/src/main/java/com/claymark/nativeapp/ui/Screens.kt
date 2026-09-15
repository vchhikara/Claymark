package com.claymark.nativeapp.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.claymark.nativeapp.Route
import com.claymark.nativeapp.theme.ClaymarkFonts
import com.claymark.nativeapp.theme.Radius
import com.claymark.nativeapp.theme.Space
import com.claymark.nativeapp.theme.TypeScale
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
fun ClaymarkDrawerContent(currentRoute: Route, onNavigate: (Route) -> Unit) {
    val c = colors
    Column(
        modifier = Modifier
            .fillMaxHeight()
            .widthIn(max = 300.dp)
            .background(c.surface)
            .windowInsetsPadding(WindowInsets.statusBars)
            .padding(Space.s5),
    ) {
        Text(
            text = "CLAYMARK",
            style = TextStyle(
                fontFamily = ClaymarkFonts.Body,
                fontSize = TypeScale.h5,
                letterSpacing = 1.26.sp,
                color = c.textMuted,
            ),
        )
        Box(modifier = Modifier.height(Space.s7))

        DrawerRow("Settings", Route.SETTINGS, currentRoute, onNavigate)
        DrawerRow("Help", Route.HELP, currentRoute, onNavigate)
        DrawerRow("About", Route.ABOUT, currentRoute, onNavigate)
        DrawerRow("Privacy", Route.PRIVACY, currentRoute, onNavigate)
    }
}

@Composable
private fun DrawerRow(
    label: String,
    route: Route,
    currentRoute: Route,
    onNavigate: (Route) -> Unit,
) {
    val c = colors
    val active = route == currentRoute
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(Radius.md))
            .clickable { onNavigate(route) }
            .background(if (active) c.surfaceRaised else androidx.compose.ui.graphics.Color.Transparent)
            .padding(horizontal = Space.s3, vertical = Space.s3),
    ) {
        Text(
            text = label,
            style = TextStyle(
                fontFamily = ClaymarkFonts.Ui,
                fontSize = TypeScale.button,
                fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal,
                color = if (active) c.textPrimary else c.textSecondary,
            ),
        )
    }
}
