const {withBrowser, withPage} = require('../../helpers/browser');
const axe = require('axe-core');
const NAVIGATION_TIMEOUT = 30000;

const runTest = async (task) => {
  let axeResults;
  const results = await withBrowser(async (browser) => {
    return withPage(browser)(async (page) => {
      await page.setDefaultNavigationTimeout(task.timeout ? task.timeout : NAVIGATION_TIMEOUT);
      await page.setViewport({ width: 1366, height: 768});
      await page.goto(task.url);
      let title = await page.title();
      await page.addScriptTag({
        path: require.resolve('axe-core')
      });
      axeResults = await page.evaluate(async () => {
        return await axe.run(
                      {
                        runOnly: {
                          type: 'tag',
                          values: ['wcag2a', 'wcag2aa', 'best-practice']
                        }
                      });
      });
      return axeResults.violations;
    })
  });
  return results;
}

module.exports.runTest = runTest