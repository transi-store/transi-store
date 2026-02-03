# transi-store cli

## Installation

```bash
npm install -g @transi-store/cli
```

## Usage

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

## Contributing

### Publish package

To publish a new version of the CLI package, follow these steps:

1. Update the version number in `packages/cli/package.json`.
2. Commit the changes with a message like `chore(cli): publish version x.y.z
3. Run the publish script from the root of the monorepo:

   ```bash
   yarn build:cli
   cd packages/cli
   npm publish --access public
   ```
