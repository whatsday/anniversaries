const https = require('https');
const fs = require('fs');
const cheerio = require('cheerio');
const config = require('./config');

const updateHolidays = (month, day, html) => {
  let result = [];
  let $ = cheerio.load(html);

  let $targetElement;
  const $targetElements = [
    $('#节假日和习俗'), // e.g. 1月1日
    $('#节假日'), // e.g. 1月3日
    $('#節假日和習俗'), // e.g. 1月4日
    $('#節日'), // e.g. 2月1日
    $('#节日'), // e.g. 2月8日
    $('#节日、风俗习惯') // e.g. 2月10日
    // $('#節日、風俗習慣'),
    // $('#節日、風俗習惯')
  ];
  for (let i = 0, len = $targetElements.length; i < len; i++) {
    if ($targetElements[i].length) {
      $targetElement = $targetElements[i];
      break;
    }
  }

  if ($targetElement) {
    let $parent = $targetElement.parent();

    let $children = $parent.next();

    let $items = [];
    switch ($children[0].name) {
      case 'ul': // 默认
        $items = $children.find('li');
        break;
      case 'table': // e.g. 1月5日
        $children = $children.next();
        if ($children[0] && $children[0].name === 'ul') {
          $items = $children.find('li');
        }
        break;
      case 'p': // e.g. 1月21日
        $items = $children;
        break;
    }

    // 过滤无意义的死数据
    $items = $items.filter((index, element) => {
      let content = $(element).text();
      return !!content.trim() && !/除夕/.test(content);
    });

    console.log(`${month}月${day}日`, $items.length);

    if ($items.length) {
      $items.each((index, element) => {
        let content = $(element)
          .text()
          .trim();
        let colonIndex = content.indexOf('：'); // 取第一个冒号

        let data = {};
        if (colonIndex > 0) {
          let content1 = content.slice(0, colonIndex);
          let content2 = content.slice(colonIndex + 1);
          let key = /耶稣|教/.test(content1) ? 'religion' : 'country';
          data[key] = content1;
          if (/\n/.test(content2)) {
            content2 = content2.replace(/^\n/, '');
            data.event = content2.split('\n');
          } else {
            data.event = content2.replace(/\[\d+\]/g, '');
          }
        } else {
          data.event = content.replace(/\[\d+\]/g, '').replace(/\n/, '');
        }

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

const isDev = true;

if (!isDev) {
  config.date.forEach(({ month, day }) => {
    for (let i = 1; i <= day; i++) {
      getHolidays(month, i, `https://zh.wikipedia.org/wiki/${month}月${i}日`);
    }
  });
} else {
  const TEST_MONTH = 2;
  const TEST_DAY = 28;

  getHolidays(
    TEST_MONTH,
    TEST_DAY,
    `https://zh.wikipedia.org/wiki/${TEST_MONTH}月${TEST_DAY}日`
  );
}
