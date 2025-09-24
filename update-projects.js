const https = require('https');
const fs = require('fs');
const path = require('path');

const username = 'FredMunene';
const apiUrl = `https://api.github.com/users/${username}/repos?sort=updated&per_page=100`;

function fetchRepos() {
    return new Promise((resolve, reject) => {
        https.get(apiUrl, {
            headers: {
                'User-Agent': 'Node.js'
            }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const repos = JSON.parse(data);
                    resolve(repos);
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

async function updateProjects() {
    try {
        console.log('Fetching repositories from GitHub...');
        const repos = await fetchRepos();

        const projectsData = {
            lastUpdated: new Date().toISOString(),
            repos: repos.map(repo => ({
                name: repo.name,
                html_url: repo.html_url,
                homepage: repo.homepage,
                topics: repo.topics || [],
                description: repo.description,
                updated_at: repo.updated_at
            }))
        };

        const filePath = path.join(__dirname, 'static', 'projects.json');
        fs.writeFileSync(filePath, JSON.stringify(projectsData, null, 2));
        console.log(`Projects data updated successfully at ${filePath}`);
        console.log(`Total repos: ${repos.length}`);
    } catch (error) {
        console.error('Error updating projects:', error.message);
        process.exit(1);
    }
}

updateProjects();