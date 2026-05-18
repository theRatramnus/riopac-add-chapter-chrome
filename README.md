# riopac-add-chapter-chrome

This Chrome extension imports book chapters with full information (including the editors and publisher's place) from RI OPAC and saves them to Zotero Desktop.

(This was vibecoded in a weekend, but could be useful still.)

## Installation

The process of getting the extension published to the Chrome Web Store seemed like a lot of trouble for a very temporary solution.
You can install the extension by downloading the zip file and loading the folder it extracts to as an [unpacked extension](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world?hl=de#load-unpacked). This requires you to use Chrome in development mode. Proceed at your own risk!

## Usage - please read!

When on a RI Opac page with describing a chapter, you can click on the extension's icon. 
This will use your tab to gather the required information. 
It will load new websites in the active tab. This is normal behaviour, don't worry.
Once it's it will close the current tab, opening a new tab that allows you to search in the RI Opac again.

The extension is a substitute for the Zotero Connector extension when importing chapters.
However, the extension ONLY works for chapters.

You will need both the Zotero Connector as well as this plugin when trying to import chapters.

Importing chapters with the Zotero Connector however will lead to incomplete information, only use it for the other content types.


## Thanks

- to @akliner for the great [template repository](https://github.com/aklinker1/vite-plugin-web-extension)!
- ChatGPT, GitHub Copilot and Gemini 🙃
