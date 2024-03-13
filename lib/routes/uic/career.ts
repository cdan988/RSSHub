import puppeteer from '@/utils/puppeteer';
import * as cheerio from 'cheerio';
import { parseDate } from '@/utils/parse-date';

export default async (ctx) => {
    const tag = ctx.req.param('tag');
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const rootUrl = 'https://career.uic.edu.cn/news/index/tag/' + tag;

    const browser = await puppeteer();
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (request) => {
        if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
            request.abort();
        } else {
            request.continue();
        }
    });
    await page.goto(rootUrl, {
        waitUntil: 'networkidle2',
    });
    const response = await page.content();
    await page.close();

    const $ = cheerio.load(response);

    const items = await Promise.all(
        $('ul.newsList')
            .map(async (_, item) => {
                const link = 'https://career.uic.edu.cn' + $(item).find('li > a').attr('href');
                const page = await browser.newPage();
                await page.goto(link, {
                    waitUntil: 'networkidle2',
                });
                const response = await page.content();
                await page.close();
                const $$ = cheerio.load(response);
                const description = $$('div.ct.cl').html() || '';
                return {
                    link,
                    title: $(item).find('li > a').text(),
                    description,
                    pubDate: parseDate($(item).find('li.span2.y').text(), 'YYYY-MM-DD'),
                };
            })
            .get()
    );

    await browser.close();

    ctx.set('data', {
        title: $('title').text() + $('div.breadcrumb').text(),
        link: rootUrl,
        item: items,
    });
};