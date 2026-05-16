// Rewritten service-worker with one-shot webNavigation listeners
// Module-level state (persist across messages)
let chapterInfo = null;
let bookInfo = null;

function addOnceWebNavListener(tabId, urlContains, handler) {
  const listener = async (details) => {
    if (details.tabId !== tabId) return;
    if (urlContains && !(details.url || "").includes(urlContains)) return;
    try {
      await handler(details);
    } finally {
      chrome.webNavigation.onCompleted.removeListener(listener);
    }
  };
  chrome.webNavigation.onCompleted.addListener(listener);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "LOAD_CHAPTER":
      console.log("Loading chapter with ID: " + message.payload.chapterID);
      loadMARC21(message.payload.chapterID, sendResponse, "GET_CHAPTER_INFO");
      break;
    case "BACK_TO_CHAPTER":
      chapterInfo = message.payload.chapterInfo;
      console.log("Saved chapter info: " + JSON.stringify(chapterInfo));
      console.log(
        "Going back to chapter with ID: " + message.payload.chapterInfo.id,
      );
      backToChapter(message.payload.chapterInfo.id);
      sendResponse({ ok: true });
      break;
    case "FIND_BOOK":
      findBook(message.payload, sendResponse);
      console.log(message.payload.bookLink);
      break;
    case "LOAD_BOOK":
      console.log("Loading book with ID: " + message.payload.bookID);
      loadMARC21(message.payload.bookID, sendResponse, "GET_BOOK_INFO");
      break;
    case "ADD_CHAPTER":
      bookInfo = message.payload.bookInfo;
      console.log("Saved book info: " + JSON.stringify(bookInfo));
      console.log("Adding chapter with ID: " + message.payload.chapterID);
      addChapter(chapterInfo, bookInfo, sendResponse, message, sender);
      break;
  }

  return true; // sendResponse async
});

function findBook(payload, sendResponse) {
  console.log("Finding book with link: " + payload.bookLink);

  (async () => {
    sendResponse({ ok: true });

    console.log("Updating tab with new URL...");
    await chrome.tabs.update({
      url: "https://opac.regesta-imperii.de/lang_de/" + payload.bookLink,
    });

    console.log("Tab updated, now trying to get book id...");

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    addOnceWebNavListener(tab.id, payload.bookLink, async () => {
      console.log("document loaded");
      await chrome.tabs.sendMessage(tab.id, { type: "GET_BOOK_ID" });
      console.log("Book found and tab updated!");
    });
  })();
}

function loadMARC21(id, sendResponse, followUpMessageType) {
  console.log("Loading book with ID: " + id);

  (async () => {
    sendResponse({ ok: true });

    console.log("Updating tab with new URL...");
    await chrome.tabs.update({
      url:
        "https://opac.regesta-imperii.de/api/oai?verb=GetRecord&metadataPrefix=oai_marc&identifier=" +
        id,
    });

    console.log("Tab updated, now trying to get info...");

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    addOnceWebNavListener(tab.id, id, async () => {
      console.log("document loaded");
      await chrome.tabs.sendMessage(tab.id, { type: followUpMessageType });
      console.log("MARC21 found and tab updated!");
    });
  })();
}

function backToChapter(id) {
  console.log("Going back to chapter with ID: " + id);

  (async () => {
    console.log("Updating tab with new URL...");
    await chrome.tabs.update({
      url: "https://opac.regesta-imperii.de/id/" + id,
    });

    console.log("Tab updated, now trying to get book link...");

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    addOnceWebNavListener(tab.id, id, async () => {
      console.log("document loaded");
      await chrome.tabs.sendMessage(tab.id, { type: "GET_BOOK_LINK" });
      console.log("Book link found and tab updated!");
    });
  })();
}

function addChapter(chapterInfo, bookInfo, sendResponse, message, sender) {
  // optional: aus message übernehmen (z.B. von content script)
  const url = message.url ?? sender?.tab?.url ?? "";
  const title = message.title ?? "Unbenannt";

  // sessionID: Connector verwendet sie, um mehrere Requests zu einer Speicherung zu bündeln
  const sessionID =
    (globalThis.crypto?.randomUUID && crypto.randomUUID()) ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  console.log(
    "Adding chapter with ID: " +
      (chapterInfo?.id || "<none>") +
      " to book with ID: " +
      (bookInfo?.id || "<none>"),
  );

  // const payload = {
  //   sessionID,
  //   // optional, aber oft sinnvoll, weil Zotero intern damit u.a. Proxy/Referrer koppelt
  //   uri: url,
  //   items: [
  //     {
  //       ...chapterInfo,
  //     },
  //   ],
  // };

  const payload = {
    sessionID,
    // optional, aber oft sinnvoll, weil Zotero intern damit u.a. Proxy/Referrer koppelt
    uri: url,
    items: [
      {
        id: "http://zotero.org/groups/497580/items/VAPWBVQ6",
        type: "chapter",
        "container-title":
          "Zwischen Römerzeit und Karl dem Grossen: die frühmittelalterlichen Grabfunde aus Worms und Rheinhessen im Museum der Stadt Worms im Andreasstift",
        page: "91-95",
        "publisher-place": "Lindenberg",
        source: "COinS",
        title: "Worms und seine Kirchen",
        author: [
          {
            family: "Grünewald",
            given: "Mathilde",
          },
        ],
        editor: [
          {
            family: "Grünewald",
            given: "Mathilde",
          },
          {
            family: "Wieczorek",
            given: "Alfried",
          },
        ],
        issued: {
          "date-parts": [["2009"]],
        },
      },
    ],
  };

  function createHTML(content) {
    // Erzeuge eine kleine HTML-Seite, die das payload als formatiertes JSON anzeigt
    const escapeHtml = (s) =>
      String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const html =
      "<!doctype html><meta charset='utf-8'><title>Payload</title>" +
      "<style>body{font-family:monospace;padding:1rem}</style>" +
      "<pre>" +
      escapeHtml(content) +
      "</pre>";

    return html;
  }

  // Öffne einen neuen Tab mit der generierten Data-URL
  chrome.tabs.create({
    url:
      "data:text/html;charset=utf-8," +
      encodeURIComponent(createHTML(JSON.stringify(payload, null, 2))),
  });

  fetch("http://127.0.0.1:23124/connector/saveItems", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Zotero-Connector-API-Version": "3",
    },
    body: JSON.stringify(payload),
  })
    .then(async (res) => {
      const text = await res.text().catch(() => "");
      if (!res.ok) {
        chrome.tabs.create({
          url:
            "data:text/html;charset=utf-8," +
            encodeURIComponent(
              createHTML(
                `HTTP ${res.status} ${res.statusText}${text ? `: ${text}` : ""}`,
              ),
            ),
        });

        throw new Error(
          `HTTP ${res.status} ${res.statusText}${text ? `: ${text}` : ""}`,
        );
      }
      sendResponse({ ok: true, status: res.status, data: text });
    })
    .catch((error) => sendResponse({ ok: false, error: error.message }));
}
