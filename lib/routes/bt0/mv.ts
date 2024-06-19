import { Route } from '@/types';
import { load } from 'cheerio';
import puppeteer from '@/utils/puppeteer';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/mv/:number/:domain?',
    categories: ['multimedia'],
    example: '/mv/35575567',
    parameters: { domain: '1-9,默认 2', number: '影视详情页' },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['www.2bt0.com/mv/:number'],
            target: '/mv/:number',
        },
    ],
    name: '影视详情',
    maintainers: ['miemieYaho'],
    description: '描述',
    handler,
};

async function handler(ctx) {
    const domain = ctx.req.param('domain') ?? '2';
    const number = ctx.req.param('number');
    const ic = ctx.req.query('ic');

    const host = `https://www.${domain}bt0.com`;
    const _link = host + `/mv/${number}.html`;

    const browser = await puppeteer();
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (request) => {
        request.resourceType() === 'document' ? request.continue() : request.abort();
    });
    await page.goto(_link, {
        waitUntil: 'domcontentloaded',
    });
    const response = await page.content();
    page.close();
    const $ = load(response);
    const name = $('span.info-title.lh32').text();
    const items = $('div.container .container .col-md-10.tex_l')
        .toArray()
        .map((item) => {
            item = $(item);
            const _title = item.find('.torrent-title').first().text();
            if (ic && !_title.includes(ic)) {
                return;
            }
            return {
                title: _title,
                guid: _title,
                link: host + item.find('.torrent-title').first().attr('href'),
                pubDate: parseDate(item.find('.tag-sm.tag-download.text-center').eq(1).text()),
                enclosure_type: 'application/x-bittorrent',
                enclosure_url: item.find('.col-md-3 a').first().attr('href'),
                enclosure_length: 1,
            };
        })
        .filter((item) => item !== undefined);
    browser.close();
    return {
        title: name,
        description: name,
        link: _link,
        item: items,
    };
}
