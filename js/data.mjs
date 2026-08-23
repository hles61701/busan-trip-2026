const place = (name, nameKo, address) => ({ name, nameKo, address });
const item = (title, subtitle, location) => ({
  title,
  subtitle,
  place: location,
  reservationStatus: "尚未訂位",
});

export const stay = place(
  "Gwangan KCC Switzen Harbor View",
  "광안 KCC 스위첸 하버뷰",
  "부산 수영구 민락수변로 49",
);

export const tripDays = [
  {
    date: "8/30", weekday: "日", kicker: "抵達釜山", title: "先把海風住進來",
    pace: "抵達日・慢慢來", weather: "若下雨，入住後直接吃晚餐，把海邊散步移到 9/4。",
    photo: "晚餐後走到廣安里，拍一張橋燈映在濕沙上的第一晚。",
    events: [
      { time: "13:30", title: "飛往釜山", subtitle: "機上休息，先不要排事。" },
      { time: "17:05", title: "抵達金海機場", subtitle: "接送前往住宿，預留入境與行李時間。", place: place("金海國際機場", "김해국제공항", "부산 강서구 공항진입로 108") },
      { time: "18:30", title: "入住廣安里", subtitle: "放行李、換輕便衣服，讓旅程真的開始。", place: stay },
      { time: "21:00", title: "廣安里沙灘散步", subtitle: "不追景點，只看夜橋與海。", place: place("廣安里海水浴場", "광안리해수욕장", "부산 수영구 광안해변로 219") },
    ],
    lunchTime: "12:00", dinnerTime: "19:30",
    lunch: [{ title: "自理", subtitle: "機場或登機前吃飽。" }],
    dinner: [
      item("Tonshou 炸豬排", "抵達仍有精神就去；尖峰可能候位。", place("Tonshou 廣安店", "톤쇼우 광안점", "부산 수영구 광안해변로279번길 13")),
      item("PURADAK 炸雞", "累了就外帶回住宿，最舒服的第一晚。", place("PURADAK 民樂店", "푸라닭 부산민락점", "부산 수영구 광안해변로 446 상가건물 4호")),
    ],
  },
  {
    date: "8/31", weekday: "一", kicker: "松島・南浦", title: "山城、老市場與海上夕光",
    pace: "步行偏多・午後留白", weather: "大雨時取消龍宮雲橋，改逛樂天百貨光復店與南浦地下街。",
    photo: "甘川上午光線柔；纜車靠窗座在夕陽前最有層次。",
    events: [
      { time: "09:30", title: "甘川文化村", subtitle: "先走主稜線與小王子區，巷弄不要貪多。", place: place("甘川文化村", "감천문화마을", "부산 사하구 감내2로 203") },
      { time: "12:50", title: "BIFF 廣場糖餅", subtitle: "午餐後順路當甜點。", place: place("BIFF 廣場", "BIFF광장", "부산 중구 비프광장로 20") },
      { time: "14:00", title: "富平罐頭市場", subtitle: "邊走邊吃，留一點胃口給晚餐。", place: place("富平罐頭市場", "부평깡통시장", "부산 중구 부평1길 48") },
      { time: "16:00", title: "松島海上纜車", subtitle: "搭到岩南公園，海面色溫開始變柔。", passGroup: "B", place: place("松島海上纜車", "송도해상케이블카", "부산 서구 송도해변로 171") },
      { time: "17:10", title: "龍宮雲橋", subtitle: "視風勢與體力決定是否走完全程。", ticketLabel: "現場購票", place: place("松島龍宮雲橋", "송도용궁구름다리", "부산 서구 암남동 620-53") },
    ],
    lunchTime: "11:30", dinnerTime: "19:00",
    lunch: [item("札嘎其魚市場 100／101 號", "約 11:30 入座，避開太晚才吃導致下午拖延。", place("札嘎其市場", "자갈치시장", "부산 중구 자갈치해안로 52"))],
    dinner: [item("味贊王鹽烤肉 富平店", "市場散步後吃烤肉，結束直接回廣安里。", place("味贊王 富平店", "맛찬들왕소금구이 부평점", "부산 중구 광복로 3"))],
  },
  {
    date: "9/1", weekday: "二", kicker: "海雲台", title: "把海岸線交給列車",
    pace: "預約日・節奏清楚", weather: "膠囊列車通常照常行駛；風雨太大則改新世界百貨＋Spa Land。",
    photo: "膠囊列車選面海側；青沙浦紅白燈塔留到車後慢拍。",
    events: [
      { time: "08:20", title: "自然島鹽麵包", subtitle: "早點抵達，買完沿海邊走向尾浦站。", place: place("自然島鹽麵包", "자연도소금빵 해운대점", "부산 해운대구 구남로24번길 11") },
      { time: "09:30", endTime: "10:00", fixed: true, title: "天空膠囊列車", subtitle: "尾浦出發・第 3 場入場，時間依已購票券固定。", ticketLabel: "已購票・固定時間", place: place("藍線公園尾浦站", "해운대블루라인파크 미포정거장", "부산 해운대구 달맞이길62번길 13") },
      { time: "10:20", title: "DIART Coffee", subtitle: "蜂蜜奶油麵包與咖啡，坐下休息。", place: place("DIART Coffee", "디아트커피", "부산 해운대구 청사포로128번길 12") },
      { time: "13:20", title: "海岸列車回程", subtitle: "青沙浦 → 尾浦，沿途看海。", passGroup: "B", place: place("青沙浦站", "청사포정거장", "부산 해운대구 청사포로 116") },
      { time: "15:00", title: "海理團路", subtitle: "小店散步，不設採買目標。", place: place("海理團路", "해리단길", "부산 해운대구 우동1로 38") },
      { time: "17:00", title: "新世界百貨", subtitle: "室內休息與補貨，依體力提早回住宿。", place: place("新世界 Centum City", "신세계백화점 센텀시티점", "부산 해운대구 센텀남대로 35") },
    ],
    lunchTime: "14:00", dinnerTime: "19:30",
    lunch: [
      item("海雲台五福豬肉湯飯", "位在龜南路主線，吃完往海雲台站與海理團路最直覺。", place("海雲台五福豬肉湯飯", "해운대 오복돼지국밥", "부산 해운대구 구남로 15 1층")),
      item("엄용백 豬肉湯飯・海雲台店", "旁邊巷內仍算順路；熱門時段可能候位，行程多留一點彈性。", place("엄용백 豬肉湯飯・海雲台店", "엄용백 돼지국밥 해운대점", "부산 해운대구 구남로24번길 39 1층")),
      item("水邊最高豬肉湯飯 海雲臺店", "位在龜南路靠近傳統市場，與海雲台站、海理團路同區；熱門時段可能候位。", place("水邊最高豬肉湯飯 海雲臺店", "수변최고돼지국밥 해운대점", "부산 해운대구 구남로 39")),
    ],
    dinner: [
      item("83 獬豸 廣安里店", "厚切豬肉，熱門時段可能候位。", place("83 獬豸 廣安里店", "83해치 광안리점", "부산 수영구 민락본동로19번길 59 1층")),
      item("烤肉的男子 廣安里店", "專人代烤，想吃豬五花可以選這間。", place("烤肉的男子 廣安里店", "고기굽는남자 광안리점", "부산 수영구 광남로 44 1층")),
      item("彥陽烤肉・釜山家", "傳統韓牛烤肉，適合想吃牛肉的晚上。", place("彥陽烤肉・釜山家", "광안리 언양불고기 부산집", "부산 수영구 남천바다로 32")),
      item("尾浦家 廣安里店", "海鮮醬與鍋飯，口味和烤肉選項不同。", place("尾浦家 廣安里店", "미포집 광안리점", "부산 수영구 광안해변로 153-1 2층")),
    ],
  },
  {
    date: "9/2", weekday: "三", kicker: "影島・西面", title: "海崖村落轉進城市夜色",
    pace: "上午慢走・下午逛街", weather: "雨勢明顯時縮短白淺灘，改去 Arte Museum Busan，再前往西面。",
    weatherBackup: {
      title: "Arte Museum Busan",
      subtitle: "全室內光影展，建議停留約 1.5 小時；若前面的 B 組景點未使用，可改為 Big3・B 組替補。",
      ticketLabel: "雨天備案・另外購票",
      place: place("Arte Museum Busan", "아르떼뮤지엄 부산", "부산 영도구 해양로247번길 29"),
    },
    photo: "白淺灘的白牆藍海適合上午；荒嶺山在藍調時刻拍城市燈海。",
    events: [
      { time: "09:30", title: "白淺灘文化村", subtitle: "沿上層步道慢走，下坡後不要勉強折返。", place: place("白淺灘文化村", "흰여울문화마을", "부산 영도구 절영로 194") },
      { time: "11:00", title: "海邊咖啡休息", subtitle: "把它當真正的停留，不只是打卡。", place: place("白淺灘隧道", "흰여울해안터널", "부산 영도구 영선동4가 1210-38") },
      { time: "14:30", title: "西面市區", subtitle: "SPAO、MUSINSA 與地下街集中處理。", place: place("西面站", "서면역", "부산 부산진구 중앙대로 730") },
      { time: "16:30", title: "田浦咖啡街", subtitle: "選一間順眼的店坐下，不需要連跑。", place: place("田浦咖啡街", "전포카페거리", "부산 부산진구 전포대로209번길 26") },
      { time: "20:00", title: "荒嶺山夜景", subtitle: "天氣清楚再上山；雲厚就留在西面。", place: place("荒嶺山烽燧台", "황령산 봉수대", "부산 연제구 황령산로 391-39") },
    ],
    lunchTime: "12:00", dinnerTime: "18:30",
    lunch: [item("大海鮑魚粥・釜山站直營店", "約 12:00 入座，吃完再往西面移動。", place("大海鮑魚粥・釜山站直營店", "바다마루전복죽 부산역 직영점", "부산 동구 중앙대로226번길 3-7 1층"))],
    dinner: [item("Old Mansion 西面田浦店", "燒肉後再決定是否上荒嶺山。", place("Old Mansion 田浦店", "올드맨션 전포점", "부산 부산진구 전포대로209번길 39"))],
  },
  {
    date: "9/3", weekday: "四", kicker: "機張", title: "速度感之後，整個人慢下來",
    pace: "遠程日・中間要休息", weather: "斜坡滑車因雨停駛時，直接改 Outlet＋Spa Land，不硬等。",
    photo: "滑車段用廣角拍速度；汗蒸幕則留一張乾淨的休息感照片。",
    events: [
      { time: "10:00", title: "Skyline Luge", subtitle: "上午較不曬，玩 2–3 趟就收。", ticketLabel: "另外購票", place: place("Skyline Luge Busan", "스카이라인루지 부산", "부산 기장군 기장읍 기장해안로 205") },
      { time: "13:30", title: "樂天東釜山 Outlet", subtitle: "吃飽再逛，設定離場時間。", place: place("樂天 Premium Outlet 東釜山", "롯데프리미엄아울렛 동부산점", "부산 기장군 기장읍 기장해안로 147") },
      { time: "17:00", title: "Spa Land", subtitle: "回程進 Centum，至少留 2.5 小時放鬆。", passGroup: "A", place: place("Spa Land Centum City", "스파랜드 센텀시티", "부산 해운대구 센텀남대로 35") },
    ],
    lunchTime: "12:30", dinnerTime: "20:00",
    lunch: [item("Outlet 內自由選", "12:30 左右先吃，避免逛到忘記時間。", place("樂天東釜山餐飲區", "롯데프리미엄아울렛 동부산점", "부산 기장군 기장읍 기장해안로 147"))],
    dinner: [
      item("PURADAK 炸雞 民樂店", "Spa Land 後累了，外帶回住宿最省力。", place("PURADAK 民樂店", "푸라닭 부산민락점", "부산 수영구 광안해변로 446 상가건물 4호")),
      item("烤肉的男子 廣安里店", "仍有體力就坐下來吃專人代烤。", place("烤肉的男子 廣安里店", "고기굽는남자 광안리점", "부산 수영구 광남로 44 1층")),
    ],
  },
  {
    date: "9/4", weekday: "五", kicker: "廣安里", title: "最後一天留給生活感",
    pace: "留白日・不跨區", weather: "下雨就把海灘改為 Millac the Market，採買行程照走。",
    photo: "傍晚從民樂水邊往廣安大橋拍，留一張大家自然聊天的合照。",
    events: [
      { time: "10:30", title: "醫美預約", subtitle: "前後避免曝曬，實際時間依預約調整。" },
      { time: "13:30", title: "樂天超市補貨", subtitle: "只買清單上的伴手禮，預留整理行李空間。", place: place("樂天超市 光復店", "롯데마트 광복점", "부산 중구 중앙대로 2") },
      { time: "17:00", title: "Millac the Market", subtitle: "看海、喝飲料，等光線慢慢變藍。", place: place("Millac the Market", "밀락더마켓", "부산 수영구 민락수변로17번길 56") },
      { time: "19:30", title: "廣安里最後散步", subtitle: "不排下一站，好好收尾。", place: place("廣安里海水浴場", "광안리해수욕장", "부산 수영구 광안해변로 219") },
    ],
    lunchTime: "12:30", dinnerTime: "18:30",
    lunch: [item("廣安里自由選", "醫美結束後就近吃，避免空腹逛超市。", stay)],
    dinner: [
      item("烤肉的男子 廣安里店", "專人代烤豬肉，適合正式吃一頓晚餐。", place("烤肉的男子 廣安里店", "고기굽는남자 광안리점", "부산 수영구 광남로 44 1층")),
      item("彥陽烤肉・釜山家", "傳統韓牛烤肉，想吃牛肉選這間。", place("彥陽烤肉・釜山家", "광안리 언양불고기 부산집", "부산 수영구 남천바다로 32")),
      item("尾浦家 廣安里店", "海鮮醬與鍋飯，適合不想再吃烤肉。", place("尾浦家 廣安里店", "미포집 광안리점", "부산 수영구 광안해변로 153-1 2층")),
      item("All Sunday 廣安店", "貝果與咖啡，適合想輕鬆收尾。", place("All Sunday 廣安店", "올선데이 광안점", "부산 수영구 광안로61번길 28 1층")),
    ],
  },
  {
    date: "9/5", weekday: "六", kicker: "回程", title: "帶著海的顏色回家",
    pace: "早班機・不加行程", weather: "雨天不影響，提早 15 分鐘出發即可。",
    photo: "機場窗邊拍最後一張，旅程到這裡就好。",
    events: [
      { time: "06:45", title: "四人共同搭包車", travelers: 4, subtitle: "以 10:00 的班機為基準，一台車從住宿出發。", place: stay },
      { time: "07:30", title: "抵達金海機場", travelers: 4, subtitle: "一起辦理報到，再依航班分組。", place: place("金海國際機場", "김해국제공항", "부산 강서구 공항진입로 108") },
      { time: "10:00", title: "第一組起飛", travelers: 2, subtitle: "2 人搭乘第一班回程航班。" },
      { time: "10:30", title: "第二組起飛", travelers: 2, subtitle: "另外 2 人搭乘第二班回程航班。" },
    ],
    lunch: [], dinner: [],
  },
];
