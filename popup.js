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

  if (!tab.url.includes("buchbeitrag")) {
    // show message in popup that extension only works for chapters
    const msg = document.createElement("div");
    msg.textContent = "Die extension funktioniert nur für Buchbeiträge.";
    msg.style.padding = "12px";
    msg.style.fontFamily = "sans-serif";
    msg.style.fontSize = "14px";
    document.body.appendChild(msg);
    return;
  }

  const response = await chrome.tabs.sendMessage(tab.id, {
    type: "START",
  });
})();
