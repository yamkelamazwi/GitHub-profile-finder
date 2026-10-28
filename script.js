const form = document.querySelector("form");
const input = document.querySelector("input");
const results = document.querySelector("#results");
const clearButton = document.querySelector("#clear-btn");

clearButton.addEventListener("click", () => {
  input.value = "";
  results.innerHTML = "";
  input.focus();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = input.value.trim();

  if (!username) {
    results.textContent = "Please enter a username";
    return;
  }

  results.textContent = "Loading...";

  const response = await fetch(
    `https://api.github.com/users/${username}`
  );

  if (!response.ok) {
    results.textContent = `No GitHub user found for "${username}"`;
    return;
  }

  const data = await response.json();

  const reposResponse = await fetch(data.repos_url);
  const repos = await reposResponse.json();

  const repoList = repos
    .sort(
      (a, b) =>
        new Date(b.updated_at) - new Date(a.updated_at)
    )
    .slice(0, 5)
    .map(
      (repo) => `
        <li>
          <a href="${repo.html_url}" target="_blank">
            ${repo.name}
          </a>
        </li>
      `
    )
    .join("");

  results.innerHTML = `
    <img
      src="${data.avatar_url}"
      alt="${data.login}'s profile picture"
      width="150"
    >

    <h2>${data.name || data.login}</h2>

    <p class="username">
      @${data.login}
    </p>

    <p>
      ${data.bio || "No bio available"}
    </p>

    <p>
      📍 ${data.location || "Location not provided"}
    </p>

    <p>
      Joined:
      ${new Date(data.created_at).toLocaleDateString()}
    </p>

    <div class="stats">
      <div class="stat-card">
        <span class="stat-number">
          ${data.followers}
        </span>
        <span class="stat-label">
          Followers
        </span>
      </div>

      <div class="stat-card">
        <span class="stat-number">
          ${data.following}
        </span>
        <span class="stat-label">
          Following
        </span>
      </div>

      <div class="stat-card">
        <span class="stat-number">
          ${data.public_repos}
        </span>
        <span class="stat-label">
          Repositories
        </span>
      </div>
    </div>

    <p>
      <a
        href="${data.html_url}"
        target="_blank"
      >
        View GitHub Profile
      </a>
    </p>

    <h3>Latest Repositories</h3>

    <ul>
      ${repoList || "<li>No repositories found</li>"}
    </ul>
  `;

  input.value = "";
});
