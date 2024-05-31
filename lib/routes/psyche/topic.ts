import { Route } from '@/types';
import { load } from 'cheerio';
import { ofetch } from 'ofetch';
import { getData } from './utils';

export const route: Route = {
    path: '/topic/:topic',
    categories: ['new-media'],
    example: '/psyche/topic/therapeia',
    parameters: { topic: 'Topic' },
    radar: [
        {
            source: ['psyche.co/:topic'],
        },
    ],
    name: 'Topics',
    maintainers: ['emdoe'],
    handler,
    description: 'Supported categories: Therapeia, Eudaimonia, and Poiesis.',
};

async function handler(ctx) {
    const url = `https://psyche.co/${ctx.req.param('topic')}`;
    const response = await ofetch(url);
    const $ = load(response);

    const data = JSON.parse($('script#__NEXT_DATA__').text());
    const articles = data.props.pageProps.articles;
    const list = Object.keys(articles)
        .flatMap((type) =>
            articles[type].edges.map((item) => ({
                title: item.node.title,
                link: `https://psyche.co/${item.node.type.toLowerCase()}s/${item.node.slug}`,
            }))
        );

    const items = await getData(ctx, list);

    return {
        title: `Psyche | ${data.props.pageProps.section.title}`,
        link: url,
        description: data.props.pageProps.section.metaDescription,
        item: items,
    };
}
