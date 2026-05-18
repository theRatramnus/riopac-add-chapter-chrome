document.addEventListener("DOMContentLoaded", () => {
  const searchForm = document.querySelector(".search-form");
  if (searchForm) {
    searchForm.addEventListener("submit", () => {
      setTimeout(() => window.close(), 100);
    });
  }
});
