var region = "tianjin-6/beichen";

const loondq = $persistentStore.read("天津-北辰");

if (loondq !== undefined) {
  region = loondq;
}

const query_addr = `http://m.qiyoujiage.com/${region}.shtml`;

$httpClient.get(
  {
    url: query_addr,
    headers: {
      referer: "http://m.qiyoujiage.com/",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
    },
  },
  (error, response, data) => {
    if (error) {
      console.log(`解析油价信息失败, URL=${query_addr}`);
      done({});
    } else {
      const reg_price =
        /<dl>[\s\S]+?<dt>(.*油)<\/dt>[\s\S]+?<dd>(.*)\(元\)<\/dd>/gm;

      var prices = [];
      var m = null;

      while ((m = reg_price.exec(data)) !== null) {
        if (m.index === reg_price.lastIndex) {
          reg_price.lastIndex++;
        }

        prices.push({
          name: m[1],
          value: `${m[2]} 元/L`,
        });
      }

      // 解析油价调整趋势
      var adjust_date = "";
      var adjust_trend = "";
      var adjust_value = "";

      const reg_adjust_tips =
        /<div class="tishi"> <span>(.*)<\/span><br\/>([\s\S]+?)<br\/>/;
      const adjust_tips_match = data.match(reg_adjust_tips);

      if (adjust_tips_match && adjust_tips_match.length === 3) {
        adjust_date = adjust_tips_match[1].split("价")[1].slice(0, -2);

        adjust_value = adjust_tips_match[2];
        adjust_trend =
          adjust_value.indexOf("下调") > -1 || adjust_value.indexOf("下跌") > -1
            ? "↓"
            : "↑";

        const adjust_value_re = /([\d\.]+)元\/升-([\d\.]+)元\/升/;
        const adjust_value_re2 = /[\d\.]+元\/吨/;
        const adjust_value_match = adjust_value.match(adjust_value_re);

        if (adjust_value_match && adjust_value_match.length === 3) {
          adjust_value = `${adjust_value_match[1]}-${adjust_value_match[2]}元/L`;
        } else {
          const adjust_value_match2 = adjust_value.match(adjust_value_re2);

          if (adjust_value_match2) {
            adjust_value = adjust_value_match2[0];
          }
        }
      }

      const friendly_tips = `下次${adjust_date}调整 ${adjust_trend} ${adjust_value}`;

      // 仅获取92号汽油价格
      const oil_92 = prices.find((oil) => oil.name.includes("92"));

      if (!oil_92) {
        console.log(
          `解析油价信息失败, 92号汽油价格未找到, URL=${query_addr}`
        );
        done();
      } else {
        $done(
          $notification.post(
            "天津市北辰区津保加油站 92号汽油价格",
            `${friendly_tips}`,
            `${oil_92.name}  ${oil_92.value}`,
            "https://google.com"
          )
        );
      }
    }
  }
);
