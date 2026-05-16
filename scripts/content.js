console.log("content script!!!");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "START":
      start(document);
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

function start(doc) {
  chrome.runtime.sendMessage({
    type: "FIND_BOOK",
    payload: {
      bookLink: getBookLink(doc),
    },
  });
}

const getBookId = (doc) => {
  console.log("get book id");
  const elementsWithClass = doc.querySelectorAll(".linktitel");
  console.log(elementsWithClass);
  const hrefValue = elementsWithClass[0].getAttribute("href");
  console.log(hrefValue);
  const pkValue = hrefValue.match(/pk=(\d+)/)[1];
  console.log(pkValue);

  chrome.runtime.sendMessage({
    type: "LOAD_BOOK",
    payload: {
      bookID: pkValue,
    },
  });

  return pkValue;
};

const getBookLink = (doc) => {
  console.log("get book link");
  const elementsWithClass = doc.querySelectorAll(".in");
  console.log(elementsWithClass);
  const hrefValue = elementsWithClass[0].getAttribute("href");
    console.log(hrefValue);
    
  return hrefValue;
};

function extractBookInfo(xmlDocument) {
  const editorsString = findContent(xmlDocument, "700", "a");
  const editors = editorsString.split("; ");

  const creators = editors.map((editor) => {
    const split = editor.split(", ");
    return { firstName: split[1], lastName: split[0], creatorType: "editor" };
  });

  function fixTitle(tag, code) {
    const fetchedContent = findContent(xmlDocument, tag, code) ?? "";
    return getPref("enhancedTypography")
      ? Typography.fixTitle(fetchedContent)
      : fetchedContent;
  }

  return {
    bookTitle: fixTitle("245", "a"),
    place: findContent(xmlDocument, "264", "a").trim() ?? "",
    series: findContent(xmlDocument, "490", "a").split(" / ")[0].trim() ?? "",
    volume: findContent(xmlDocument, "490", "a").split(" / ")[1]?.trim() ?? "",
    url: findContent(xmlDocument, "502", "a").trim() ?? "",
    editors: creators ?? "",
  };
}
