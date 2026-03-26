# transi-store cli

## Installation

```bash
npm install -g @transi-store/cli
```

## Download translations

### With configuration file

```bash
transi-store [options]
```

For more information, run:

```bash
transi-store --help
```

#### Options

- `--config <path>`: Path to the configuration file (default: `transi-store.config.json`).
- `--branch`: The branch to download the translations from. Defaults to "main". Use `@all` to download all translations across every branch (no branch filtering).

#### Configuration file example

```jsonc
// transi-store.config.json
{
  "$schema": "https://unpkg.com/@transi-store/cli/schema.json",
  "org": "my-org",
  "projects": [
    {
      "project": "my-project",
      "langs": ["en", "fr", "de"],
      "format": "json",
      "output": "./locales/<lang>/translations.json",
    },
  ],
}
```

You can define multiple projects in the `projects` array.

The `"$schema"` field is optional but recommended for editor autocompletion and validation.

The `output` must include the `<lang>` placeholder, which will be replaced by the actual locale code during the download process. It can also include other placeholders like `<format>` and `<project>`.

You must also provide the `TRANSI_STORE_API_KEY` environment variable with your Transi-Store API key to authenticate the requests.

### With parameters

If you don't want to use a configuration file, you can provide the necessary parameters directly in the command line:

```bash
transi-store download --org <orgSlug> \
  --project <projectSlug> \
  --locale <locale> \
  --output <outputPath> \
  --format <format>
```

## Upload translations

To upload translations, you can use the following command:

```bash
transi-store upload --org <orgSlug> \
  --project <projectSlug> \
  --locale <locale> \
  --input <inputPath> \
  --format <format>
```

Optional parameters:

- `--domain-root`: The root directory for the domain. This is used to determine the domain of the translations based on the input file path. Defaults to "https://transi-store.com".
- `--strategy`: eiher "overwrite" (default) or "skip". Determines how to handle existing translations. "overwrite" will replace existing translations with the new ones, while "skip" will keep existing translations and only add new ones.
- `--branch`: The branch to upload the translations to. Defaults to "main".

You must also provide the `TRANSI_STORE_API_KEY` environment variable with your Transi-Store API key to authenticate the requests.

## Contributing

### Publish package

To publish a new version of the CLI package, follow these steps:

1. Update the version number in `packages/cli/package.json`.
2. Commit the changes with a message like `chore(cli): publish version x.y.z`
3. Run the publish script from the root of the monorepo:

   ```bash
   yarn build:cli
   yarn workspace @transi-store/cli npm publish --access public
   ```
