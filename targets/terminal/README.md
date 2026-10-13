# stemma-design-terminal

Stemma's design system for command lines and terminal interfaces. A set of
themes, not a framework: a tool keeps calling its own libraries and only
takes the roles, symbols and themes from here.

```toml
[dependencies]
stemma-design-terminal = { git = "https://github.com/stemma-math/design", tag = "vX.Y.Z", features = ["clap", "cliclack", "indicatif"] }
```

## What it provides

| Item                         | What it is                                                                                                                                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Role`                       | What text is: the intents `Accent`, `Success`, `Warning`, `Danger`, `Info`, and `Muted`, `Identifier`, `Strong`. Each maps to one of the 16 named ANSI colours (`Role::ansi`), so it follows the terminal's theme.                                |
| `LIGHT`, `DARK`, `Role::rgb` | The design tokens' colour for each role, for terminals with a light or dark background, where truecolour is wanted. Generated from the tokens.                                                                                                    |
| `Symbol`, `SPINNER`          | The shared symbols (✓ ✗ ▲ ● ∎ · → ← …) and spinner frames, each with an ASCII alternative.                                                                                                                                                        |
| `Output`                     | The one colour policy: no colour when `NO_COLOR` is set, when the stream is not a terminal or when `TERM=dumb`; `Output::plain()` or `with_plain(true)` for `--json` and other output a program reads. `paint`, `symbol` and `spinner` follow it. |
| `themes::clap::styles()`     | `Styles` for clap's help and errors. Feature `clap`.                                                                                                                                                                                              |
| `themes::cliclack::Theme`    | A theme for cliclack's prompts. Feature `cliclack`.                                                                                                                                                                                               |
| `themes::indicatif`          | `ProgressStyle` presets (`spinner`, `timed_spinner`, `bar`, `download`) and tick strings. Feature `indicatif`.                                                                                                                                    |
| `Output::apply_to_console`   | Makes `console`, which cliclack and indicatif draw with, follow the policy. With either feature.                                                                                                                                                  |

```rust
use stemma_design_terminal::{Output, Role, Stream, Symbol};

let out = Output::detect(Stream::Stdout).with_plain(json);
println!("{} {}", out.paint(Role::Success, out.symbol(Symbol::Success)), "Checked");
```

`cargo run --example roles` shows every role and symbol in the terminal at
hand.

The versions of clap (4.6), cliclack (0.5) and indicatif (0.18) are those
the `stemma` command line uses.

`src/tokens.rs` is generated from the design tokens by the repository's
`tools/tokens.py`, and must not be edited here.

## Licence

MIT (`LICENSE`).
