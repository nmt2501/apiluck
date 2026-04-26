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
      do_tin_cay: "0%",
      tong_quan: "Chưa đủ 5 phiên",
      chi_tiet: []
    };
  }

  const last5 = history.slice(-5);
  const last10 = history.slice(-10);
  const last20 = history.slice(-20);

  const tai5 = last5.filter(x => x === "T").length;
  const xiu5 = last5.filter(x => x === "X").length;

  const tai10 = last10.filter(x => x === "T").length;
  const xiu10 = last10.filter(x => x === "X").length;

  const tai20 = last20.filter(x => x === "T").length;
  const xiu20 = last20.filter(x => x === "X").length;

  const pattern = history.join("");

  // ======================
  // 🎯 BASE PREDICT
  // ======================
  let du_doan = tai5 >= xiu5 ? "Tài" : "Xỉu";

  // ======================
  // 📊 STABILITY (độ ổn định)
  // ======================
  const stability = Math.abs(tai10 - xiu10);

  // ======================
  // 🔥 DETECT BỆT DÀI
  // ======================
  let cau = "Bình thường";

  const lastChar = pattern.slice(-1);
  const streak = (pattern.match(new RegExp(lastChar + "+$")) || [""])[0].length;

  if (lastChar === "T" && streak >= 4) cau = "Bệt Tài";
  if (lastChar === "X" && streak >= 4) cau = "Bệt Xỉu";

  if (pattern.includes("TXTXTX")) cau = "Cầu 1-1";

  // ======================
  // 📈 TREND
  // ======================
  let trend = "Sideway";

  if (tai20 > xiu20 + 3) trend = "Up Tài";
  if (xiu20 > tai20 + 3) trend = "Up Xỉu";

  // ======================
  // ⚡ VOLATILITY (độ rung)
  // ======================
  let volatility = 0;

  for (let i = 1; i < last10.length; i++) {
    if (last10[i] !== last10[i - 1]) volatility++;
  }

  volatility = Math.round((volatility / 9) * 100);

  // ======================
  // 🎯 CONFIDENCE ENGINE
  // ======================
  let base = Math.round((Math.max(tai5, xiu5) / 5) * 100);

  let do_tin_cay = base;

  if (cau !== "Bình thường") do_tin_cay += 10;
  if (trend !== "Sideway") do_tin_cay += 5;
  if (volatility < 40) do_tin_cay += 5; // ít rung → dễ đoán hơn

  do_tin_cay = Math.min(97, do_tin_cay);

  // ======================
  // 📦 RETURN FULL
  // ======================
  return {
    du_doan,
    do_tin_cay: do_tin_cay + "%",
    tong_quan: `${cau} | ${trend}`,

    chi_tiet: [
      `5 phiên: Tài ${tai5} - Xỉu ${xiu5}`,
      `10 phiên: Tài ${tai10} - Xỉu ${xiu10}`,
      `20 phiên: Tài ${tai20} - Xỉu ${xiu20}`,
      `Cầu: ${cau}`,
      `Xu hướng: ${trend}`,
      `Độ rung: ${volatility}%`,
      `Stability: ${stability}`
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

    if (data.Expect === lastExpect) {
  console.log("⏳ chưa có phiên mới:", data.Expect);
  return;
}

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
async function loopFetch() {
  try {
    await fetchData();
  } catch (e) {}

  // 🔥 không cố định 3s nữa
  setTimeout(loopFetch, 1200);
}

(async () => {
  await fetchData();   // load ngay
  loopFetch();         // chạy realtime
})();

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
