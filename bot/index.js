const puppeteer = require('puppeteer');
const fs = require('fs');
require('dotenv').config();
const authToken = process.env.AUTH_TOKEN;

// Scraper setup
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// How many pixels are scrolled each iteration
const scrollStep = 400; 
// Change to your group chat URL on Warpcast
const groupChatUrl = "https://warpcast.com/~/inbox/bc84590080c7c1a230c8b931bc9bac5cd828e89b919eb099f7997151f1cebfa8";
// How long the scraper scrolls back for (5000ms is about 75 messages, depending on length)
const maxDuration = 5000; 
// Change to your preferred browser path
const browserPath = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';

// Scraper function

(async () => {
    if (!authToken) {
        console.log('Failed to retrieve auth token');
        return;
    }

    const browser = await puppeteer.launch({
        executablePath: browserPath,
        headless: false,
    });

    const browserVersion = await browser.version();
    console.log(`Started ${browserVersion}`);
    const page = await browser.newPage();
    
    await page.setExtraHTTPHeaders({
        'Authorization': `Bearer ${authToken}`
    });

    await page.goto('https://warpcast.com/', { waitUntil: 'networkidle2' });

    await page.waitForFunction('document.querySelector("body").innerText.includes("Home")');

    await page.goto(groupChatUrl, { waitUntil: 'networkidle2' });

    let selector = '.scrollbar-vert.mt-0\\.5.h-full.w-full.overflow-auto.scroll-auto.will-change-transform';

    let messages = [];

    const startTime = Date.now();
    let scrollCounter = 0;
    try {
        while (Date.now() - startTime < maxDuration) {
            
            let scrolledToEnd = await page.evaluate((selector, scrollStep) => {
                const scrollableContainer = document.querySelector(selector);
                let currentScrollTop = scrollableContainer.scrollTop;
                scrollableContainer.scrollTop += scrollStep;
                
                if (currentScrollTop === scrollableContainer.scrollTop) {
                    scrollCounter++;
                }
                return currentScrollTop === scrollableContainer.scrollTop;
            }, selector, scrollStep);
        
            scrollCounter++;

            await wait(200);

            if (scrolledToEnd) {
                console.log('Scrolled to top of chat');
                break;
            }
        }
    } catch (error) {
        console.error('Error during scrolling and extraction:', error);
    }

    // message extraction
    const uniqueMessages = new Set();

try {
    while (scrollCounter > 0) {
        let scrolledToEnd = await page.evaluate((selector, scrollStep) => {
            const scrollableContainer = document.querySelector(selector);
            let currentScrollTop = scrollableContainer.scrollTop;
            scrollableContainer.scrollTop -= scrollStep; // Adjust scroll direction if needed
            return currentScrollTop === scrollableContainer.scrollTop;
        }, selector, scrollStep);

        scrollCounter--;

        await wait(200);  // Ensuring pause for loading

        const rawMessages = await page.evaluate((selector) => {
            const nodes = Array.from(document.querySelectorAll(selector + ' > div > div'));
            return nodes.map(node => ({
                dataIndex: node.getAttribute('data-index'),
                content: node.innerText
            }));
        }, selector);

        // Filter and add only new messages
        rawMessages.forEach(msg => {
            if (!uniqueMessages.has(msg.dataIndex)) {
                messages.push(msg);
                uniqueMessages.add(msg.dataIndex);
            }
        });

        if (scrolledToEnd) {
            console.log('Scrolled to end or start of chat');
            break;
        }
    }
    } catch (error) {
        console.error('Error during scrolling and extraction:', error);
    }

    console.log(`Extracted ${messages.length} messages`);

    // Order messages by dataIndex

    function orderMessages(messages) {
        return messages.sort((a, b) => a.dataIndex - b.dataIndex);
    };
    const orderedMessages = orderMessages(messages);

    // Create a text file and save the message data
    // Change to your own destination
    fs.writeFile('messageData.txt', JSON.stringify(orderedMessages), (err) => {
        if (err) {
            console.error('Error writing message data:', err);
        } else {
            console.log('Message data saved successfully');
        }
    });
    

    await browser.close();
})();

