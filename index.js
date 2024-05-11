const puppeteer = require("puppeteer");
const cheerio = require("cheerio");

async function extractMatchInfo(page) {
  // root link
  const rootLink = "https://www.sportybet.com/ng/m/sport/football/";
  // Get the HTML content of the page
  const html = await page.content();
  // Load the HTML content into Cheerio
  const $ = cheerio.load(html);

  // Extract match info using Cheerio
  const matches = [];
  $('div[data-key^="sr:match:"]').each((index, element) => {
    const $element = $(element);
    const $labelPrematch = $element.find('div[data-op="label-prematch"]');

    if ($labelPrematch.length > 0) {
      // Extract league name
      let leagueName = $labelPrematch.find(".m-league-name").text().trim();
      // Split the league name using hyphen
      const leagueParts = leagueName
        .split("-")
        .map(part => part.trim().replace(/\s+/g, "_"));
      // Join league parts with slash
      leagueName = leagueParts.join("/");

      // Extract team names
      const team1 = $element
        .find(".m-info-cell .team")
        .eq(0)
        .text()
        .trim()
        .replace(/\s+/g, "_");
      const team2 = $element
        .find(".m-info-cell .team")
        .eq(1)
        .text()
        .trim()
        .replace(/\s+/g, "_");
      const teams = `${team1}_vs_${team2}`;

      // Extract data key attribute
      const dataKey = $element.attr("data-key");

      // Check if a match with the same data key already exists
      const existingMatch = matches.find(match => match.dataKey === dataKey);
      if (!existingMatch) {
        matches.push({
          leagueName,
          teams,
          dataKey,
          link: rootLink + leagueName + "/" + teams + "/" + dataKey
        });
      }
    }
  });

  return matches;
}

async function statistics(page) {
    // Wait for the DOM to load
    await page.waitForSelector(".sr-leaguepositionform__wrapper");
    await page.waitForSelector(".sr-procvaltext__component-value.sr-procvaltext__component-value-medium");
  
    // Extract home league position
    const homeLeaguePosition = await page.evaluate(() => {
      const homeElement = document.querySelector(".sr-positionchart__wrapper.srt-base-1-home-1 .sr-positionchart__box-content");
      return homeElement ? homeElement.textContent.trim() : null;
    });
  
    // Extract away league position
    const awayLeaguePosition = await page.evaluate(() => {
      const awayElement = document.querySelector(".sr-positionchart__box-content.srt-away-1");
      return awayElement ? awayElement.textContent.trim() : null;
    });

    // Extract home and away values
  const [homeValueElement, awayValueElement] = await page.$$(
    ".sr-procvaltext__component-value.sr-procvaltext__component-value-medium"
  );

  // Extract home and away form value
  const homeValue = await page.evaluate(homeValueElement => homeValueElement.textContent.trim(), homeValueElement);
  const awayValue = await page.evaluate(awayValueElement => awayValueElement.textContent.trim(), awayValueElement);

  
    console.log("Home League Position:", homeLeaguePosition);
    console.log("Away League Position:", awayLeaguePosition);
    console.log("Home Form: ", homeValue);
    console.log("Away Form: ", awayValue);
  }
  
  

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Go to the URL
  await page.goto("https://www.sportybet.com/ng/");

  // Fill in phone number
  await page.type('input[name="phone"]', "9167820580");

  // Fill in password
  await page.type('input[name="psd"]', "Pastor40414243");

  // Click login button
  await page.click('button[name="logIn"]');

  let login = true;
  try {
    await page.waitForSelector("span#j_balance", { timeout: 50000 });
  } catch (error) {
    login = false;
  }

  if (!login) {
    console.log("Login failed");
    await browser.close();
    return;
  }

  // Get today's day
  const today = new Date().getDay();

  // Define time based on today's day
  let time;
  switch (today) {
    case 0:
      time = 0;
      break; // Sunday
    case 1:
      time = 1;
      break; // Monday
    case 2:
      time = 2;
      break; // Tuesday
    case 3:
      time = 3;
      break; // Wednesday
    case 4:
      time = 4;
      break; // Thursday
    case 5:
      time = 5;
      break; // Friday
    case 6:
      time = 6;
      break; // Saturday
    default:
      time = 0;
      break; // Default to Sunday
  }

  // Construct URL
  const tomorrowUrl = `https://www.sportybet.com/ng/m/sport/football?time=${time}&sort=0`;
  //   const tomorrowUrl = `https://www.sportybet.com/ng/m/sport/football?time=${time +
  //     1}&sort=0`;

  // Open tomorrow's URL
  await page.goto(tomorrowUrl);

  // Define the scroll function
  const scrollUntilElementVisible = async () => {
    await page.evaluate(() => {
      window.scrollBy(0, 100); // Scroll down by 100 pixels
    });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second for the page to settle
  };

  let count = 1;
  let links = [];
  // Keep scrolling until the element is visible
  while (count <= 3) {
    // Extract the links
    await scrollUntilElementVisible();
    links = await extractMatchInfo(page);
    console.log(links);
    count++;
    // await scrollUntilElementVisible();
    // const stopLoadMore = await page.$(".bet-load-more-none");
    // if (stopLoadMore) {
    //   // The element is visible, stop scrolling
    //   break;
    // }
  }

  // Analysis is done here
  for (let i = 0; i < links.length; i++) {
    const newPage = await browser.newPage();
    newPage.goto(links[i].link);
    //Wait for 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Click on stat
    try {
      await newPage.waitForSelector(".m-icon.m-icon-stat", { timeout: 50000 });
      await newPage.click(".m-icon.m-icon-stat");
      console.log("\n" + links[i].teams)
      await statistics(newPage);
    } catch (error) {
      console.log(error);
    }
    await newPage.close();
  }

  //   await browser.close();
})();
