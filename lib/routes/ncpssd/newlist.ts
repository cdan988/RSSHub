import cache from '@/utils/cache';
import got from '@/utils/got';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import { URL } from 'url';

export const route: Route = {
    path: '/newlist',
    categories: ['government'],
    example: '/ncpssd/newlist',
    parameters: {},
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: {
        source: ['ncpssd.cn/', 'ncpssd.cn/newlist?type=0'],
    },
    name: '国家哲学社会科学文献中心最新文献',
    maintainers: ['LyleLee'],
    handler,
    url: 'ncpssd.cn/',
};

async function handler() {
    const baseUrl = 'https://www.ncpssd.cn';
    const argument = '/newlist?type=0';

    const response = await got({
        method: 'get',
        url: baseUrl + argument,
    });

    const data = response.data;
    const $ = load(data);
    const items = $('.news-list > li');

    const list = items.map((index, p) => {
        const title = $(p)
            .find('a')
            .text()
            .replaceAll(/(\r\n|\n|\r)/gm, '')
            .trim();
        const articleUrl =
            baseUrl +
            $(p)
                .find('a')
                .attr('onclick')
                ?.match(/\('(.*?)'\)/)[1];
        const parseUrl = new URL(articleUrl);

        return {
            title,
            link: baseUrl + articleUrl,
            lngid: parseUrl.searchParams.get('id'),
            type: parseUrl.searchParams.get('typename'),
            pageType: parseUrl.searchParams.get('nav'),
        };
    });

    const paper = await Promise.all(
        list.map((index, item) =>
            cache.tryGet(item.link, async () => {
                const url = 'https://www.ncpssd.cn/articleinfoHandler/getjournalarticletable'; // Adjust the URL accordingly
                const headers = {
                    Accept: 'application/json, text/javascript, */*; q=0.01',
                    'Content-Type': 'application/json; charset=UTF-8',
                    Cookie: 'Your-Cookie-Here', // Replace with your actual cookie value
                    // Add other headers as needed
                };

                const requestBody = {
                    lngid: item.lngid,
                    type: item.type,
                    pageType: item.pageType,
                };

                const response = await got.post(url, {
                    headers,
                    json: requestBody,
                    responseType: 'json', // Set the expected response type
                });

                return {
                    title: item.title,
                    link: item.link,
                    author: response.body.data.showwriter,
                    description: response.body.data.remarkc,
                    pubDate: parseDate(response.body.data.publishDateTimee),
                };
            })
        )
    );

    return {
        // 源标题
        title: `国家哲学社会科学文献中心`,
        // 源链接
        link: String(baseUrl),
        // 源文章
        item: paper,
    };
}
