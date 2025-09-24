# Personal Portfolio

A portfolio website built to showcase my skills, projects, blogs, and more.

## Features

+ Responsive Design: The website is fully responsive and adjusts seamlessly to different screen sizes, providing an optimal viewing experience.
+ Portfolio Section: Showcases my projects, including links to live demos and GitHub repositories.
+ Resume Section: Highlights my professional background, skills, and education.
+ Blog Section: Displays a collection of my blog posts.
+ Contact Form: Allows visitors to send me messages directly from the website.
+ Social Links: Links to my social media profiles like GitHub, LinkedIn, etc.

## Installation
1. Clone the repository:
    ```bash
    git clone https://github.com/FredMunene/FredMunene.github.io.git
    cd FredMunene.github.io
    ```
2.  Install dependencies
    ```bash
    npm install
    ```
3. Set environment variables in the file `.env` for `Email` and `App Password` . I used [Google App passwords](https://myaccount.google.com/apppasswords). Read about it [here](https://knowledge.workspace.google.com/kb/how-to-create-app-passwords-000009237).
   
    Example `.env` file:
    ```plaintext
    EMAIL_USER=your-email@example.com
    EMAIL_PASS=your-app-password
    ```

5. Run the app.
    ```bash
    npm start
    ```
Access website at [http:\\localhost:3000](http:\\localhost:3000)

## Updating Projects Data

The portfolio loads GitHub repository data from a cached JSON file to avoid API rate limits and ensure compatibility with static hosting. To keep the project data fresh, you have two options:

### Option 1: Manual Updates (Default)
1. Run the update script weekly:
   ```bash
   node update-projects.js
   ```
2. This will fetch the latest repositories from GitHub and update `static/projects.json`
3. Commit and push the changes to deploy the updated data

### Option 2: Automated Updates (GitHub Actions)
The repository includes a GitHub Actions workflow that automatically updates the projects data weekly:

- **Schedule**: Every Monday at 00:00 UTC
- **Trigger**: Also supports manual runs via GitHub's Actions tab
- **Process**: Fetches fresh data, commits changes, and deploys automatically

**To enable automated updates:**
1. Ensure the workflow file `.github/workflows/update-projects.yml` is committed
2. GitHub Actions will run automatically on the schedule
3. No manual intervention required

The script automatically includes a timestamp to track when data was last updated.

## Contact

For any inquiries, feel free to reach out via email at [mfredgitonga@gmail.com](mailto:mfredgitonga@gmail.com).

## License

This project is licensed under the MIT License - see the LICENSE file for details.
