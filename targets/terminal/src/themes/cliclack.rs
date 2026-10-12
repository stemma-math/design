//! A theme for cliclack's prompts.
//!
//! ```no_run
//! # #[cfg(feature = "cliclack")] {
//! use stemma_design_terminal::{Output, Stream, themes::cliclack::Theme};
//!
//! let output = Output::detect(Stream::Stderr);
//! output.apply_to_console(Stream::Stderr);
//! cliclack::set_theme(Theme::new(output));
//! # }
//! ```

use console::Style;

use crate::{Ansi, Output, Role, Symbol};

/// The style of a role, in console's terms.
pub fn style(role: Role) -> Style {
    let style = match role.ansi() {
        Some(Ansi::Red) => Style::new().red(),
        Some(Ansi::Green) => Style::new().green(),
        Some(Ansi::Yellow) => Style::new().yellow(),
        Some(Ansi::Blue) => Style::new().blue(),
        Some(Ansi::Magenta) => Style::new().magenta(),
        Some(Ansi::Cyan) => Style::new().cyan(),
        Some(Ansi::BrightBlack) => Style::new().bright().black(),
        _ => Style::new(),
    };
    if role.bold() { style.bold() } else { style }
}

/// Stemma's roles and symbols for cliclack: the active prompt in the
/// accent, a cancelled one in danger, a validation error in warning, and
/// what is done muted, with a success mark.
pub struct Theme {
    output: Output,
}

impl Theme {
    /// The theme for `output`, whose symbols and spinner it uses.
    pub fn new(output: Output) -> Theme {
        Theme { output }
    }

    fn mark(&self, symbol: Symbol, role: Role) -> String {
        style(role).apply_to(self.output.symbol(symbol)).to_string()
    }
}

impl cliclack::Theme for Theme {
    fn bar_color(&self, state: &cliclack::ThemeState) -> Style {
        match state {
            cliclack::ThemeState::Active => style(Role::Accent),
            cliclack::ThemeState::Cancel => style(Role::Danger),
            cliclack::ThemeState::Submit => style(Role::Muted),
            cliclack::ThemeState::Error(_) => style(Role::Warning),
        }
    }

    fn state_symbol_color(&self, state: &cliclack::ThemeState) -> Style {
        match state {
            cliclack::ThemeState::Submit => style(Role::Success),
            _ => self.bar_color(state),
        }
    }

    fn info_symbol(&self) -> String {
        self.mark(Symbol::Info, Role::Info)
    }

    fn warning_symbol(&self) -> String {
        self.mark(Symbol::Warning, Role::Warning)
    }

    fn error_symbol(&self) -> String {
        self.mark(Symbol::Failure, Role::Danger)
    }

    fn submit_symbol(&self) -> String {
        self.mark(Symbol::Success, Role::Success)
    }

    fn spinner_chars(&self) -> String {
        self.output.spinner().concat()
    }
}
