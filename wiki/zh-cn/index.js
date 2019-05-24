const https = require('https');
const fs = require('fs');
const cheerio = require('cheerio');
const config = require('./config');

const updateHolidays = (month, day, html) => {
  let result = [];
  let $ = cheerio.load(html);

  let $targetElement;
  const $targetElements = [
    $('#节日、风俗习惯'),
    $('#节假日和习俗'),
    $('#節日、風俗習慣'),
    $('#節日、風俗習惯')
  ];
  for (let i = 0, len = $targetElements.length; i < len; i++) {
    if ($targetElements[i].length) {
      $targetElement = $targetElements[i];
      break;
    }
  }

  if ($targetElement) {
    let $items = $targetElement
      .parent()
      .next()
      .find('li');

    console.log(month, day, $items.length);

    if ($items.length) {
      $items.each((index, element) => {
        let item = $(element)
          .text()
          .split('：');

        let data =
          item.length === 2
            ? {
                country: item[0],
                event: item[1].replace(/\[\d+\]/g, '')
              }
            : {
                event: item[0].replace(/\[\d+\]/g, '')
              };

        result.push(data);
      });

      const destFolder = `${__dirname}/${month}`;

      try {
        fs.mkdirSync(destFolder, { recursive: true });
      } catch (e) {
        console.log('Cannot create folder ', e);
      }

      fs.writeFile(`${destFolder}/${day}.json`, JSON.stringify(result), err => {
        if (err) {
          console.error(err);
          return;
        }
        console.log(`${day}.json has been created`);
      });
    }
  }
};

const getHolidays = (month, day, pageUrl) => {
  console.log(pageUrl);
  https
    .get(
      pageUrl,
      {
        headers: {
          'accept-language': 'zh-cn,zh;q=0.5'
          // Accept-Language表示浏览器所支持的语言类型；
          // zh-cn表示简体中文；zh 表示中文；
          // q是权重系数，范围 0 =< q <= 1，q 值越大，请求越倾向于获得其“;”之前的类型表示的内容，若没有指定 q 值，则默认为1，若被赋值为0，则用于提醒服务器哪些是浏览器不接受的内容类型。
        }
      },
      res => {
        const statusCode = res.statusCode;

        if (statusCode === 200) {
          res.setEncoding('utf8');
          let rawData = '';
          res.on('data', chunk => (rawData += chunk));
          res.on('end', () => {
            updateHolidays(month, day, rawData);
          });
        }
      }
    )
    .on('error', e => {
      console.log(`Got error: ${e.message}`);
    });
};

config.date.forEach(({ month, day }) => {
  let i = 5;
  // for (let i = 1; i <= day; i++) {
  getHolidays(month, i, `https://zh.wikipedia.org/wiki/${month}月${i}日`);
  // }
});
