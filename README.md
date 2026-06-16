# Wage Wizard

Wage Wizard is a Hattrick salary calculator and squad wage management tool.

[Hattrick](https://www.hattrick.org) is the original online football manager game, where you build and manage your own club and compete against other players around the world.

## Project status

The application is a PHP frontend with modern bundled assets generated from the files in `src/`. The runtime entry point is `index.php`, which expects built files at `dist/wagewizard.min.js` and `dist/wagewizard.min.css`.

## Local development

### Requirements

- PHP 7.3 or newer
- Composer
- pnpm

### Setup

1. Install PHP dependencies: `composer install`
2. Install frontend dependencies: `pnpm install`
3. Copy the example app config: `cp config.php.example config.php`
4. Copy the CHPP config: `cp chpp/config.php.example chpp/config.php`
5. If you want CHPP integration, fill in the CHPP application values in `config.php` and the consumer keys in `chpp/config.php`.
6. Build the frontend assets: `pnpm build`
7. Start a local PHP server from the repository root: `php -S 127.0.0.1:8000`

If you only need the calculator without CHPP access, the CHPP-related values can stay empty.

### Useful commands

- `pnpm build` builds the production JavaScript and CSS bundles.
- `pnpm run build:dev` builds unminified development bundles.
- `pnpm run watch` rebuilds frontend assets when `src/` changes.
- `pnpm test` runs the Vitest suite.
- `pnpm lint` runs JavaScript, SCSS, PHP, and translation linting.
- `composer lint` runs the PHP CS Fixer dry-run check.
- `composer fix` applies PHP CS Fixer fixes.

## How the wage formula works

Wage Wizard estimates a player's weekly wage from a fixed **base salary** plus a
contribution from each outfield skill. You can switch between two formulas in the
**Options** panel:

- **Classic** – the long-standing community coefficients.
- **Refined** (default) – a single shared growth curve re-fitted from scratch
  against Hattrick's community-maintained minimum-wage table. It roughly halves the error of
  the Classic formula.

### The big picture

$$
\text{weekly wage} \approx \Big(\text{base} + \sum_{\text{skills}} \text{component}(\text{level})\Big)
\times \text{bonuses} \times \text{age discount}
$$

- **base** is a fixed amount paid to every player.
- Each skill adds a **component** that grows quickly as the skill level rises.
- **bonuses** cover the speciality bonus (+10%) and the abroad bonus (+20%).
- The **age discount** reduces the wage of older players.

This section focuses on the `component(level)` part, which is where the two
formulas differ.

### The per-skill component

For a given skill at integer level $L$, the raw component is a **power curve**:

$$
	ext{component}(L) = a \cdot (L - c)^{b}
$$

| Symbol | Meaning |
| :----: | ------- |
| $L$ | the skill level (1 = *non-existent*, 2 = *disastrous*, …) |
| $a$ | a per-skill **scale** – how "expensive" that skill is |
| $b$ | the **growth exponent** – how steeply wages rise with level |
| $c$ | the **onset** – the level at which the skill starts costing money |

Higher skills become very expensive, so above a threshold $T$ the curve is
**compressed** (flattened) by a factor $d$:

$$
\text{component} =
\begin{cases}
a (L-c)^{b} & \text{if } a (L-c)^{b} \le T \\
T + \big(a (L-c)^{b} - T\big)\cdot d & \text{otherwise}
\end{cases}
$$

Because $0 < d < 1$, every euro earned *above* the threshold $T$ counts for less,
which matches how top-level wages taper off in the real game.

> Internally the engine works in SEK (EUR × 10) and reports a small range
> (low/high) around each level to account for hidden sub-levels, but the shape of
> the curve is exactly the one above.

### What makes the Refined formula different

The **Classic** formula treats every skill independently: each one has its own
$a$, $b$ and $d$, with a fixed onset $c = 1$.

The **Refined** formula is built on a simple insight: **all outfield skills follow
the same growth curve** – they only differ in how expensive they are. So it shares
one shape across every skill and only varies the per-skill scale $a$:

$$
b \approx 5.98,\quad c \approx 1.82,\quad d \approx 0.818,\quad T \approx 21,412\ \text{EUR}
$$

| Skill | Scale $a$ (Refined) |
| ----- | :-----------------: |
| Playmaking | 0.004504 |
| Scoring    | 0.004059 |
| Defending  | 0.003608 |
| Passing    | 0.002534 |
| Winger     | 0.002261 |

With only **nine numbers** (four shared shape parameters + five per-skill scales),
the Refined curve fits the community-maintained table noticeably better than the
Classic formula's independent fits – its largest per-level errors drop from several
percent down to roughly one percent. The reproducible fit lives in
[`scripts/wage-formula-reverse.mjs`](scripts/wage-formula-reverse.mjs).

### A worked example

Estimating the Defending component at level 10 with the Refined formula:

$$
a (L-c)^{b} = 0.003608 \times (10 - 1.82)^{5.98} \approx 0.003608 \times 8.18^{5.98}
$$

The base $8.18$ raised to $\approx 5.98$ is large but still well below the
threshold $T$, so no compression applies and the result is added directly to the
player's wage alongside the contributions from any other skills.

## Bug tracker

Please report bugs in the GitHub issue tracker:

https://github.com/tagliala/WageWizard/issues

## Internationalization

The translation guide lives in the wiki:

[Internationalization-I18n-guide](https://github.com/tagliala/WageWizard/wiki/Internationalization-I18n-guide)

Translation files can also be checked locally with `pnpm run lint:translations` and normalized with `pnpm run fix:translations`.

## Contributing

Please open pull requests against the `develop` branch.

Before sending a change, run the relevant checks for the files you touched.

## Authors

**Geremia Taglialatela**

- http://github.com/tagliala

## License

Wage Wizard is licensed under the BSD 2-Clause License. See `LICENSE` for the full text.

Third-party libraries and assets included in the repository keep their own licenses in their respective source distributions. The old hand-maintained dependency list has been removed from this README because it was drifting out of date.

## Thanks

Special thanks to [Mark James](http://www.famfamfam.com/) for the [FAMFAMFAM flag icons](http://www.famfamfam.com/lab/icons/flags/).

### Translators

- Lizardopoli (5246225) - English
- Lizardopoli (5246225) - Italiano

### Statistics

- bigpapy (7967145)
- Shinobi-fisc (7328722)

### Testers
