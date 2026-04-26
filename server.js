const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// 🧠 CACHE
// ======================
let currentData = null;
let history = [];
let lastExpect = null;

// ======================
// 🎲 TÀI/XỈU
// ======================
function getKetQua(sum) {
  return sum <= 10 ? "Xỉu" : "Tài";
}

// ======================
// 🔢 NEXT PHIÊN
// ======================
function nextExpect(expect) {
  return (parseInt(expect) + 1).toString();
}

// ======================
// 🧠 UPDATE HISTORY
// ======================
function updateHistory(result) {
  const val = result === "Tài" ? "T" : "X";

  history.push(val);
  if (history.length > 50) history.shift();
}

// ======================
// 🔍 PATTERN
// ======================
function getPattern() {
  return history.join("");
}

// ======================
// 🧠 SO SÁNH PATTERN
// ======================
function similarity(a, b) {
  let match = 0;
  const len = Math.min(a.length, b.length);

  for (let i = 0; i < len; i++) {
    if (a[i] === b[i]) match++;
  }

  return (match / len) * 100;
}

// ======================
// 🤖 DỰ ĐOÁN + AI
// ======================
function analyzeAI(history) {
  if (history.length < 5) {
    return {
      du_doan: "Chưa đủ dữ liệu",
      do_tin_cay: 0,
      chi_tiet: []
    };
  }

  const current = history.join("");

  const last5 = history.slice(-5);
  const tai = last5.filter(x => x === "T").length;
  const xiu = last5.filter(x => x === "X").length;

  // basic prediction
  let du_doan = tai >= xiu ? "Tài" : "Xỉu";

  // confidence
  let do_tin_cay = Math.round((Math.max(tai, xiu) / 5) * 100);

  // detect pattern
  let best = 0;
  let matchName = "Không rõ";

  const patterns = [
    { name: "Bệt Tài", pattern: "TTTT" },
    { name: "Bệt Xỉu", pattern: "XXXX" },
    { name: "Cầu 1-1", pattern: "TXTX" }
  ];

  for (let p of patterns) {
    const score = similarity(current.slice(-p.pattern.length), p.pattern);

    if (score > best) {
      best = score;
      matchName = p.name;
    }
  }

  do_tin_cay = Math.min(95, do_tin_cay + Math.round(best / 2));

  return {
    du_doan,
    do_tin_cay,
    chi_tiet: [
      "5 phiên gần nhất",
      `Tài: ${tai}`,
      `Xỉu: ${xiu}`,
      `Pattern match: ${matchName}`
    ]
  };
}

// ======================
// 🔄 FETCH
// ======================
async function fetchData() {
  try {
    const res = await axios.get(
      "https://luck8bot.com/api/GetNewLottery/TaixiuMd5",
      { timeout: 5000 }
    );

    const data = res.data?.data;
    if (!data || !data.OpenCode) return;

    if (lastExpect && data.Expect === lastExpect) return;

    lastExpect = data.Expect;

    const [x1, x2, x3] = data.OpenCode.split(",").map(Number);
    const tong = x1 + x2 + x3;
    const ket_qua = getKetQua(tong);

    updateHistory(ket_qua);

    const ai = analyzeAI(history);

    currentData = {
      Phien_truoc: data.Expect,
      xuc_xac1: x1,
      xuc_xac2: x2,
      xuc_xac3: x3,
      tong: tong,
      ket_qua: ket_qua,
      Phien_hien_tai: nextExpect(data.Expect),

      pattern: getPattern(),

      // 🔥 AI OUTPUT
      du_doan: ai.du_doan,
      do_tin_cay: ai.do_tin_cay + "%",
      chi_tiet: ai.chi_tiet,

      OpenTime: data.OpenTime
    };

    console.log("✅ NEW:", currentData.pattern, ai.du_doan);

  } catch (err) {
    console.log("❌ Fetch lỗi:", err.message);
  }
}

// ======================
// START
// ======================
(async () => {
  await fetchData();
})();

setInterval(fetchData, 3000);

// ======================
// ROUTE
// ======================
app.get("/", (req, res) => {
  res.send("API đang chạy 🚀");
});

app.get("/api/luck/md5", (req, res) => {
  if (!currentData) {
    return res.json({ error: "Chưa có dữ liệu" });
  }

  res.json(currentData);
});

app.listen(PORT, () => {
  console.log("Server chạy tại port " + PORT);
});
