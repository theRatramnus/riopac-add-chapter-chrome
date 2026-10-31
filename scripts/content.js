import { convertMARC21ToZoteroItem } from "../zotero-translate/index.js";
import { fixTitle } from "../typography";

console.log("content script!!!");

// Buttons waiting for a background chapter job, keyed by record id
const pendingButtons = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "ADD_RESULT": {
      const button = pendingButtons.get(message.id);
      pendingButtons.delete(message.id);
      if (button) setButtonResult(button, message.ok);
      break;
    }
    case "START":
      start(document);
      sendResponse({ ok: true });
      break;
    case "GET_CHAPTER_INFO":
      getChapterInfo(document);
      sendResponse({ ok: true });
      break;
    case "GET_BOOK_LINK":
      getBookLink(document);
      sendResponse({ ok: true });
      break;
    case "GET_BOOK_ID":
      getBookId(document);
      sendResponse({ ok: true });
      break;
    case "GET_BOOK_INFO":
      getBookInfo(document);
      sendResponse({ ok: true });
      break;
  }

  return true;
});

function fetchID(doc) {
  console.log("fetch item id");
  const elementsWithClass = doc.querySelectorAll(".linktitel");
  console.log(elementsWithClass);
  const hrefValue = elementsWithClass[0].getAttribute("href");
  console.log(hrefValue);
  const pkValue = hrefValue.match(/pk=(\d+)/)[1];
  console.log(pkValue);
  return pkValue;
}

function start(doc) {
  console.log("start content script");
  startChapter(fetchID(doc));
}

function startChapter(chapterID) {
  chrome.runtime.sendMessage({
    type: "LOAD_CHAPTER",
    payload: {
      chapterID,
    },
  });
}

// Generic items (everything except chapters): MARC21 -> Zotero translator
async function addItemViaMarc(id) {
  const response = await fetch(
    "https://opac.regesta-imperii.de/api/oai?verb=GetRecord&metadataPrefix=oai_marc&identifier=" +
      id,
  );
  if (!response.ok) throw new Error("HTTP " + response.status);

  const xml = new DOMParser().parseFromString(
    await response.text(),
    "application/xml",
  );
  const item = await convertMARC21ToZoteroItem(xml);
  item.url = "https://opac.regesta-imperii.de/id/" + id;

  const result = await chrome.runtime.sendMessage({
    type: "SAVE_ITEM",
    payload: { item },
  });
  if (!result?.ok) throw new Error(result?.error || "Zotero save failed");
}

const getBookId = (doc) => {
  console.log("get book id");
  chrome.runtime.sendMessage({
    type: "LOAD_BOOK",
    payload: {
      bookID: fetchID(doc),
    },
  });
};

const getBookLink = (doc) => {
  console.log("get book link");
  const elementsWithClass = doc.querySelectorAll(".in");
  console.log(elementsWithClass);
  const hrefValue = elementsWithClass[0].getAttribute("href");
  console.log(hrefValue);
  chrome.runtime.sendMessage({
    type: "FIND_BOOK",
    payload: {
      bookLink: hrefValue,
    },
  });
  return hrefValue;
};

function getBookInfo(doc) {
  const editorsString = findContent(doc, "700", "a");
  const bookTitle = findContent(doc, "245", "a");
  const editors = editorsString
    ? editorsString
        .split("; ")
        .map((editor) => editor.trim())
        .filter(Boolean)
    : [];

  const creators = editors.map((editor) => {
    const split = editor.split(", ");
    return {
      firstName: split[1] || "",
      lastName: split[0] || "",
      creatorType: "editor",
    };
  });

  const bookInfo = {
    place: findContent(doc, "264", "a").trim() ?? "",
    series: findContent(doc, "490", "a").split(" / ")[0].trim() ?? "",
    volume: findContent(doc, "490", "a").split(" / ")[1]?.trim() ?? "",
    url: findContent(doc, "502", "a").trim() ?? "",
    editor: creators ?? "",
    title: fixTitle(bookTitle ?? "")
  };

  chrome.runtime.sendMessage({
    type: "ADD_CHAPTER",
    payload: {
      bookInfo: bookInfo,
    },
  });
}

function findContent(doc, tag, code) {
  const namespaces = {
    marc: "http://www.loc.gov/MARC21/slim",
  };

  const datafields = Array.from(
    doc.getElementsByTagNameNS(namespaces.marc, "datafield"),
  );

  for (const datafield of datafields) {
    if (datafield.getAttribute("tag") === tag) {
      const subfields = Array.from(
        datafield.getElementsByTagNameNS(namespaces.marc, "subfield"),
      );

      for (const subfield of subfields) {
        if (subfield.getAttribute("code") === code) {
          return (subfield.textContent || "").trim();
        }
      }
    }
  }

  return "";
}

function getChapterInfo(doc) {
  const parseError = doc.getElementsByTagName("parsererror")[0];
  if (parseError) {
    throw new Error("Ungültiges XML");
  }

  const id =
    getFirstTextContent(doc, "identifier") || getControlField(doc, "001") || "";

  const title = findContent(doc, "245", "a");
  const authorRaw = findContent(doc, "100", "a");
  const yearRaw = findContent(doc, "264", "c");
  const language = findContent(doc, "041", "a");
  const genreRaw = findContent(doc, "516", "a");
  const keywordRaw = findContent(doc, "650", "a");

  const containerTitle = findContent(doc, "773", "t");
  const pagesRaw = findContent(doc, "773", "g");

  const csl = {
    id,
    itemType: containerTitle ? "chapter" : "book",
    title: cleanTitle(title),
  };

  const authors = parseAuthors(authorRaw);
  if (authors.length > 0) {
    csl.author = authors;
  }

  const year = parseYear(yearRaw);
  if (year) {
    csl.issued = {
      "date-parts": [[year]],
    };
  }

  if (containerTitle) {
    csl["container-title"] = cleanTitle(containerTitle);
  }

  const page = parsePages(pagesRaw);
  if (page) {
    csl.page = page;
  }

  if (language) {
    csl.language = mapMarcLanguageToBcp47(language);
  }

  if (keywordRaw) {
    csl.keyword = keywordRaw;
  }

  // Nicht-standardisierte Zusatzinfo; citeproc ignoriert unbekannte Felder.
  // Kann praktisch sein, wenn du die MARC-Herkunft behalten willst.
  if (genreRaw) {
    csl.note = `MARC 516: ${genreRaw}`;
  }

  console.log("Extracted chapter info:", csl);

  chrome.runtime.sendMessage({
    type: "BACK_TO_CHAPTER",
    payload: {
      chapterInfo: csl,
    },
  });
}

function getFirstTextContent(doc, localName) {
  const elements = Array.from(doc.getElementsByTagNameNS("*", localName));
  return elements[0]?.textContent?.trim() || "";
}

function getControlField(doc, tag) {
  const controlfields = Array.from(
    doc.getElementsByTagNameNS(
      "http://www.loc.gov/MARC21/slim",
      "controlfield",
    ),
  );

  const field = controlfields.find(
    (controlfield) => controlfield.getAttribute("tag") === tag,
  );

  return field?.textContent?.trim() || "";
}

function parseAuthors(authorRaw) {
  if (!authorRaw) return [];

  return authorRaw
    .split(/\s*;\s*/)
    .map((name) => name.trim())
    .filter(Boolean)
    .map(parsePersonName);
}

function parsePersonName(name) {
  // MARC 100$a ist hier: "Patzold, Steffen; Reimitz, Helmut"
  if (name.includes(",")) {
    const [family, ...givenParts] = name.split(",");
    return {
      family: family.trim(),
      given: givenParts.join(",").trim(),
    };
  }

  // Fallback für Namen ohne Komma
  const parts = name.split(/\s+/);
  if (parts.length === 1) {
    return { family: parts[0] };
  }

  return {
    given: parts.slice(0, -1).join(" "),
    family: parts.at(-1),
  };
}

function parseYear(value) {
  const match = String(value).match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

function parsePages(value) {
  if (!value) return "";

  return value
    .replace(/^S\.\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanTitle(value) {
  return fixTitle(value);
}

function mapMarcLanguageToBcp47(code) {
  const map = {
    ger: "de",
    deu: "de",
    eng: "en",
    fre: "fr",
    fra: "fr",
    ita: "it",
    spa: "es",
    lat: "la",
  };

  return map[code] || code;
}

async function onAddButtonClick(link, button) {
  const pk = link.getAttribute("href").match(/pk=(\d+)/)?.[1];
  if (!pk) return;

  const type = link.closest("table")?.querySelector("img")?.alt;
  button.disabled = true;
  button.textContent = "…";

  if (type === "Buchbeitrag") {
    pendingButtons.set(pk, button);
    chrome.runtime.sendMessage({
      type: "LOAD_CHAPTER_BACKGROUND",
      payload: { chapterID: pk },
    });
    return;
  }

  try {
    await addItemViaMarc(pk);
    setButtonResult(button, true);
  } catch (error) {
    console.error(error);
    setButtonResult(button, false);
  }
}

// TODO: replace with your Ko-fi page
const KOFI_URL = "https://ko-fi.com/ludwigpatzold";

function setButtonResult(button, ok) {
  button.disabled = ok;
  button.textContent = ok ? "Added ✓" : "Fehler – erneut versuchen";
  if (ok && !button.parentElement.querySelector(".riopac-kofi")) {
    const kofi = document.createElement("a");
    kofi.className = "riopac-kofi";
    kofi.href = KOFI_URL;
    kofi.target = "_blank";
    kofi.rel = "noopener";
    kofi.textContent = "☕ Support me on Ko-fi";
    kofi.style.cssText =
      "display:inline-block;padding:2px 10px;background:#29abe0;color:#fff;border-radius:3px;font-size:90%;text-decoration:none;";
    button.after(kofi);
  }
}

function addButtonsToListEntries(doc) {
  doc.querySelectorAll("a.linktitel").forEach((link) => {
    const cell = link.closest("td");
    if (!cell || cell.querySelector(".riopac-add-button")) return;

    // Thin separator line below each entry, like a plain list
    const entry = link.closest("table");
    if (entry) {
      entry.style.cssText +=
        ";width:100%;border-bottom:1px solid #adacac;padding-bottom:8px;margin-bottom:4px;";
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "riopac-add-button";
    button.textContent = "+ Add";
    button.addEventListener("click", () => onAddButtonClick(link, button));
    button.style.cssText =
      "padding:2px 10px;background:#a51d2d;color:#fff;border:1px solid #7f1520;border-radius:3px;font:inherit;font-size:90%;cursor:pointer;margin-bottom:6px;";
    const row = document.createElement("div");
    row.style.cssText =
      "display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:10px;";
    row.appendChild(button);
    cell.appendChild(row);
  });
}

addButtonsToListEntries(document);
