# Picasso

A local React/Express visual design editor with optional AI design review. Arrange panels, text, and buttons; import HTML/CSS into editable designs; export HTML, SVG, or editable project JSON.

## Run

1. Install Node.js **22.12+** and run `npm ci`.
2. Copy `.env.example` to `.env` (`Copy-Item .env.example .env` in PowerShell; `cp .env.example .env` on macOS/Linux). Keep an existing `.env`.
3. For optional AI, add your API key below. Otherwise, leave it blank.
4. Run `npm run dev` and open **http://127.0.0.1:3000**.

```dotenv
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=gpt-5.4
OPENAI_BASE_URL=https://api.openai.com/v1
```

Create an [OpenAI API key](https://platform.openai.com/api-keys) with available quota. The default [GPT-5.4](https://developers.openai.com/api/docs/models/gpt-5.4) supports image input and structured output. Other providers require an OpenAI-compatible Chat Completions endpoint with image input and strict JSON-schema output; change the key, model, and base URL together.

Restart after changing `.env`; set `PORT` there to change the port. The server is loopback-only, not a public hosting service.

## Use

- Start in **Templates** or **Editor**. Drag components, select layers, and edit their properties. Use alignment and undo/redo to refine the layout.
- Open **Screen** for Phone, Tablet, Laptop, or Desktop layouts. Choose **Custom** to apply a width:height aspect ratio at a chosen screen width, enter exact dimensions, or swap orientation. Each side supports 240–4,000 units; layers keep their size and position.
- Hover any element’s edge or corner and drag to resize, including unselected elements. Drag the interior to move. Escape cancels an active drag; completed resizing supports undo/redo.
- Choose **System / Light / Dark** for the interface; artwork and export colors stay unchanged.
- Open **AI design partner**, describe a revision direction, and optionally attach a PNG/JPEG/WebP reference (up to 5 MiB, resized to a maximum 1600px edge). Review the preview and rationale, then **Accept** or **Dismiss**. Accepted changes can be undone.
- **Save locally** replaces one browser-local saved slot. Reopen with **Open saved project**; export/import project JSON for portable backups. Reloading does not save or restore your work.
- **Open → Import HTML / CSS** accepts pasted HTML, an HTML file, and optional separate CSS text or files. Set the layout viewport, choose **Prepare design**, review the converted preview and warnings, then **Import design**. Unsaved replacement requires confirmation. Imported layers can be edited, saved, and exported like any other design, including re-importing Picasso’s standalone HTML or paired HTML/CSS output.
- HTML import is local and static: scripts, event handlers, navigation, and external resources are blocked. Nested/flex/grid layouts become at most 200 independent layers at one viewport. Images, web fonts, responsive relationships, and application behavior are not retained; typography, transparency, and unsupported effects may be approximated or omitted. The preview shows the converted design, not the original website. Each source is limited to 1,000,000 characters; unrepresentable layer sizes, text lengths, or layer counts fail without adopting a partial design.
- **Code**, **Preview**, and HTML/SVG exports use the committed design. Output is fixed-size and absolutely positioned—not responsive, nested, or a functioning application.

## Privacy

Keys stay server-side. `.env` is Git-ignored; **never commit credentials**. AI requests send the canvas image, layout, direction, and attached reference to the configured provider. Manual requests or opt-in live AI may incur charges; avoid sensitive content. References stay in memory, not saves or exports. Live AI starts off and switches off when leaving the editor. Local editing works without AI.

## Commands

```sh
npm test       # automated tests
npm run build  # type-check and build
npm start      # serve the production build locally; build first
```

[Apache License 2.0](LICENSE.txt).
