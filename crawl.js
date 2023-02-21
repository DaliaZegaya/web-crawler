import fetch from "node-fetch";
import cheerio from "cheerio";
import urlParser from "url";
import fs from "fs";

const visitedUrls = {};

async function crawl(currentPageUrl, currentDepth, maxDepth) {
    if (visitedUrls[currentPageUrl] && currentDepth === maxDepth) return;
    visitedUrls[currentPageUrl] = true;
    const { host, protocol } = urlParser.parse(currentPageUrl);

    let data = { results: [] };
    const sourcePage = await fetch(currentPageUrl);
    const html = await sourcePage.text();
    const $ = cheerio.load(html);
    const currentDepthUrls = $("a")
        .map((i, link) => link.attribs.href)
        .get();

    const images = $("img")
        .map((i, img) => {
            if (img.attribs.src.startsWith('//')) {
                return `${protocol}${img.attribs.src}`
            }
        })
        .get();

    for (let i = 0; i < images.length; i++) {
        data.results.push({
            imageUrl: images[i],
            sourceUrl: currentPageUrl,
            depth: currentDepth,
        });
    }

    const urls = await filterValidUrls(currentDepthUrls, host, protocol);
    for (let i = 0; i < urls.length; i++) {
        if (currentDepth < maxDepth) {
            crawl(urls[i], currentDepth++);
        } else {
            writeDataToFile(data);
            return console.log("crawl end.");
        }
    }
}

const startCrawler = async () => {
    const url = process.argv[2];
    const maxDepth = parseInt(process.argv[3]);
    await crawl(url, 0, maxDepth);
};
startCrawler();

const filterValidUrls = async (links, host, protocol) => {
    return links
        .filter((link) => {
            return (
                link.includes("http") || link.startsWith("/") || link.startsWith("?")
            );
        })
        .map((link) => {
            if (link.startsWith("/")) {
                return `${protocol}//${host}${link}`;
            } else if (link.startsWith("?")) {
                return `${protocol}//${host}${link}`;
            } else return link;
        });
};


const writeDataToFile = (data) => {
    const isFileExist = fs.existsSync("./results.json");
    if (!isFileExist) {
        return fs.appendFile("./results.json", JSON.stringify(data), (err) => {
            if (err) return console.log(err);
        });
    } else {
        fs.writeFile("./results.json", JSON.stringify(data), (err) => {
            if (err) return console.log(err);
        });
    }
};