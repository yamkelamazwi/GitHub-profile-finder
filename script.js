const form = document.querySelector("form");
const input = document.querySelector("input");
const results = document.querySelector("#results");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = input.value.trim();

  if (!username) {
  results.textContent = "Please enter a username";
  return;
}

  results.textContent = "Loading...";

  const response = await fetch(`https://api.github.com/users/${username}`);

  if (!response.ok) {
  results.textContent = `No GitHub user found for "${username}"`;
  return;
}

  const data = await response.json();

  results.innerHTML = `
  <p>Results for: <strong>${username}</strong></p>

  <img
    src="${data.avatar_url}"
    alt="${data.login}'s profile picture"
    width="150"
  >

  <h2>${data.name || data.login}</h2>
  <p>@${data.login}</p>
  <p>${data.bio || "No bio available"}</p>

  <p>📍 ${data.location || "Location not provided"}</p>

  <ul>
    <li>Followers: ${data.followers}</li>
    <li>Following: ${data.following}</li>
    <li>Public Repositories: ${data.public_repos}</li>
  </ul>

  <a href="${data.html_url}" target="_blank">
    View GitHub Profile
  </a>
`;

  input.value = "";

});
