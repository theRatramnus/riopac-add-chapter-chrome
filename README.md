# riopac-add-chapter-chrome

>[!IMPORTANT]
>If you're using https://github.com/theRatramnus/RIOPACAddChapter, please deactivate it in Zotero's settings. It leads to confilcts with this extension.
>In general, the Zotero extension would be the right way, but it doesn't work right now, and it will probably not work again.
>This is not my decision, the RI Opac prohibits using it's websites with a headless browser, which the extension used to gather the information.

This Chrome extension imports book chapters with full information (including the editors and publisher's place) from RI OPAC and saves them to Zotero Desktop.
It also modifies the RI Opac webpage to include Add-Buttons for all titles:

<img width="942" height="517" src="https://github.com/user-attachments/assets/6231097e-a020-4c81-9a31-3f7fc9c06ba8" />

If 


## Installation

You can install the extension by downloading the [zip file](https://github.com/theRatramnus/riopac-add-chapter-chrome/releases/latest) and loading the folder it extracts to as an [unpacked extension](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world?hl=de#load-unpacked). This requires you to use Chrome in development mode. Proceed at your own risk!

## Usage - please read!

When on a RI Opac page you can click the "+ Add"-Button to save the item to Zotero Desktop. 

> [!IMPORTANT]
> This will use your browser to gather the required information, in a new tab. 
> It will load new websites in the new tab. This is normal behaviour, don't worry.
> Once it's done it will close the new tab. You can just keep working as normal, just don't disrupt the generated tab.

You won't need the Zotero Connector anymore when importing information from the RI Opac.

Remember to have Zotero running. Otherwise the extension will not work!

## Thanks

- to @akliner for the great [template repository](https://github.com/aklinker1/vite-plugin-web-extension)!
- Zotero for the great open source platform :)
- ChatGPT, GitHub Copilot, Gemini & Claude 🙃
  

## Legal: Third-Party Software

This project includes code from the [Zotero Translators](https://github.com/zotero/translators).

**Original license:** GNU Affero General Public License v3.0 (AGPL-3.0) (same as this repo)

**Original copyright:** See copyright notices in the original source files.

**Files used:**
- `zotero-translate/MARC.gen.js`
- `zotero-translate/MARCXML.gen.js`

**Modifications:**

The Zotero translators were wrapped into ES Modules by `zotero-translate/vendor.mjs`.

The original license text is included in `LICENSE.md`.

The original copyright and license notices are preserved.
