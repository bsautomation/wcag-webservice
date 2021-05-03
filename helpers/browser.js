const puppeteer = require('puppeteer');
const runAction = require('../node_modules/pa11y/lib/action')

function isCurrentUserRoot() {
  return process.getuid() == 0;
}

const withBrowser = async (fn) => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--start-maximized']});
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

const noop = () => {};

const addAction = async (browser, page, opts) => {
  opts['log'] = {
    debug: noop,
    error: noop,
    info: noop
  }

  if (opts.actions.length) {
    console.log('Running actions');
    for (const action of opts.actions) {
      await runAction(browser, page, opts, action);
    }
    console.log('Finished running actions');
  }
  
  return true
}

module.exports.withBrowser = withBrowser
module.exports.withPage = withPage
module.exports.isCurrentUserRoot = isCurrentUserRoot
module.exports.addAction = addAction