import Utils from '@ovvio/base/lib/utils';
import * as Stamp from './orderstamp';

let startTime = new Date().getTime();
const timeOffset = 1000 * 60 * 60; // 1 hr
const data = [];
for (let i = 0; i < 10; ++i) {
  const d = new Date(startTime);
  startTime -= timeOffset;
  const k = Utils.uniqueId();
  const os = Stamp.fromTimestamp(Utils.serializeDate(d), k);
  data.push({
    idx: i,
    date: d,
    key: k,
    os: os,
  });
}

function comparator(x, y) {
  if (x.os > y.os) {
    return -1;
  } else if (x.os < y.os) {
    return 1;
  } else {
    return 0;
  }
}

data.sort(comparator);

for (let i = 0; i < data.length; ++i) {
  Utils.assert(data[i].idx === i);
}

data[2].os = Stamp.between(Stamp.present(), data[0].os);

data[4].os = Stamp.between(data[7].os, data[8].os);

data[1].os = Stamp.between(data[9].os, Stamp.past());

data.sort(comparator);

data[1].os = Stamp.between(Stamp.present(), data[0].os);
data.sort(comparator);

console.log(Utils.prettyJSON(data));
