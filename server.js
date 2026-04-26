const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// 🧠 history RAM
let history = [];

// 🎲 TÀI/XỈU
function getKetQua(sum) {
  return sum <= 10 ? "Xỉu" : "Tài";
}

// 🔢 NEXT PHIÊN
function nextExpect(expect) {
  return (parseInt(expect) + 1).toString();
}

// 🧠 UPDATE HISTORY
function updateHistory(result) {
  const val = result === "Tài" ? "T" : "X";

  history.push(val);

  if (history.length > 20) history.shift();
}

// 🔍 PATTERN
function getPattern() {
  return history.join("");
}

// 🌐 TEST
app.get("/", (req, res) => {
  res.send("API đang chạy 🚀");
});

// 🎯 API
app.get("/api/luck/md5", async (req, res) => {
  try {
    const response = await axios.get(
      "https://luck8bot.com/api/GetNewLottery/TaixiuMd5",
      { timeout: 5000 }
    );

    const data = response.data?.data;

    const [x1, x2, x3] = data.OpenCode.split(",").map(Number);

    const tong = x1 + x2 + x3;
    const ket_qua = getKetQua(tong);

    updateHistory(ket_qua);

    res.json({
      Phien_truoc: data.Expect,
      xuc_xac1: x1,
      xuc_xac2: x2,
      xuc_xac3: x3,
      tong: tong,
      ket_qua: ket_qua,
      Phien_hien_tai: nextExpect(data.Expect),
      pattern: getPattern(),
      OpenTime: data.OpenTime
    });

  } catch (err) {
    res.status(500).json({
      error: "Fetch lỗi",
      detail: err.message
    });
  }
});

app.listen(PORT, () => {
  console.log("Server chạy " + PORT);
});
