(async () => {

  console.log("hi");

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!tab.url.includes("opac.regesta-imperii.de/lang_de/")) { 
    chrome.tabs.update({
      url: "https://opac.regesta-imperii.de/lang_de/",
    });
  }

  const response = await chrome.tabs.sendMessage(tab.id, {
    type: "START",
  });
})();
