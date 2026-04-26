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
      tong_quan: "Chưa đủ 5 phiên",
      chi_tiet: []
    };
  }

  const last10 = history.slice(-10);
  const last5 = history.slice(-5);

  const tai5 = last5.filter(x => x === "T").length;
  const xiu5 = last5.filter(x => x === "X").length;

  const tai10 = last10.filter(x => x === "T").length;
  const xiu10 = last10.filter(x => x === "X").length;

  const currentPattern = history.join("");

  // ======================
  // 🎯 DỰ ĐOÁN CHÍNH
  // ======================
  let du_doan = tai5 >= xiu5 ? "Tài" : "Xỉu";

  // ======================
  // 📊 CONFIDENCE BASE
  // ======================
  let base = Math.round((Math.max(tai5, xiu5) / 5) * 100);

  // ======================
  // 🔥 PHÂN TÍCH CẦU
  // ======================
  let cau = "Bình thường";

  if (currentPattern.endsWith("TTTT") || tai10 >= 8) cau = "Bệt Tài";
  if (currentPattern.endsWith("XXXX") || xiu10 >= 8) cau = "Bệt Xỉu";

  if (currentPattern.includes("TXTXTX")) cau = "Cầu 1-1";

  // ======================
  // 📈 TREND ANALYSIS
  // ======================
  let trend = "Ổn định";

  if (tai10 > xiu10 + 2) trend = "Thiên Tài";
  if (xiu10 > tai10 + 2) trend = "Thiên Xỉu";

  // ======================
  // 🔥 ĐỘ TIN CẬY CUỐI
  // ======================
  let do_tin_cay = base;

  if (cau !== "Bình thường") do_tin_cay += 10;
  if (trend !== "Ổn định") do_tin_cay += 5;

  do_tin_cay = Math.min(95, do_tin_cay);

  return {
    du_doan,
    do_tin_cay: do_tin_cay + "%",
    tong_quan: `${cau} | ${trend}`,

    chi_tiet: [
      `5 phiên gần nhất: Tài ${tai5} - Xỉu ${xiu5}`,
      `10 phiên gần nhất: Tài ${tai10} - Xỉu ${xiu10}`,
      `Cầu hiện tại: ${cau}`,
      `Xu hướng: ${trend}`
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
async function loop() {
  await fetchData();
  setTimeout(loop, 1500); // nhanh hơn interval + ổn định hơn
}

(async () => {
  await fetchData();
  loop();
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
