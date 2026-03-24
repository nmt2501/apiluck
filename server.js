
const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/api/luck", async (req, res) => {
    try {
        const response = await axios.get("http://36.50.55.230:4784/luck8");

        const data = response.data;

        const result = {
            phien_hien_tai: data.next_session,
            du_doan: data.prediction,
            do_tin_cay: data.reason
        };

        res.json(result);
    } catch (err) {
        res.status(500).json({
            status: "error",
            message: "Không lấy được API"
        });
    }
});

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
