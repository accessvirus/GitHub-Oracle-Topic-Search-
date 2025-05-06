console.log("--- script.js loaded ---"); // Add this line
// State for pagination
let currentPage = 1;
const perPage = 15; // Number of results per page

/* --------------------------------- Step 1: Handling Input --------------------------------- */
// Function to get the topics entered by the user.
function getSearchQuery() {
    const input = document.getElementById('topics-input').value;
    return input.split(',')
                .map(topic => topic.trim())   // Trim extra spaces
                .filter(Boolean);             // Remove empty strings
}

/* --------------------------------- Step 2: Fetching GitHub Repos --------------------------------- */
// Function to fetch GitHub repositories based on the search query (topics).
async function fetchGitHubRepos(query, page = 1) {
    const url = `https://api.github.com/search/repositories?q=${query}+in:topics&per_page=${perPage}&page=${page}`;
    document.getElementById('loading-message').style.display = 'block'; // Show loading
    document.getElementById('results-container').innerHTML = ''; // Clear previous results
    document.getElementById('pagination-controls').classList.add('d-none'); // Hide pagination
    document.getElementById('collected-topics-container').innerHTML = ''; // Clear collected topics

    try {
        const response = await fetch(url);
        // Check for rate limiting specifically
        if (response.status === 403) {
            // Future enhancement: Try to parse X-RateLimit-Reset header here
            // const resetTime = response.headers.get('X-RateLimit-Reset');
            // if (resetTime) {
            //     const resetDate = new Date(parseInt(resetTime, 10) * 1000);
            //     throw new Error(`GitHub API rate limit exceeded. Try again after ${resetDate.toLocaleTimeString()}.`);
            // } else {
            //     throw new Error('GitHub API rate limit exceeded. Please wait and try again.');
            // }
            throw new Error('GitHub API rate limit exceeded. Please wait and try again.');
        }
        if (!response.ok) throw new Error(`Failed to fetch data from GitHub (Status: ${response.status})`);
        const data = await response.json();
        return data; // Return the full data object (includes total_count)
    } catch (error) {
        handleError(error);
        return null; // Return null or an empty object on error to prevent issues downstream
    }
}

/* --------------------------------- Step 3: Handling Errors --------------------------------- */
// Function to handle errors and display an error message.
function handleError(error) {
    console.error("Search Error:", error); // Log the full error for debugging
    const container = document.getElementById('results-container');
    container.innerHTML = `<div class="alert alert-danger" role="alert">
        Error: ${error.message}
    </div>`;
    document.getElementById('loading-message').style.display = 'none'; // Hide loading on error
    document.getElementById('pagination-controls').classList.add('d-none'); // Hide pagination on error
    document.getElementById('collected-topics-container').innerHTML = ''; // Clear collected topics on error
}

/* --------------------------------- Step 4: Displaying Results --------------------------------- */
// Function to display the list of repositories returned by the GitHub API.
function displayResults(data) {
    const container = document.getElementById('results-container');
    const repos = data.items || [];
    container.innerHTML = ''; // Clear any previous results or error messages

    if (repos.length === 0) {
        container.innerHTML = '<p>No repositories found matching your topics.</p>';
        document.getElementById('pagination-controls').classList.add('d-none'); // Hide pagination
        return;
    }

    repos.forEach(repo => {
        const repoCard = createRepoCard(repo);  // Generate card for each repo
        container.appendChild(repoCard);        // Append the card to the results container
    });

    // --- Collect and display unique topics ---
    collectAndDisplayUniqueTopics(repos);
}

// --- Helper Function to Collect and Display Unique Topics ---
function collectAndDisplayUniqueTopics(repos) {
    const allTopics = repos.flatMap(repo => repo.topics || []); // Get all topics, flatten array
    const uniqueTopics = [...new Set(allTopics)].sort(); // Get unique topics and sort alphabetically
    displayCollectedTopics(uniqueTopics);
}

// --- Helper Function to Render Collected Topics Above Search ---
function displayCollectedTopics(topics) {
    const container = document.getElementById('collected-topics-container');
    container.innerHTML = ''; // Clear previous

    if (topics.length > 0) {
        const heading = document.createElement('p');
        heading.innerHTML = '<small class="text-muted">Related Topics:</small>';
        container.appendChild(heading);

        topics.forEach(topic => {
            const badgeLink = document.createElement('a');
            badgeLink.href = '#'; // Prevent page jump
            badgeLink.classList.add('badge', 'bg-secondary', 'me-1', 'mb-1', 'text-decoration-none'); // Style as badge/link
            badgeLink.dataset.topic = topic; // Store topic in data attribute for click handler
            badgeLink.textContent = topic;
            container.appendChild(badgeLink);
        });
    }
}

/* --------------------------------- Step 4.5: Handling Pagination Display --------------------------------- */
function displayPagination(totalCount, query) {
    const paginationContainer = document.getElementById('pagination-controls');
    paginationContainer.innerHTML = ''; // Clear previous controls
    // GitHub API limits results to the first 1000 for unauthenticated requests
    const maxResults = 1000;
    const displayableTotalCount = Math.min(totalCount, maxResults);
    const totalPages = Math.ceil(displayableTotalCount / perPage);

    if (totalPages <= 1) {
        paginationContainer.classList.add('d-none'); // Hide if only one page or less
        return;
    }

    paginationContainer.classList.remove('d-none'); // Show pagination controls

    const paginationList = document.createElement('ul');
    paginationList.classList.add('pagination', 'justify-content-center');

    // Previous Button
    const prevLi = document.createElement('li');
    prevLi.classList.add('page-item'); // Add base class
    if (currentPage === 1) { // Conditionally add disabled class
        prevLi.classList.add('disabled');
    }
    prevLi.innerHTML = `<button class="page-link" ${currentPage === 1 ? 'tabindex="-1" aria-disabled="true"' : ''} data-page="${currentPage - 1}" data-query="${query}">Previous</button>`;
    paginationList.appendChild(prevLi);

    // Current Page Info (Simple version)
    const currentLi = document.createElement('li');
    currentLi.classList.add('page-item', 'disabled');
    currentLi.innerHTML = `<span class="page-link">Page ${currentPage} of ${totalPages} ${totalCount > maxResults ? '(showing first 1000 results)' : ''}</span>`;
    paginationList.appendChild(currentLi);

    // Next Button
    const nextLi = document.createElement('li');
    nextLi.classList.add('page-item'); // Add base class
    if (currentPage >= totalPages) { // Conditionally add disabled class
        nextLi.classList.add('disabled');
    }
    nextLi.innerHTML = `<button class="page-link" ${currentPage >= totalPages ? 'tabindex="-1" aria-disabled="true"' : ''} data-page="${currentPage + 1}" data-query="${query}">Next</button>`;
    paginationList.appendChild(nextLi);

    paginationContainer.appendChild(paginationList);

    // Add event listeners to new buttons
    paginationContainer.querySelectorAll('.page-link[data-page]').forEach(button => {
        button.addEventListener('click', handlePaginationClick);
    });
}

/* --------------------------------- Step 5: Creating Repo Cards --------------------------------- */
// Function to create a Bootstrap card for each repository.
function createRepoCard(repo) {
    const card = document.createElement('div');
    card.classList.add('col'); // Use Bootstrap column for grid layout
    card.innerHTML = `
        <div class="card h-100 repo-card">
            <div class="card-body d-flex flex-column">
                <h5 class="card-title">
                    <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="repo-title">${repo.name}</a>
                </h5>
                <p class="repo-description card-text">${repo.description || 'No description available'}</p>
                <div class="mt-auto"> <!-- Push details to bottom -->
                    <p class="repo-stats card-text"><small class="text-muted">Stars: ${repo.stargazers_count} | Forks: ${repo.forks_count}</small></p>
                    <p class="repo-language card-text"><small class="text-muted">Language: ${repo.language || 'N/A'}</small></p>
                    <p class="repo-last-updated card-text"><small class="text-muted">Last Updated: ${new Date(repo.updated_at).toLocaleDateString()}</small></p>
                    <p class="repo-owner card-text">
                        <small class="text-muted">Owner: <a href="${repo.owner.html_url}" target="_blank" rel="noopener noreferrer">${repo.owner.login}</a></small>
                    </p>
                    <div class="repo-topics mt-2">
                        ${repo.topics && repo.topics.length > 0
                            ? '<small class="text-muted">Topics: ' + repo.topics.map(topic => `<a href="#" class="badge bg-info text-dark me-1 topic-link-badge" data-topic="${topic}">${topic}</a>`).join(' ') + '</small>'
                            : '<small class="text-muted">Topics: None listed</small>'
                        }
                    </div>
                </div>
            </div>
        </div>`;
    return card;
}

/* --------------------------------- Step 5.5: Handling Pagination Clicks --------------------------------- */
async function handlePaginationClick(event) {
    event.preventDefault();
    const button = event.target;
    const targetPage = parseInt(button.getAttribute('data-page'), 10);
    const query = button.getAttribute('data-query');

    // Ensure targetPage is valid before proceeding
    if (!isNaN(targetPage) && targetPage > 0 && query) {
        currentPage = targetPage;
        const data = await fetchGitHubRepos(query, currentPage);
        if (data && data.items) {
            displayResults(data);
            displayPagination(data.total_count, query); // Update pagination display
            // Scroll to top of results for better UX on page change
            document.getElementById('results-container').scrollIntoView({ behavior: 'smooth' });
        }
        document.getElementById('loading-message').style.display = 'none'; // Hide loading
    } else {
        console.warn("Pagination click ignored: Invalid target page or query.");
    }
}

// --- Helper function to trigger search ---
// Accepts an optional array of topics to search for directly
async function performSearch(topicsArray = null) {
    // Use provided topics array or get from input if null
    const topics = topicsArray || getSearchQuery();

    if (topics.length === 0) {
        handleError(new Error('Please enter at least one valid topic.'));
        return;
    }

    const query = topics.map(topic => `topic:${topic}`).join(' ');
    currentPage = 1; // Reset to first page for new search
    const data = await fetchGitHubRepos(query, currentPage);
    if (data) { // Check if data is not null (fetch might return null on error)
        displayResults(data);
        displayPagination(data.total_count, query);
    }
    document.getElementById('loading-message').style.display = 'none';
}

/* --------------------------------- Step 6: Triggering the Search --------------------------------- */
// --- Function to handle clicks on topic badges ---
function handleTopicClick(event) {
    // Check if the clicked element or its parent has a data-topic attribute
    const topicBadge = event.target.closest('[data-topic]');
    if (topicBadge) {
        // Log which container the click came from (optional, for debugging)
        // console.log(`Topic click detected in ${event.currentTarget.id}. Target:`, event.target);
        console.log("Topic badge found:", topicBadge); // Log if a badge was found
        event.preventDefault(); // Prevent default anchor tag behavior
        const topic = topicBadge.dataset.topic; // Get topic from data attribute
        if (topic) {
            // Update the input field to show the clicked topic
            console.log("Topic extracted:", topic); // Log the topic found
            document.getElementById('topics-input').value = topic;
            // Perform search with just this topic
            performSearch([topic]);
        }
    }
}

// Add event listeners once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded. Adding event listeners."); // Confirm listeners are being added
    // Event listener for the search button.
    document.getElementById('search-button').addEventListener('click', performSearch);

    // Event listener for the Enter key in the input field.
    document.getElementById('topics-input').addEventListener('keypress', event => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent default form submission (if it were in a form)
            performSearch();
        }
    });

    // Event listener for clicks within the results container (for topic badges - Event Delegation)
    document.getElementById('results-container').addEventListener('click', handleTopicClick);

    // Event listener for clicks within the collected topics container (Event Delegation)
    document.getElementById('collected-topics-container').addEventListener('click', handleTopicClick);
    console.log("Click listeners added."); // Updated log message
});