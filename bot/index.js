const puppeteer = require('puppeteer');
require('dotenv').config();
const authToken = process.env.AUTH_TOKEN;
console.log(authToken);

// Scraper setup
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const scrollStep = 400;

// Cleaning message data
class Message {
    constructor(sender, content, timestamp, reactions) {
        this.sender = sender;
        this.content = content;
        this.timestamp = timestamp;
        this.reactions = reactions;
    }
}

class Conversation {
    constructor(messages) {
        this.messages = messages;
    }

    addMessage(message) {
        this.messages.push(message);
    }
}

function parseContent(rawMessage) {
    // Split the raw message content into lines
    const lines = rawMessage.split('\n');
    // Example simplistic parsing:
    const timestamp = lines.pop();  // Assuming the last line is the timestamp
    const sender = lines.shift();  // Assuming the first line is the sender
    const content = lines.join('\n');  // The rest is content
    return new Message(sender, content, timestamp, {});
}

// Scraper function

(async () => {
    if (!authToken) {
        console.log('Failed to retrieve auth token');
        return;
    }

    const browser = await puppeteer.launch({
        executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
        headless: false,
    });

    // const browser = await puppeteer.launch({ headless: false });
    const browserVersion = await browser.version();
    console.log(`Started ${browserVersion}`);
    const page = await browser.newPage();
    
    // Use the token to perform authenticated actions
    await page.setExtraHTTPHeaders({
        'Authorization': `Bearer ${authToken}`
    });

    await page.goto('https://warpcast.com/', { waitUntil: 'networkidle2' });

    console.log('Before waitForFunction');
    await page.waitForFunction('document.querySelector("body").innerText.includes("Home")');
    console.log('After waitForFunction');

    await page.goto('https://warpcast.com/~/inbox/bc84590080c7c1a230c8b931bc9bac5cd828e89b919eb099f7997151f1cebfa8', { waitUntil: 'networkidle2' });

    let selector = '.scrollbar-vert.mt-0\\.5.h-full.w-full.overflow-auto.scroll-auto.will-change-transform';

    let lastHeight = await page.evaluate((selector) => {
        const scrollableContainer = document.querySelector(selector);
        return scrollableContainer.scrollHeight;
    }, selector);

    let messages = [];

    const startTime = Date.now();
    const maxDuration = 5000;

    try {
        while (Date.now() - startTime < maxDuration) {
            let scrolledToEnd = await page.evaluate((selector, scrollStep) => {
                const scrollableContainer = document.querySelector(selector);
                let currentScrollTop = scrollableContainer.scrollTop;
                scrollableContainer.scrollTop += scrollStep;
                return currentScrollTop === scrollableContainer.scrollTop;
            }, selector, scrollStep);

            await wait(1000);

            // Extract messages
            const newMessages = await page.evaluate((selector) => {
                const nodes = Array.from(document.querySelectorAll(selector + ' > div')); // Adjust if the structure inside has different organization
                return nodes.map(node => ({
                    dataIndex: node.getAttribute('data-index'),
                    content: node.innerText
                }));
            }, selector);

            messages = [...newMessages, ...messages];

            if (scrolledToEnd) {
                break;
            }
        }
    } catch (error) {
        console.error('Error during scrolling and extraction:', error);
    }

    console.log('Messages:', messages);
    console.log('Raw data collected. Starting to clean.');
    
    function cleanAndStructureData(rawMessages) {
        const structuredMessages = rawMessages.map(rawMessage => {
            const lines = rawMessage.split('\n');
            const timestamp = lines.find(line => /\d{1,2}:\d{2} (AM|PM)/.test(line));
            const contentIndex = lines.indexOf(timestamp);
            const sender = lines[0];
            const content = lines.slice(1, contentIndex).join('\n').trim();
            // Extract reactions if present
            let reactions = {};
            lines.slice(contentIndex + 1).forEach(line => {
                const match = line.match(/([\p{Emoji_Presentation}\p{Extended_Pictographic}]+)\s(\d+)/u);
                if (match) {
                    reactions[match[1]] = parseInt(match[2], 10);
                }
            });
            return { sender, content, timestamp, reactions };
        });
        return structuredMessages;
    }
    
    const structuredData = cleanAndStructureData(messages);
    // console.log(`Cleaned data:`, structuredData);
    

    await browser.close();
})();

