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
      addChapter(chapterInfo, bookInfo, sendResponse);
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

function addChapter(chapterInfo, bookInfo, sendResponse) {
  const url = bookInfo?.url || "";
  const sessionID = null;
  const title = chapterInfo?.title || "Unbekannt";

  chrome.tabs.create({ url: "https://www.zotero.org/download/" });
  console.log(
    "Adding chapter with ID: " +
      (chapterInfo?.id || "<none>") +
      " to book with ID: " +
      (bookInfo?.id || "<none>"),
  );

  const payload = {
    sessionID,
    uri: url,
    items: [
      {
        itemType: "webpage",
        title: "SUCCESSSSSSS",
        url,
        accessDate: new Date().toISOString(),
      },
    ],
  };

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
        throw new Error(
          `HTTP ${res.status} ${res.statusText}${text ? `: ${text}` : ""}`,
        );
      }
      sendResponse({ ok: true, status: res.status, data: text });
    })
    .catch((error) => sendResponse({ ok: false, error: error.message }));
}
