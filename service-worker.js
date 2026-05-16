chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  let chapterInfo = null;
  let bookInfo = null;
  switch (message.type) {
    case "LOAD_CHAPTER":
      console.log("Loading chapter with ID: " + message.payload.chapterID);
      loadMARC21(message.payload.chapterID, sendResponse, "GET_CHAPTER_INFO");
      sendResponse({ ok: true });
      break;
    case "BACK_TO_CHAPTER":
      chapterInfo = message.payload.chapterInfo;
      console.log(
        "Saved chapter info: " + JSON.stringify(chapterInfo),
      );
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
      console.log(
        "Saved book info: " + JSON.stringify(bookInfo),
      );
      console.log("Adding chapter with ID: " + message.payload.chapterID);
      addChapter(chapterInfo, bookInfo);
      sendResponse({ ok: true });
      break;
  }

    
    return true; // sendResponse async
})

function findBook(payload, sendResponse) {
    
    console.log("Finding book with link: " + payload.bookLink);

    (async () => {

        sendResponse({ ok: true });

        console.log("Updating tab with new URL...");
        await chrome.tabs.update({
            url: "https://opac.regesta-imperii.de/lang_de/" + payload.bookLink
        });


        console.log("Tab updated, now trying to get book id...")


        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

      await chrome.webNavigation.onCompleted.addListener((details) => {
          let didNavigateToBook = false;
            (async () => {
                if (details.tabId === tab.id && tab.url.includes(payload.bookLink) && !didNavigateToBook) {
                    console.log('document loaded');
                    const response = await chrome.tabs.sendMessage(
                      tab.id,
                      {
                        type: "GET_BOOK_ID",
                      },
                    );
                    console.log("hi!");
                    didNavigateToBook = true;
                    console.log("Book found and tab updated!");
                }
            })();
        });
    })();
}

function loadMARC21(id, sendResponse, followUpMessageType) {
   let didLoadMARC21 = {};
  console.log("Loading book with ID: " + id);
  didLoadMARC21[id] = false;
  

    (async () => {
        sendResponse({ ok: true });

      console.log("Updating tab with new URL...");
      await chrome.tabs.update({
        url: "https://opac.regesta-imperii.de/api/oai?verb=GetRecord&metadataPrefix=oai_marc&identifier=" + id,
      });

      console.log("Tab updated, now trying to get info...");

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      await chrome.webNavigation.onCompleted.addListener((details) => {
       
        
        (async () => {
          if (details.tabId === tab.id && tab.url.includes(id) && !didLoadMARC21[id]) {
            console.log("document loaded");
            didLoadMARC21[id] = true;
            const BookIDResponse = await chrome.tabs.sendMessage(tab.id, {
              type: followUpMessageType,
            });

            console.log("MARC21 found and tab updated!");
          }
        })();
      })();
    })();
    
}

function backToChapter(id) { 
   
    console.log("Going back to chapter with ID: " + id);

    (async () => {
        console.log("Updating tab with new URL...");
        await chrome.tabs.update({
          url: "https://opac.regesta-imperii.de/id/" + id,
        });

        console.log("Tab updated, now trying to get book link...")

        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

      await chrome.webNavigation.onCompleted.addListener((details) => {
           let didGoBack = false;
            (async () => {
                if (details.tabId === tab.id && tab.url.includes(id) && !didGoBack) {
                    console.log('document loaded');
                    const response = await chrome.tabs.sendMessage(
                      tab.id,
                      {
                        type: "GET_BOOK_LINK",
                      },
                    );
                    didGoBack = true;
                    console.log("Book link found and tab updated!");
                }
            })();
        });
    })(); 
}

function addChapter(chapterInfo, bookInfo) {
    console.log("Adding chapter with ID: " + chapterInfo.id + " to book with ID: " + bookInfo.id);
    // Implement the logic to add the chapter to the book using the provided chapterInfo and bookInfo
}