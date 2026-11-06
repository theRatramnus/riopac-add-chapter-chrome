// Rewritten service-worker with one-shot webNavigation listeners
// Module-level state (persist across messages)
let chapterInfo = null;
let bookInfo = null;
// Background jobs started from the result list, keyed by the id of their tab
const backgroundJobs = new Map();

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
      loadMARC21(
        message.payload.chapterID,
        sendResponse,
        "GET_CHAPTER_INFO",
        sender.tab.id,
      );
      break;
    case "LOAD_CHAPTER_BACKGROUND":
      startBackgroundChapter(
        message.payload.chapterID,
        sender.tab.id,
        sendResponse,
      );
      break;
    case "BACK_TO_CHAPTER":
      chapterInfo = message.payload.chapterInfo;
      console.log("Saved chapter info: " + JSON.stringify(chapterInfo));
      console.log(
        "Going back to chapter with ID: " + message.payload.chapterInfo.id,
      );
      backToChapter(message.payload.chapterInfo.id, sender.tab.id);
      sendResponse({ ok: true });
      break;
    case "FIND_BOOK":
      findBook(message.payload, sendResponse, sender.tab.id);
      console.log(message.payload.bookLink);
      break;
    case "LOAD_BOOK":
      console.log("Loading book with ID: " + message.payload.bookID);
      loadMARC21(
        message.payload.bookID,
        sendResponse,
        "GET_BOOK_INFO",
        sender.tab.id,
      );
      break;
    case "SAVE_ITEM":
      saveItem(message.payload.item, sendResponse);
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

function findBook(payload, sendResponse, tabId) {
  console.log("Finding book with link: " + payload.bookLink);

  (async () => {
    sendResponse({ ok: true });

    console.log("Updating tab with new URL...");
    await chrome.tabs.update(tabId, {
      url: "https://opac.regesta-imperii.de/lang_de/" + payload.bookLink,
    });

    console.log("Tab updated, now trying to get book id...");

    addOnceWebNavListener(tabId, payload.bookLink, async () => {
      console.log("document loaded");
      await chrome.tabs.sendMessage(tabId, { type: "GET_BOOK_ID" });
      console.log("Book found and tab updated!");
    });
  })();
}

function marc21URL(id) {
  return (
    "https://opac.regesta-imperii.de/api/oai?verb=GetRecord&metadataPrefix=oai_marc&identifier=" +
    id
  );
}

// Opens the chapter flow in its own inactive tab so the result list stays put
function startBackgroundChapter(id, originTabId, sendResponse) {
  (async () => {
    sendResponse({ ok: true });

    const tab = await chrome.tabs.create({ url: marc21URL(id), active: false });
    backgroundJobs.set(tab.id, { originTabId, id });

    addOnceWebNavListener(tab.id, id, async () => {
      await chrome.tabs.sendMessage(tab.id, { type: "GET_CHAPTER_INFO" });
    });
  })();
}

function loadMARC21(id, sendResponse, followUpMessageType, tabId) {
  console.log("Loading book with ID: " + id);

  (async () => {
    sendResponse({ ok: true });

    console.log("Updating tab with new URL...");
    await chrome.tabs.update(tabId, { url: marc21URL(id) });

    console.log("Tab updated, now trying to get info...");

    addOnceWebNavListener(tabId, id, async () => {
      console.log("document loaded");
      await chrome.tabs.sendMessage(tabId, { type: followUpMessageType });
      console.log("MARC21 found and tab updated!");
    });
  })();
}

function backToChapter(id, tabId) {
  console.log("Going back to chapter with ID: " + id);

  (async () => {
    console.log("Updating tab with new URL...");
    await chrome.tabs.update(tabId, {
      url: "https://opac.regesta-imperii.de/id/" + id,
    });

    console.log("Tab updated, now trying to get book link...");

    addOnceWebNavListener(tabId, id, async () => {
      console.log("document loaded");
      await chrome.tabs.sendMessage(tabId, { type: "GET_BOOK_LINK" });
      console.log("Book link found and tab updated!");
    });
  })();
}

function addChapter(chapterInfo, bookInfo, sendResponse, message, sender) {
  console.log(
    "Adding chapter with ID: " +
      (chapterInfo?.id || "<none>") +
      " to book with ID: " +
      (bookInfo?.id || "<none>"),
  );

  const sessionID = createSessionID();
  const zoteroItem = convertToZoteroItem(chapterInfo, bookInfo, message, sender);
  fixHistorianInName(zoteroItem);
  const payload = {
    sessionID,
    uri: zoteroItem.url || "",
    items: [zoteroItem],
  };

  const job = backgroundJobs.get(sender?.tab?.id);
  if (job) {
    backgroundJobs.delete(sender.tab.id);
    postToZoteroSaveItems(payload)
      .then(() => notifyOrigin(job, true))
      .catch(() => notifyOrigin(job, false))
      .finally(() => {
        chrome.tabs.remove(sender.tab.id).catch(() => {});
        sendResponse({ ok: true });
      });
    return;
  }

  postToZoteroSaveItems(payload)
    .then((result) => {
      sendResponse({
        ok: true,
        status: result.status,
        endpoint: result.endpoint,
        sessionID,
        data: result.text,
      });
      chrome.tabs.create({ url: chrome.runtime.getURL("success.html") });
      
      const currentTabId = sender?.tab?.id;
      if (typeof currentTabId === "number") {
        chrome.tabs.remove(currentTabId).catch(() => {});
      }

      
    })
    .catch((error) => {
      sendResponse({
        ok: false,
        sessionID,
        error: error.message,
      });
    });
  
  
}

function fixHistorianInName(item) {
  if (item.creators) {
    item.creators = item.creators.map((creator) => {
      if (creator.lastName && creator.lastName.includes("(")) {
        creator.lastName = creator.lastName
          .replace(/\s*\([^)]*\)\s*$/, "")
          .trim();
      }
      if (creator.firstName && creator.firstName.includes("(")) {
        creator.firstName = creator.firstName
          .replace(/\s*\([^)]*\)\s*$/, "")
          .trim();
      }
      return creator;
    });
  }
}

function saveItem(item, sendResponse) {
  fixHistorianInName(item);
  const sessionID = createSessionID();
  postToZoteroSaveItems({ sessionID, uri: item.url || "", items: [item] })
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));
}

function notifyOrigin(job, ok) {
  chrome.tabs
    .sendMessage(job.originTabId, { type: "ADD_RESULT", id: job.id, ok })
    .catch(() => {});
}

function createSessionID() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  if (globalThis.crypto?.getRandomValues) {
    const randomBytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(randomBytes);
    const randomHex = Array.from(randomBytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    return `${Date.now()}-${randomHex}`;
  }

  return `${Date.now()}-fallback-session`;
}

function cslPeopleToZoteroCreators(people, creatorType) {
  if (!Array.isArray(people)) return [];

  return people
    .map((person) => ({
      creatorType,
      firstName: person?.given || "",
      lastName: person?.family || "",
    }))
    .filter((creator) => creator.firstName || creator.lastName);
}

function getItemURL(chapterInfo, message, sender) {
  if (chapterInfo?.id) {
    return `https://opac.regesta-imperii.de/id/${chapterInfo.id}`;
  }

  return message.url ?? sender?.tab?.url ?? "";
}

function convertToZoteroItem(chapterInfo, bookInfo, message, sender) {
  const url = getItemURL(chapterInfo, message, sender);
  const hasContainerTitle = Boolean(chapterInfo?.["container-title"]);
  const item = {
    itemType: hasContainerTitle ? "bookSection" : "webpage",
    title: chapterInfo?.title || message.title || "Unbenannt",
    url,
  };

  const authors = cslPeopleToZoteroCreators(chapterInfo?.author, "author");
  const editors = Array.isArray(bookInfo?.editor) ? bookInfo.editor : [];
  const creators = [...authors, ...editors];
  if (creators.length > 0) {
    item.creators = creators;
  }

  const year = chapterInfo?.issued?.["date-parts"]?.[0]?.[0];
  if (year) {
    item.date = String(year);
  }

  if (hasContainerTitle) {
    item.bookTitle = bookInfo.title;
  }

  if (chapterInfo?.page) {
    item.pages = chapterInfo.page;
  }

  if (bookInfo?.place) {
    item.place = bookInfo.place;
  }

  if (bookInfo?.series) {
    item.series = bookInfo.series;
  }

  if (bookInfo?.volume) {
    item.volume = bookInfo.volume;
  }

  if (chapterInfo?.language) {
    item.language = chapterInfo.language;
  }

  return item;
}

async function postToZoteroSaveItems(payload) {
  const baseURLs = ["http://127.0.0.1:23124", "http://127.0.0.1:23119"];
  const errors = [];

  for (const baseURL of baseURLs) {
    try {
      const response = await fetch(`${baseURL}/connector/saveItems`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Zotero-Connector-API-Version": "3",
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text().catch(() => "");
      if (!response.ok) {
        errors.push(
          `${baseURL} -> HTTP ${response.status} ${response.statusText}${text ? `: ${text}` : ""}`,
        );
        continue;
      }

      return {
        endpoint: `${baseURL}/connector/saveItems`,
        status: response.status,
        text,
      };
    } catch (error) {
      errors.push(`${baseURL} -> ${error.message}`);
    }
  }

  chrome.tabs.create({ url: chrome.runtime.getURL("failiure.html") });

  throw new Error(
    `Konnte Zotero /connector/saveItems nicht erreichen oder speichern. ${errors.join(" | ")}`,
  );

}
