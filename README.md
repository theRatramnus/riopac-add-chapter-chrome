# riopac-add-chapter-chrome

>[!IMPORTANT]
>If you're using https://github.com/theRatramnus/RIOPACAddChapter, please deactivate it in Zotero's settings. It leads to confilcts with this extension.
>In general, the Zotero extension is the better choice, but it doesn't work right now.

This Chrome extension imports book chapters with full information (including the editors and publisher's place) from RI OPAC and saves them to Zotero Desktop.


## Installation

You can install the extension by downloading the [zip file](https://github.com/theRatramnus/riopac-add-chapter-chrome/releases/download/v1.0/dist.zip) and loading the folder it extracts to as an [unpacked extension](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world?hl=de#load-unpacked). This requires you to use Chrome in development mode. Proceed at your own risk!

## Usage - please read!

When on a RI Opac page with describing a chapter, you can click on the extension's icon. 
This will use your tab to gather the required information. 
It will load new websites in the active tab. This is normal behaviour, don't worry.
Once it's it will close the current tab, opening a new tab that allows you to search in the RI Opac again.

The extension is a substitute for the Zotero Connector extension when importing chapters.
However, the extension ONLY works for chapters.

You will need both the Zotero Connector as well as this plugin when trying to import chapters.

Importing chapters with the Zotero Connector however will lead to incomplete information, only use it for the other content types.

Remember to have Zotero running. Otherwise the extension will not work!

## Thanks

- to @akliner for the great [template repository](https://github.com/aklinker1/vite-plugin-web-extension)!
- ChatGPT, GitHub Copilot and Gemini 🙃

## Legal: Third-Party Software

This project includes code from the [Zotero Translators]([https://github.com/OWNER/REPO](https://github.com/zotero/translators)).

**Original license:** GNU Affero General Public License v3.0 (AGPL-3.0) (same as this repo)

**Original copyright:** See copyright notices in the original source files.

**Files used:**
- `zotero-translate/MARC.gen.js`
- `zotero-translate/MARCXML.gen.js`

**Modifications:**

The Zotero translators were wrapped into ES Modules by `zotero-translate/vendor.mjs`.

The original license text is included in `LICENSE.md`.

The original copyright and license notices are preserved.
