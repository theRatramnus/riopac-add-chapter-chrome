chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case "FIND_BOOK":
            findBook(message.payload, sendResponse);
            console.log(message.payload.bookLink)
            break;
        case "LOAD_BOOK":
            console.log("Loading book with ID: " + message.payload.bookID);
            loadBook(message.payload, sendResponse);
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
            (async () => {
                if (details.tabId === tab.id) {
                    console.log('document loaded');
                    const response = await chrome.tabs.sendMessage(
                      tab.id,
                      {
                        type: "GET_BOOK_ID",
                      },
                    );
                    console.log("Book found and tab updated!");
                }
            })();
        });
    })();
}

function loadBook(payload, sendResponse) {
    console.log("Loading book with ID: " + payload.bookID);

    (async () => {
        sendResponse({ ok: true });

      console.log("Updating tab with new URL...");
      await chrome.tabs.update({
        url: "https://opac.regesta-imperii.de/api/oai?verb=GetRecord&metadataPrefix=oai_marc&identifier=" + payload.bookID,
      });

      console.log("Tab updated, now trying to get book info...");

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      await chrome.webNavigation.onCompleted.addListener((details) => {
        (async () => {
          if (details.tabId === tab.id) {
            console.log("document loaded");
          }
          const BookIDResponse = await chrome.tabs.sendMessage(tab.id, {
            type: "GET_BOOK_INFO",
          });
            
          console.log("MARC21 found and tab updated!");
        })();
      })();
    })();
    
}
