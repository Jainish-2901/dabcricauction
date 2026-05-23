const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');

puppeteer.use(StealthPlugin());

// A utility to attempt extracting basic info from a CricHeroes profile using Puppeteer
const scrapeCricHeroesProfile = async (url) => {
    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: 'new', // Use new headless mode
            args: ['--no-sandbox', '--disable-setuid-sandbox'] // Required for some environments
        });

        const page = await browser.newPage();

        // Set a realistic User Agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        // Go to URL and wait for content to load
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Handle Cloudflare "Just a moment..." challenge by waiting a bit more or waiting for a specific element
        const title = await page.title();
        console.log("Initial Page Title:", title);

        if (title.includes("Just a moment") || title.includes("Cloudflare")) {
            console.log("Cloudflare challenge detected. Waiting for redirect...");
            try {
                // Wait for the h1 element which indicates the profile page is loaded
                await page.waitForSelector('h1', { timeout: 20000 });
                const newTitle = await page.title();
                console.log("Redirected. New Page Title:", newTitle);
                if (newTitle.includes("Just a moment") || newTitle.includes("Cloudflare")) {
                    throw new Error("Cloudflare protection active");
                }
            } catch (e) {
                console.log("Timeout waiting for redirect or check failed.");
                throw new Error("Unable to bypass CricHeroes security check. Please add player manually.");
            }
        }

        // Retrieve the HTML content
        const content = await page.content();

        // Use Cheerio to parse the HTML (it's faster/easier than Puppeteer selectors for bulk extraction)
        const $ = cheerio.load(content);

        // --- Scraping Logic (Same as before but on the rendered HTML) ---

        // Attempt to get Name
        let name = $('h1').first().text().trim() || $('meta[property="og:title"]').attr('content');
        if (name) {
            // Sometimes title includes "Profile | ..."
            name = name.split('|')[0].trim();
        }

        // Cleanup name: Remove extra newlines or spaces often found in scraped text
        if (name) name = name.replace(/\s+/g, ' ').trim();

        // Attempt to get Image
        let image = $('img.profile-img').attr('src') || $('meta[property="og:image"]').attr('content');
        // If image is relative, might need to prepend base URL (usually CricHeroes images are absolute though)

        // Attempt to decipher Role
        const bodyText = $('body').text();
        let category = "All-Rounder";
        if (bodyText.includes("Batsman") && !bodyText.includes("Bowler")) category = "Batsman";
        if (!bodyText.includes("Batsman") && bodyText.includes("Bowler")) category = "Bowler";
        if (bodyText.includes("Wicket Keeper")) category = "Wicket Keeper";

        // Attempt to parse stats
        const stats = {
            matches: 0,
            runs: 0,
            wickets: 0,
            battingAverage: 0,
            bowlingAverage: 0
        };

        return {
            name: name || "Unknown Player",
            image: image || "",
            category,
            stats
        };

    } catch (error) {
        console.error("Scraping Error:", error.message);
        throw new Error("Failed to fetch CricHeroes profile: " + error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

module.exports = { scrapeCricHeroesProfile };
