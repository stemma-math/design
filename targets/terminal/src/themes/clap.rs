//! `Styles` for clap's help and error messages.
//!
//! ```
//! # #[cfg(feature = "clap")] {
//! let command = clap::Command::new("tool").styles(stemma_design_terminal::themes::clap::styles());
//! # }
//! ```
//!
//! Clap decides whether to colour by itself; pass `--color never` or set
//! `ColorChoice::Never` where [`Output`](crate::Output) says not to.

use clap::builder::Styles;
use clap::builder::styling::{AnsiColor, Effects, Style};

use crate::{Ansi, Role};

fn ansi(color: Ansi) -> AnsiColor {
    match color {
        Ansi::Black => AnsiColor::Black,
        Ansi::Red => AnsiColor::Red,
        Ansi::Green => AnsiColor::Green,
        Ansi::Yellow => AnsiColor::Yellow,
        Ansi::Blue => AnsiColor::Blue,
        Ansi::Magenta => AnsiColor::Magenta,
        Ansi::Cyan => AnsiColor::Cyan,
        Ansi::White => AnsiColor::White,
        Ansi::BrightBlack => AnsiColor::BrightBlack,
        Ansi::BrightRed => AnsiColor::BrightRed,
        Ansi::BrightGreen => AnsiColor::BrightGreen,
        Ansi::BrightYellow => AnsiColor::BrightYellow,
        Ansi::BrightBlue => AnsiColor::BrightBlue,
        Ansi::BrightMagenta => AnsiColor::BrightMagenta,
        Ansi::BrightCyan => AnsiColor::BrightCyan,
        Ansi::BrightWhite => AnsiColor::BrightWhite,
    }
}

/// The style of a role, in clap's terms.
pub fn style(role: Role) -> Style {
    let style = Style::new().fg_color(role.ansi().map(|color| ansi(color).into()));
    if role.bold() {
        style.effects(Effects::BOLD)
    } else {
        style
    }
}

/// Headings and usage in the accent, flags and commands as identifiers,
/// placeholders muted, errors in danger, valid values in success and
/// invalid ones in warning.
pub fn styles() -> Styles {
    Styles::styled()
        .header(style(Role::Accent))
        .usage(style(Role::Accent))
        .literal(style(Role::Identifier))
        .placeholder(style(Role::Muted))
        .error(style(Role::Danger))
        .valid(style(Role::Success))
        .invalid(style(Role::Warning))
        .context(style(Role::Muted))
}
