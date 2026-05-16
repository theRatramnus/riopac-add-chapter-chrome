console.log("content script!!!");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
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
  chrome.runtime.sendMessage({
    type: "LOAD_CHAPTER",
    payload: {
      chapterID: fetchID(doc),
    },
  });
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

  function fixTitle(tag, code) {
    const fetchedContent = findContent(doc, tag, code) ?? "";
    return changeTitle(fetchedContent);
  }

  const bookInfo = {
    place: findContent(doc, "264", "a").trim() ?? "",
    series: findContent(doc, "490", "a").split(" / ")[0].trim() ?? "",
    volume: findContent(doc, "490", "a").split(" / ")[1]?.trim() ?? "",
    url: findContent(doc, "502", "a").trim() ?? "",
    editor: creators ?? "",
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
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[/.]\s*$/, "")
    .trim();
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

function replaceDashesWithEnDash(input) {
    const regex = /([0-9])\s*-\s*([0-9])/g;
    const replaced = input.replace(regex, '$1–$2'); // Note: Use an en dash character here

    return replaced;
}

function replaceSpacesAroundHyphenWithEnDash(input) {
    const regex = /\s-\s/g;
    const replaced = input.replace(regex, ' – '); // En dash character surrounded by spaces

    return replaced;
}

function replaceLastEWithSupE(input) {
    const regex = /([\s(-][IVX][A-Z]*)e([\s-)])/;
    const replaced = input.replace(regex, '$1<sup>e</sup>$2');

    return replaced;
}

  function replaceSemicolonWithPeriod(input) {
    const regex = /\s;\s/g;
    const replaced = input.replace(regex, '. ');

    return replaced;
}

 function removeColonAfterQuestionmark(input) {
    const regex = /\?:/;
    const replaced = input.replace(regex, '?');

    return replaced;
}
function removeParenthesesContent(input) {
    const regex = /\(.*\)/g;
    const replaced = input.replace(regex, '');

    return replaced;
}

function changeTitle(input){
    return replaceSpacesAroundHyphenWithEnDash(replaceDashesWithEnDash(replaceLastEWithSupE(replaceLastEWithSupE((replaceSemicolonWithPeriod(removeColonAfterQuestionmark(input)))))))
}
