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
