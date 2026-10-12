//! Every role and symbol, as this terminal shows them.
//!
//!     cargo run --example roles
//!     NO_COLOR=1 cargo run --example roles

use stemma_design_terminal::{Output, Role, Stream, Symbol};

fn main() {
    let out = Output::detect(Stream::Stdout);
    for role in Role::ALL {
        println!(
            "{:<12} {}",
            format!("{role:?}"),
            out.paint(role, "The quick brown fox")
        );
    }
    println!();
    for symbol in Symbol::ALL {
        println!(
            "{:<12} {}  {}",
            format!("{symbol:?}"),
            symbol.unicode(),
            symbol.ascii()
        );
    }
    println!();
    println!(
        "{} 3 theorems checked {} {}",
        out.paint(Role::Success, out.symbol(Symbol::Success)),
        out.symbol(Symbol::Bullet),
        out.paint(Role::Identifier, "thm:fermat"),
    );
}
