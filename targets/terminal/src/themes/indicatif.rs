//! Progress styles and spinner frames for indicatif.
//!
//! ```
//! # #[cfg(feature = "indicatif")] {
//! use stemma_design_terminal::{Output, Stream, themes::indicatif};
//!
//! let output = Output::detect(Stream::Stderr);
//! let bar = ::indicatif::ProgressBar::new(10).with_style(indicatif::bar(&output));
//! # }
//! ```

use indicatif::ProgressStyle;

use crate::{Output, Symbol};

/// The spinner's frames, then the mark it ends on.
pub fn tick_strings(output: &Output) -> Vec<&'static str> {
    let mut frames = output.spinner().to_vec();
    frames.push(output.symbol(Symbol::Success));
    frames
}

/// A spinner in the accent, then the message.
pub fn spinner(output: &Output) -> ProgressStyle {
    ProgressStyle::with_template("{spinner:.blue} {msg}")
        .expect("a valid template")
        .tick_strings(&tick_strings(output))
}

/// A spinner, the message, a bar in the accent and the count.
pub fn bar(output: &Output) -> ProgressStyle {
    let characters = if output.unicode() { "━━─" } else { "=> " };
    ProgressStyle::with_template("{spinner:.blue} {msg} {bar:30.blue/black.bright} {pos}/{len}")
        .expect("a valid template")
        .tick_strings(&tick_strings(output))
        .progress_chars(characters)
}

/// A bar for a download: bytes, rate and time left.
pub fn download(output: &Output) -> ProgressStyle {
    let characters = if output.unicode() { "━━─" } else { "=> " };
    ProgressStyle::with_template(
        "{spinner:.blue} {msg} {bar:30.blue/black.bright} {bytes}/{total_bytes} {bytes_per_sec} {eta}",
    )
    .expect("a valid template")
    .tick_strings(&tick_strings(output))
    .progress_chars(characters)
}
