const puppeteer = require('puppeteer');
function isCurrentUserRoot() {
  return process.getuid() == 0;
}
const withBrowser = async (fn) => {
  const browser = await puppeteer.launch({ headless: true, args: isCurrentUserRoot() ? ['--no-sandbox', '--start-maximized'] : ['--start-maximized'] });
  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
}
const withPage = (browser) => async (fn) => {
  const page = await browser.newPage();
  try {
    return await fn(page);
  } finally {
    await page.close();
  }
}

module.exports.withBrowser = withBrowser
module.exports.withPage = withPage
module.exports.isCurrentUserRoot = isCurrentUserRoot