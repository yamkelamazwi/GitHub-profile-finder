const STORAGE_KEYS = {
  history: "github-profile-history",
  favorites: "github-profile-favorites",
  theme: "github-profile-theme",
};

const quickUsers = [
  "octocat",
  "gaearon",
  "torvalds",
  "microsoft",
  "facebook",
  "vercel",
  "vuejs",
  "sindresorhus",
  "github",
  "nodejs",
];

const state = {
  user: null,
  repos: [],
  activeFilter: "updated",
};

const form = document.getElementById("search-form");
const input = document.getElementById("username-input");
const results = document.getElementById("results");
const historyList = document.getElementById("search-history");
const favoritesList = document.getElementById("favorites-list");
const clearButton = document.getElementById("clear-btn");
const randomButton = document.getElementById("random-btn");
const themeToggle = document.getElementById("theme-toggle");
const suggestions = document.getElementById("quick-suggestions");

initialize();

function initialize() {
  applySavedTheme();
  renderSuggestions();
  renderHistory();
  renderFavorites();
  bindEvents();
}

function bindEvents() {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = input.value.trim();

    if (!username) {
      showMessage("Please enter a GitHub username.", true);
      return;
    }

    await loadUserProfile(username);
  });

  clearButton.addEventListener("click", () => {
    input.value = "";
    input.focus();
    results.innerHTML = "";
    state.user = null;
    state.repos = [];
    state.activeFilter = "updated";
  });

  randomButton.addEventListener("click", async () => {
    const randomUser = quickUsers[Math.floor(Math.random() * quickUsers.length)];
    input.value = randomUser;
    await loadUserProfile(randomUser);
  });

  themeToggle.addEventListener("click", () => {
    const isLight = document.body.classList.contains("light-theme");
    document.body.classList.toggle("light-theme", !isLight);

    const nextTheme = document.body.classList.contains("light-theme") ? "light" : "dark";
    localStorage.setItem(STORAGE_KEYS.theme, nextTheme);
    themeToggle.textContent = nextTheme === "dark" ? "🌙" : "☀️";
  });

  suggestions.addEventListener("click", async (event) => {
    const chip = event.target.closest("[data-username]");
    if (!chip) return;

    const username = chip.dataset.username;
    input.value = username;
    await loadUserProfile(username);
  });

  historyList.addEventListener("click", async (event) => {
    const chip = event.target.closest("[data-history-user]");
    if (!chip) return;
    const username = chip.dataset.historyUser;
    input.value = username;
    await loadUserProfile(username);
  });

  favoritesList.addEventListener("click", async (event) => {
    const favoriteBtn = event.target.closest("[data-favorite-user]");
    if (favoriteBtn) {
      removeFavorite(favoriteBtn.dataset.favoriteUser);
      return;
    }

    const favoriteLink = event.target.closest("[data-open-user]");
    if (favoriteLink) {
      const username = favoriteLink.dataset.openUser;
      input.value = username;
      await loadUserProfile(username);
    }
  });
}

async function loadUserProfile(username) {
  const cleanName = username.trim();

  if (!cleanName) {
    showMessage("Please enter a username.", true);
    return;
  }

  setLoadingState();

  try {
    const user = await fetchJson(`https://api.github.com/users/${cleanName}`);

    const repos = await fetchJson(user.repos_url + "?per_page=100");
    const sortedRepos = repos
      .filter((repo) => !repo.private)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    state.user = user;
    state.repos = sortedRepos;
    state.activeFilter = "updated";

    addToHistory(cleanName);
    renderHistory();

    renderProfile(user, sortedRepos);
  } catch (error) {
    results.innerHTML = `
      <div class="notice error">
        No GitHub user found for "${cleanName}".
      </div>
    `;
  }
}

function setLoadingState() {
  results.innerHTML = `
    <div class="loading-box">
      <div class="loading-line long"></div>
      <div class="loading-line medium"></div>
      <div class="loading-line short"></div>
      <div class="loading-line long"></div>
      <div class="loading-line medium"></div>
    </div>
  `;
}

function renderProfile(user, repos) {
  const favoriteUsers = getFavorites();
  const isFavorite = favoriteUsers.includes(user.login.toLowerCase());

  const languageSummary = buildLanguageSummary(repos);

  const profileMarkup = `
    <div class="profile-header">
      <div class="profile-top">
        <img
          src="${user.avatar_url}"
          alt="${user.login}'s avatar"
          class="profile-avatar"
        />

        <div>
          <h2 class="profile-name">${user.name || user.login}</h2>
          <p class="profile-handle">@${user.login}</p>
        </div>

        <div class="profile-actions">
          <button type="button" class="profile-action-btn ${isFavorite ? "primary" : ""}" data-toggle-favorite="${user.login}">
            ${isFavorite ? "★ Saved" : "☆ Save"}
          </button>
          <a class="profile-action-btn" href="${user.html_url}" target="_blank" rel="noreferrer">
            View GitHub
          </a>
        </div>
      </div>

      <p class="profile-bio">
        ${user.bio || "No bio available"}
      </p>

      <div class="profile-meta">
        ${
          user.location
            ? `<span class="meta-pill">📍 ${user.location}</span>`
            : ""
        }
        ${
          user.company
            ? `<span class="meta-pill">🏢 ${user.company}</span>`
            : ""
        }
        ${
          user.blog
            ? `<span class="meta-pill">🔗 <a href="${normalizeUrl(user.blog)}" target="_blank" rel="noreferrer">${user.blog}</a></span>`
            : ""
        }
        <span class="meta-pill">📅 Joined ${formatDate(user.created_at)}</span>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-number">${formatNumber(user.public_repos)}</span>
          <span class="stat-label">Repos</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">${formatNumber(user.followers)}</span>
          <span class="stat-label">Followers</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">${formatNumber(user.following)}</span>
          <span class="stat-label">Following</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">${formatNumber(user.public_gists || 0)}</span>
          <span class="stat-label">Gists</span>
        </div>
      </div>

      <div class="lang-summary">
        <h3>Top languages</h3>
        <div class="lang-list">
          ${
            languageSummary.length
              ? languageSummary
                  .map(
                    (item) => `
                      <span class="lang-badge">
                        <span class="lang-dot" style="color: ${item.color || "#58a6ff"}; background: ${item.color || "#58a6ff"};"></span>
                        ${item.name} (${item.count})
                      </span>
                    `
                  )
                  .join("")
              : '<span class="empty-state-text">No language data available</span>'
          }
        </div>
      </div>

      <div class="repo-section">
        <div class="repo-header">
          <h3>Repositories</h3>

          <div class="filter-group">
            <button type="button" class="filter-btn active" data-filter="updated">Recent</button>
            <button type="button" class="filter-btn" data-filter="stars">Stars</button>
            <button type="button" class="filter-btn" data-filter="forks">Forks</button>
          </div>
        </div>

        <div id="repo-list" class="repo-list">
          ${renderRepos(repos, state.activeFilter)}
        </div>
      </div>
    </div>
  `;

  results.innerHTML = profileMarkup;

  const saveToggle = document.querySelector("[data-toggle-favorite]");
  if (saveToggle) {
    saveToggle.addEventListener("click", () => {
      toggleFavorite(user.login);
    });
  }

  const filterButtons = document.querySelectorAll(".filter-btn");
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.activeFilter = button.dataset.filter;
      document.querySelectorAll(".filter-btn").forEach((btn) => {
        btn.classList.toggle("active", btn === button);
      });
      document.getElementById("repo-list").innerHTML = renderRepos(repos, state.activeFilter);
    });
  });
}

function renderRepos(repos, filter) {
  const filteredRepos = [...repos].sort((a, b) => {
    if (filter === "stars") return b.stargazers_count - a.stargazers_count;
    if (filter === "forks") return b.forks_count - a.forks_count;
    return new Date(b.updated_at) - new Date(a.updated_at);
  });

  if (!filteredRepos.length) {
    return '<div class="empty-state-text">No public repositories found.</div>';
  }

  return filteredRepos
    .map((repo) => {
      const languageColor = getLanguageColor(repo.language);
      return `
        <article class="repo-card">
          <div class="repo-top">
            <a href="${repo.html_url}" target="_blank" rel="noreferrer" class="repo-name">
              ${repo.name}
            </a>
            <span class="repo-tag">
              <span class="repo-dot" style="color:${languageColor}; background:${languageColor};"></span>
              ${repo.language || "Unknown"}
            </span>
          </div>

          <p class="repo-description">
            ${repo.description || "No description available."}
          </p>

          <div class="repo-meta">
            <span>⭐ ${formatNumber(repo.stargazers_count)}</span>
            <span>🍴 ${formatNumber(repo.forks_count)}</span>
            <span>Updated ${formatRelativeDate(repo.updated_at)}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function buildLanguageSummary(repos) {
  const counts = {};

  repos.forEach((repo) => {
    if (!repo.language) return;
    counts[repo.language] = (counts[repo.language] || 0) + 1;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({
      name,
      count,
      color: getLanguageColor(name),
    }));
}

function getLanguageColor(language) {
  const colors = {
    JavaScript: "#f1e05a",
    TypeScript: "#3178c6",
    Python: "#3572A5",
    Java: "#b07219",
    CSS: "#563d7c",
    HTML: "#e34c26",
    C: "#555555",
    "C++": "#f34b7d",
    "C#": "#178600",
    Go: "#00ADD8",
    Rust: "#dea584",
    PHP: "#4F5D95",
    Ruby: "#701516",
    Swift: "#ffac45",
    Kotlin: "#A97BFF",
    Vue: "#41b883",
    React: "#61dafb",
    Shell: "#89e051",
    Dockerfile: "#384d54",
  };

  return colors[language] || "#58a6ff";
}

function addToHistory(username) {
  const cleaned = username.trim().toLowerCase();
  if (!cleaned) return;

  const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || "[]");
  const filtered = current.filter((item) => item.toLowerCase() !== cleaned);
  filtered.unshift(cleaned);
  const limited = filtered.slice(0, 6);
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(limited));
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || "[]");

  if (!history.length) {
    historyList.innerHTML = '<span class="empty-state-text">No recent searches yet</span>';
    return;
  }

  historyList.innerHTML = history
    .map(
      (user) =>
        `<button type="button" class="history-chip" data-history-user="${user}">${user}</button>`
    )
    .join("");
}

function toggleFavorite(username) {
  const list = getFavorites();
  const normalized = username.trim().toLowerCase();

  if (list.includes(normalized)) {
    removeFavorite(normalized);
    return;
  }

  const updated = [normalized, ...list.filter((user) => user !== normalized)].slice(0, 10);
  localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(updated));
  renderFavorites();

  const favoriteButton = document.querySelector("[data-toggle-favorite]");
  if (favoriteButton) {
    favoriteButton.classList.add("primary");
    favoriteButton.textContent = "★ Saved";
  }
}

function removeFavorite(username) {
  const normalized = username.trim().toLowerCase();
  const filtered = getFavorites().filter((user) => user !== normalized);
  localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(filtered));
  renderFavorites();

  const favoriteButton = document.querySelector("[data-toggle-favorite]");
  if (favoriteButton && favoriteButton.dataset.toggleFavorite.toLowerCase() === normalized) {
    favoriteButton.classList.remove("primary");
    favoriteButton.textContent = "☆ Save";
  }
}

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.favorites) || "[]");
  } catch {
    return [];
  }
}

function renderFavorites() {
  const favorites = getFavorites();

  if (!favorites.length) {
    favoritesList.innerHTML = '<span class="empty-state-text">Save profiles you like</span>';
    return;
  }

  favoritesList.innerHTML = favorites
    .map(
      (user) => `
        <div class="favorite-item">
          <a href="#" data-open-user="${user}">${user}</a>
          <button type="button" data-favorite-user="${user}" aria-label="Remove ${user}">Remove</button>
        </div>
      `
    )
    .join("");
}

function renderSuggestions() {
  suggestions.innerHTML = quickUsers
    .map(
      (user) => `
        <button type="button" class="suggestion-chip" data-username="${user}">
          ${user}
        </button>
      `
    )
    .join("");
}

function showMessage(message, isError = false) {
  results.innerHTML = `
    <div class="notice ${isError ? "error" : ""}">${message}</div>
  `;
}

function normalizeUrl(url) {
  if (!url) return "#";
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelativeDate(dateString) {
  const now = new Date();
  const updated = new Date(dateString);
  const diffDays = Math.max(1, Math.round((now - updated) / (1000 * 60 * 60 * 24)));

  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 365) return `${Math.round(diffDays / 30)}mo ago`;
  return `${Math.round(diffDays / 365)}y ago`;
}

function formatNumber(value) {
  if (value == null) return "0";
  return new Intl.NumberFormat("en-US").format(value);
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    throw new Error("GitHub fetch failed");
  }

  return response.json();
}

function applySavedTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.theme);

  if (saved === "light") {
    document.body.classList.add("light-theme");
    themeToggle.textContent = "☀️";
  } else {
    document.body.classList.remove("light-theme");
    themeToggle.textContent = "🌙";
  }
}
